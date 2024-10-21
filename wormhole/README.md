# Wormhole cross-chain transfers

This is a demo of Aptos-to-Ethereum transfers using [Wormhole](https://wormhole.com/).

Links:
  * [Wormhole live contract addresses](https://wormhole.com/docs/build/reference/contract-addresses/)
  * [Core contracts docs](https://wormhole.com/docs/build/contract-integrations/core-contracts/)

## Dev guide

The way Wormhole cross-chain messaging works is as follows:

1. Make call to Wormhole core contract on chain A.
2. The core contract will emit a `LogMessagePublished` event that will get picked up Wormhole [guardians](https://wormhole.com/docs/learn/infrastructure/guardians/).
3. Guardians will sign a [VAA](https://wormhole.com/docs/learn/infrastructure/vaas/).
    * This VAA contains the message payload originally submitted as well as an attestation.
4. This VAA needs to be submitted to the Wormhole core contracts on the destination chain, which will verify that the Guardians signed it.
5. If everything looks good the cross-chain message will be considered succesful.

There are [3 options for propagating the VAA](https://wormhole.com/docs/learn/infrastructure/relayer/) to destination chain (step 4):

1. Use the [Wormhole Relay network](https://wormhole.com/docs/build/contract-integrations/wormhole-relayers/) (only work on EVM chains for now), which results in a fully automated end-to-end process.
2. Use custom off-chain solution (e.g including a [Spy](https://wormhole.com/docs/learn/infrastructure/spy/)) that listens for VAAs and then can batch submit, multicast to chains, etc.
3. Manually fetch the VAA from the Wormhole Scan API and then submit it on the destination chain as a tx.

Note that the Wormhole token/NFT bridging functionality and other such features build on to of the core messaging primitive outlined above. **For our purposes, it's easier to work with the core contracts because they are present on all supported blockchains, whereas the higher level features are currently only supported on certin chains.**

### Testnet transfer: Arbitrum Sepolia -> Base Sepolia

We will be transferring from `Arbitrum Sepolia` to `Base Sepolia`. To do this we will deploy the [same contract](./evm/Main.sol) to both chains. We manually fetch the VAA and push it to the destination chain.

First ensure that the test wallet has enough test ETH in it on both chains (needed to deploy contracts and make calls):
  * Seed: `inch deny wing welcome pumpkin mask snack common avocado vicious recycle horror`
  * Address: `0xeb8c6905c5ac29b25b34eef31f783a035735b4de`
    * [Arbitrum Sepolia](https://sepolia.arbiscan.io/address/0xeb8c6905c5ac29b25b34eef31f783a035735b4de)
    * [Base Sepolia](https://sepolia.basescan.org/address/0xeb8c6905c5ac29b25b34eef31f783a035735b4de)

Now to run the code:

1. Install [Rust](https://www.rust-lang.org/tools/install) and [Foundry](https://getfoundry.sh/).
2. Run `foundryup`.
3. Run `npm run test-evm-evm` to deploy the EVM contracts to both `Arbitrum Sepolia` and `Base Sepolia` networks.
    * To test using previously deployed contracts: `npm run test-evm-evm -- --arbitrum-address 0x5f0f7f263ea6a62ffd6f9070183468ac58e38719 --base-address 0x82af0b266d0b671f65982aab78a3373ce80631d4`
4. You should see `Received message: "Nayms is in the house!"` received by the Base Sepolia contract.

### Testnet transfer: Sui testnet -> Base Sepolia

1. Install [Sui CLI](https://docs.sui.io/guides/developer/getting-started/sui-install).
2. Run `npm run test-sui-evm`
    * To test using previously deployed contracts: `npm run test-evm-evm -- --base-address 0x82af0b266d0b671f65982aab78a3373ce80631d4`
3. You should see `Received message: "Nayms is in the house!"` received by the Base Sepolia contract.

Useful references:
* https://github.com/abhi3700/sui-playground
* https://move-book.com/
* https://docs.sui.io/

### Testnet transfer: Solana testnet -> Base Sepolia

1. Setup your [Solana dev environment](https://solana.com/docs/intro/installation).
    * _Note: For Mac I had problems getting `solana-test-validator` working, and had to install a specific version: `sh -c "$(curl -sSfL release.solana.com/v1.17.31/install)"`_
1. Run `solana config set --url devnet` to switch to Solana devnet.
1. Run `solana-keygen new` to generate a new wallet keypair.
1. Run `solana address` to see the wallet address. Remember this value.
1. Run `solana airdrop 2` to request an airdrop of Devnet SOL to this wallet.
2. Run `npm run test-sol-evm --sol-wallet <wallet address>`


### Testnet transfer: NEAR testnet -> Base Sepolia

1. Install [Near CLI](https://docs.near.org/sdk/js/cli/).
1. Run `near account import-account using-web-wallet network-config mainnet`
    * Login using the account `naymspoc.near`
2. Run `npm run test-near-evm`
3. _TBC_ - at present the NEAR transaction isn't showing up in wormholescan so we can't fetch the VAA either, trying to get support on this.


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
