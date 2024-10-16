export const MNEMONIC = 'inch deny wing welcome pumpkin mask snack common avocado vicious recycle horror';

// Export networks
export const WORMHOLE_NETWORKS = {
  arbitrum: { 
    name: 'Arbitrum Sepolia', 
    explorer: 'https://sepolia.arbiscan.io',
    wormholeAddress: '0x6b9C8671cdDC8dEab9c719bB87cBd3e782bA6a35',
    wormholeChainId: 10003,
    wormholeFinality: 200,
  },
  base: { 
    name: 'Base Sepolia', 
    explorer: 'https://sepolia.basescan.org',
    wormholeAddress: '0x79A1027a6A159502049F10906D333EC57E95F083',
    wormholeChainId: 10004,
    wormholeFinality: 200,
  },
  near: {
    name: 'Near Testnet',
    explorer: 'https://testnet.nearblocks.io',
    wormholeAddress: 'wormhole.wormhole.testnet',
    wormholeChainId: 15,
    wormholeFinality: 200,
  },
  sui: {
    name: 'Sui Testnet',
    explorer: 'https://suiscan.xyz/testnet',
    wormholeAddress: '0xf47329f4344f3bf0f8e436e2f7b485466cff300f12a166563995d3888c296a94',
    wormholeChainId: 21,
    wormholeFinality: 0,
  }
};
