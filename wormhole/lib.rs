use near_sdk::borsh::{self, BorshDeserialize, BorshSerialize};
use near_sdk::collections::{LookupMap, Vector};
use near_sdk::{env, near_bindgen, AccountId, Balance, PanicOnDefault, Promise};
use serde::{Deserialize, Serialize};

#[near_bindgen]
#[derive(BorshDeserialize, BorshSerialize, PanicOnDefault)]
pub struct Main {
    owner: AccountId,
    wormhole: AccountId,
    chain_id: u16,
    wormhole_finality: u8,
    registered_emitters: LookupMap<u16, Vec<u8>>,
    received_messages: LookupMap<Vec<u8>, String>,
    received_message_hashes: Vector<Vec<u8>>,
}

#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize)]
pub struct CrossChainMessage {
    payload_id: u8,
    message: String,
}

#[near_bindgen]
impl Main {
    #[init]
    pub fn new(wormhole: AccountId, chain_id: u16, wormhole_finality: u8) -> Self {
        assert!(!env::state_exists(), "Already initialized");
        assert!(chain_id > 0, "invalid chainId");
        assert!(wormhole_finality > 0, "invalid wormholeFinality");

        Self {
            owner: env::predecessor_account_id(),
            wormhole,
            chain_id,
            wormhole_finality,
            registered_emitters: LookupMap::new(b"r"),
            received_messages: LookupMap::new(b"m"),
            received_message_hashes: Vector::new(b"h"),
        }
    }

    pub fn get_number_of_received_messages(&self) -> u64 {
        self.received_message_hashes.len()
    }

    #[payable]
    pub fn send_message(&mut self, message: String) -> Promise {
        let deposit = env::attached_deposit();
        let wormhole_fee = self.get_wormhole_fee();
        assert!(deposit == wormhole_fee, "insufficient deposit");

        let encoded_message = self.encode_message(&CrossChainMessage {
            payload_id: 1,
            message,
        });

        // Call Wormhole contract to publish the message
        Promise::new(self.wormhole.clone()).function_call(
            "publish_message".to_string(),
            encoded_message,
            deposit,
            env::prepaid_gas() / 2,
        )
    }

    pub fn receive_message(&mut self, encoded_message: Vec<u8>) {
        // In a real implementation, you would call the Wormhole contract to verify the message
        // For simplicity, we'll assume the message is valid and properly formatted

        let parsed_message = self.decode_message(&encoded_message);
        let message_hash = env::sha256(&encoded_message);

        assert!(
            self.received_messages.get(&message_hash).is_none(),
            "message already received"
        );

        self.received_message_hashes.push(&message_hash);
        self.received_messages
            .insert(&message_hash, &parsed_message.message);
    }

    pub fn register_emitter(&mut self, emitter_chain_id: u16, emitter_address: Vec<u8>) {
        self.assert_owner();
        assert!(
            emitter_chain_id != 0 && emitter_chain_id != self.chain_id,
            "emitterChainId cannot equal 0 or this chainId"
        );
        assert!(!emitter_address.is_empty(), "emitterAddress cannot be empty");

        self.registered_emitters
            .insert(&emitter_chain_id, &emitter_address);
    }

    fn encode_message(&self, message: &CrossChainMessage) -> Vec<u8> {
        let mut encoded = Vec::new();
        encoded.push(message.payload_id);
        encoded.extend_from_slice(&(message.message.len() as u16).to_le_bytes());
        encoded.extend_from_slice(message.message.as_bytes());
        encoded
    }

    fn decode_message(&self, encoded: &[u8]) -> CrossChainMessage {
        assert!(encoded.len() >= 3, "invalid encoded message length");
        let payload_id = encoded[0];
        assert_eq!(payload_id, 1, "invalid payloadID");

        let message_length = u16::from_le_bytes([encoded[1], encoded[2]]) as usize;
        assert_eq!(
            encoded.len(),
            3 + message_length,
            "invalid message length"
        );

        let message = String::from_utf8(encoded[3..].to_vec()).expect("invalid UTF-8");

        CrossChainMessage {
            payload_id,
            message,
        }
    }

    fn assert_owner(&self) {
        assert_eq!(
            env::predecessor_account_id(),
            self.owner,
            "Only the owner can call this method"
        );
    }

    fn get_wormhole_fee(&self) -> Balance {
        // In a real implementation, you would query the Wormhole contract for the fee
        // For simplicity, we'll return a fixed amount
        10_000_000_000_000_000_000_000 // 0.01 NEAR
    }
}