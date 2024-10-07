# Wormhole cross-chain transfers

This is a demo of Aptos-to-Ethereum transfers using [Wormhole](https://wormhole.com/).

How it works:

_TODO_

Links:
  * [Wormhole live contract addresses](https://wormhole.com/docs/build/reference/contract-addresses/)
  * [Core contracts docs](https://wormhole.com/docs/build/contract-integrations/core-contracts/)

## Dev guide

### Testnet transfer: Arbitrum Sepolia -> Base Sepolia

We will be transferring from `Arbitrum Sepolia` to `Base Sepolia`. To do this we will deploy the [same contract](./evm/Main.sol) to both chains.

First ensure that the test wallet has enough test ETH in it on both chains (needed to deploy contracts and make calls):
  * Seed: `inch deny wing welcome pumpkin mask snack common avocado vicious recycle horror`
  * Address: `0xeb8c6905c5ac29b25b34eef31f783a035735b4de`
    * [Arbitrum Sepolia](https://sepolia.arbiscan.io/address/0xeb8c6905c5ac29b25b34eef31f783a035735b4de)
    * [Base Sepolia](https://sepolia.basescan.org/address/0xeb8c6905c5ac29b25b34eef31f783a035735b4de)

Now to run the code:

1. Install [Rust](https://www.rust-lang.org/tools/install) and [Foundry](https://getfoundry.sh/).
2. Run `foundryup`.
3. Run `npm run build` to build the EVM contracts.
4. Run `npm run test-evm-evm` to deploy the EVM contracts to both `Arbitrum Sepolia` and `Base Sepolia` networks.
    * To test using previously deployed contracts: `npm run test-evm-evm -- --arbitrum-address 0x. --base-address 0x.`
      * Example contracts you can use:
        * Arbitrum Sepolia - [0x5f0f7f263ea6a62ffd6f9070183468ac58e38719](https://sepolia.arbiscan.io/address/0x5f0f7f263ea6a62ffd6f9070183468ac58e38719)
        * Base Sepolia - [0x82af0b266d0b671f65982aab78a3373ce80631d4](https://sepolia.basescan.org/address/0x82af0b266d0b671f65982aab78a3373ce80631d4)


### Local test (NOT YET WORKING!)

**NOTE: I haven't ben able to get this working yet, due to issues in the evm2 image build below...**

* Based on the instructions at https://wormhole.com/docs/build/toolkit/tilt get a local devnet setup such that we have local EVM and NEAR nodes running:
  * OS X:
    1. `brew install go docker tilt`
    2. Go into Docker desktop settings and switch on kubernetes. Also configure Docker to have 4 CPUs and about 16GB of RAM.
    3. `git clone --branch main https://github.com/wormhole-foundation/wormhole.git`
    4. `tilt up -- --aptos --evm2` inside the `wormhole/` folder
      * Goto http://localhost:10350/ to see the container load progress. For the first run it might take time for the devnets to be fully setup and running.
* To shut down:
  * OS X:
    * `tilt down -- --aptos --evm2`
* _Next steps TBC..._
