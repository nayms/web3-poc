// SPDX-License-Identifier: Apache 2
pragma solidity ^0.8.24;

import { IWormhole } from "./IWormhole.sol";
import { BytesLib } from "./BytesLib.sol";

struct CrossChainMessage {
    // unique identifier for this message type
    uint8 payloadID;
    // arbitrary message string
    string message;
}

/**
 * @title A Cross-Chain messaging contract
 * @notice This contract uses Wormhole's generic-messaging to send an arbitrary
 * CrossChainMessage to registered emitters on foreign blockchains
 */
contract Main {
    using BytesLib for bytes;

    // owner of this contract
    address public owner;

    // address of the Wormhole contract on this chain
    IWormhole public wormhole;

    // Wormhole chain ID of this contract
    uint16 public chainId;

    /**
    * The number of block confirmations needed before the wormhole network
    * will attest a message.
    */
    uint8 public wormholeFinality;

    /**
    * Wormhole chain ID to known emitter address mapping. xDapps using
    * Wormhole should register all deployed contracts on each chain to
    * verify that messages being consumed are from trusted contracts.
    */
    mapping(uint16 => bytes32) public registeredEmitters;

    // verified message hash to received message mapping
    mapping(bytes32 => string) public receivedMessages;

    // list of received message hashes
    bytes32[] public receivedMessageHashes;

    /**
     * @notice Deploys the smart contract and sanity checks initial deployment values
     * @dev Sets the owner, wormhole, chainId and wormholeFinality state variables.
     * See HelloWorldState.sol for descriptions of each state variable.
     */
    constructor(address wormhole_, uint16 chainId_, uint8 wormholeFinality_) {
        // sanity check input values
        require(wormhole_ != address(0), "invalid Wormhole address");
        require(chainId_ > 0, "invalid chainId");
        require(wormholeFinality_ > 0, "invalid wormholeFinality");

        // set constructor state values
        owner = msg.sender;
        wormhole = IWormhole(wormhole_);
        chainId = chainId_;
        wormholeFinality = wormholeFinality_;
    }

    function getNumberOfReceivedMessages() public view returns (uint256) {
        return receivedMessageHashes.length;
    }

    /**
     * @notice Creates an arbitrary HelloWorld message to be attested by the
     * Wormhole guardians.
     * @dev batchID is set to 0 to opt out of batching in future Wormhole versions.
     * Reverts if:
     * - caller doesn't pass enough value to pay the Wormhole network fee
     * - `message` length is >= max(uint16)
     * @param message Arbitrary string
     * @return messageSequence Wormhole message sequence for this contract
     */
    function sendMessage(
        string memory message
    ) public payable returns (uint64 messageSequence) {
        // enforce a max size for the arbitrary message
        require(
            abi.encodePacked(message).length < type(uint16).max,
            "message too large"
        );

        // cache Wormhole instance and fees to save on gas
        uint256 wormholeFee = wormhole.messageFee();

        // Confirm that the caller has sent enough value to pay for the Wormhole
        // message fee.
        require(msg.value == wormholeFee, "insufficient value");

        // create the CrossChainMessage struct
        CrossChainMessage memory parsedMessage = CrossChainMessage({
            payloadID: uint8(1),
            message: message
        });

        // encode the CrossChainMessage struct into bytes
        bytes memory encodedMessage = encodeMessage(parsedMessage);

        // Send the HelloWorld message by calling publishMessage on the
        // Wormhole core contract and paying the Wormhole protocol fee.
        messageSequence = wormhole.publishMessage{value: wormholeFee}(
            0, // batchID
            encodedMessage,
            wormholeFinality
        );
    }

    /**
     * @notice Consumes arbitrary Message messages sent by registered emitters
     * @dev The arbitrary message is verified by the Wormhole core endpoint
     * `verifyVM`.
     * Reverts if:
     * - `encodedMessage` is not attested by the Wormhole network
     * - `encodedMessage` was sent by an unregistered emitter
     * - `encodedMessage` was consumed already
     * @param encodedMessage verified Wormhole message containing arbitrary
     * CrossChainMessage message.
     */
    function receiveMessage(bytes memory encodedMessage) public {
        // call the Wormhole core contract to parse and verify the encodedMessage
        (
            IWormhole.VM memory wormholeMessage,
            bool valid,
            string memory reason
        ) = wormhole.parseAndVerifyVM(encodedMessage);

        // confirm that the Wormhole core contract verified the message
        require(valid, reason);

        // verify that this message was emitted by a registered emitter
        require(verifyEmitter(wormholeMessage), "unknown emitter");

        // decode the message payload into the CrossChainMessage struct
        CrossChainMessage memory parsedMessage = decodeMessage(
            wormholeMessage.payload
        );

        /**
         * Check to see if this message has been consumed already. If not,
         * save the parsed message in the receivedMessages mapping.
         *
         * This check can protect against replay attacks in xDapps where messages are
         * only meant to be consumed once.
        */
        require(bytes(receivedMessages[wormholeMessage.hash]).length == 0, "message already received");
        receivedMessageHashes.push(wormholeMessage.hash);
        receivedMessages[wormholeMessage.hash] = parsedMessage.message;
    }

    /**
     * @notice Registers foreign emitters with this contract
     * @dev Only the deployer (owner) can invoke this method
     * @param emitterChainId Wormhole chainId of the contract being registered
     * See https://book.wormhole.com/reference/contracts.html for more information.
     * @param emitterAddress 32-byte address of the contract being registered. For EVM
     * contracts the first 12 bytes should be zeros.
     */
    function registerEmitter(
        uint16 emitterChainId,
        bytes32 emitterAddress
    ) public onlyOwner {
        // sanity check the emitterChainId and emitterAddress input values
        require(
            emitterChainId != 0 && emitterChainId != chainId,
            "emitterChainId cannot equal 0 or this chainId"
        );
        require(
            emitterAddress != bytes32(0),
            "emitterAddress cannot equal bytes32(0)"
        );

        // update the registeredEmitters state variable
        registeredEmitters[emitterChainId] = emitterAddress;
    }

    function verifyEmitter(IWormhole.VM memory vm) internal view returns (bool) {
        // Verify that the sender of the Wormhole message is a trusted
        // HelloWorld contract.
        return registeredEmitters[vm.emitterChainId] == vm.emitterAddress;
    }

    modifier onlyOwner() {
        require(owner == msg.sender, "caller not the owner");
        _;
    }

    /**
     * @notice Encodes the CrossChainMessage struct into bytes
     * @param parsedMessage CrossChainMessage struct with arbitrary message
     * @return encodedMessage CrossChainMessage encoded into bytes
     */
    function encodeMessage(
        CrossChainMessage memory parsedMessage
    ) public pure returns (bytes memory encodedMessage) {
        // Convert message string to bytes so that we can use the .length attribute.
        // The length of the arbitrary messages needs to be encoded in the message
        // so that the corresponding decode function can decode the message properly.
        bytes memory encodedMessagePayload = abi.encodePacked(parsedMessage.message);

        // return the encoded message
        encodedMessage = abi.encodePacked(
            parsedMessage.payloadID,
            uint16(encodedMessagePayload.length),
            encodedMessagePayload
        );
    }

    /**
     * @notice Decodes bytes into CrossChainMessage struct
     * @dev Verifies the payloadID
     * @param encodedMessage encoded arbitrary CrossChainMessage message
     * @return parsedMessage CrossChainMessage struct with arbitrary CrossChainMessage message
     */
    function decodeMessage(
        bytes memory encodedMessage
    ) public pure returns (CrossChainMessage memory parsedMessage) {
        // starting index for byte parsing
        uint256 index = 0;

        // parse and verify the payloadID
        parsedMessage.payloadID = encodedMessage.toUint8(index);
        require(parsedMessage.payloadID == 1, "invalid payloadID");
        index += 1;

        // parse the message string length
        uint256 messageLength = encodedMessage.toUint16(index);
        index += 2;

        // parse the message string
        bytes memory messageBytes = encodedMessage.slice(index, messageLength);
        parsedMessage.message = string(messageBytes);
        index += messageLength;

        // confirm that the message was the expected length
        require(index == encodedMessage.length, "invalid message length");
    }    
}