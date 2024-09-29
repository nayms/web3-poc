# NEAR chain signatures

Testing a [cross-chain call](https://docs.near.org/build/chain-abstraction/chain-signatures/) from NEAR to Ethereum from a CLI script.

How it works:

1. A transaction payload is generated for a method call to contract [`0xe2a01146FFfC8432497ae49A7a6cBa5B9Abd71A3` on Sepolia](https://sepolia.etherscan.io/address/0xe2a01146FFfC8432497ae49A7a6cBa5B9Abd71A3). 
2. The NEAR MPC server is called with this transaction payload to sign this transaction using the NEAR wallet.
    * Internally, this first derives the Ethereum private key for our NEAR wallet - `naymspoc.testnet` - based on a [derivation path of `ethereum-1`](https://docs.near.org/build/chain-abstraction/chain-signatures#1-deriving-the-foreign-address).
    * The derived key should have public address: [`0x934a0496e1b07e686cddddbe6deb2e9d33a3a7d1`](https://sepolia.etherscan.io/address/0x934a0496e1b07e686cddddbe6deb2e9d33a3a7d1)
    * _The signing call to the MPC server is actually a 
3. The transaction is then sent to Sepolia directly by the script.
    * _Thus the MPC server doesn't in this case relay the transaction to Ethereum, it just generates the signed transaction hash that we can then send manually_.


This code is based on:
* https://github.com/near-examples/near-multichain
* https://github.com/near-examples/chainsig-script

## Getting started

* Ensure `0x934a0496e1b07e686cddddbe6deb2e9d33a3a7d1` on Sepolia has enough test ETH to pay for gas.
  * _Grab some from the [Alchemy faucet](https://www.alchemy.com/faucets/ethereum-sepolia) if not._
* Copy `.env.example` to `.env` and fill in the missing values.
* Run `npm start`
  * _Sending the transaction to Sepolia may take a while, but it should work and output a Sepolia tx link_
