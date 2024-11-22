export const MNEMONIC = 'inch deny wing welcome pumpkin mask snack common avocado vicious recycle horror';

export type WormholeNetwork = {
  name: string;
  explorer: string;
  wormholeAddress: string;
  wormholeChainId: number;
  wormholeFinality: number;
};

// Export networks
export const WORMHOLE_NETWORKS = {
  arbitrum_sepolia: { 
    name: 'Arbitrum Sepolia', 
    explorer: 'https://sepolia.arbiscan.io',
    wormholeAddress: '0x6b9C8671cdDC8dEab9c719bB87cBd3e782bA6a35',
    wormholeChainId: 10003,
    wormholeFinality: 200,
  },
  base_sepolia: { 
    name: 'Base Sepolia', 
    explorer: 'https://sepolia.basescan.org',
    wormholeAddress: '0x79A1027a6A159502049F10906D333EC57E95F083',
    wormholeChainId: 10004,
    wormholeFinality: 200,
  },
  mainnet_holesky: {
    name: 'Mainnet Holesky',
    explorer: 'https://holesky.etherscan.io',
    wormholeAddress: '0xa10f2eF61dE1f19f586ab8B6F2EbA89bACE63F7a',
    wormholeChainId: 10006,
    wormholeFinality: 200,
  },
  polygon_amoy: {
    name: 'Polygon Amoy',
    explorer: 'https://amoy.polygonscan.com',
    wormholeAddress: '0x6b9C8671cdDC8dEab9c719bB87cBd3e782bA6a35',
    wormholeChainId: 10007,
    wormholeFinality: 200,
  },
  near_testnet: {
    name: 'Near Testnet',
    explorer: 'https://testnet.nearblocks.io/',
    wormholeAddress: 'wormhole.wormhole.testnet',
    wormholeChainId: 15,
    wormholeFinality: 200,
  },
  near_mainnet: {
    name: 'Near Mainnet',
    explorer: 'https://nearblocks.io/',
    wormholeAddress: 'contract.wormhole_crypto.near',
    wormholeChainId: 15,
    wormholeFinality: 200,
  },
  sui: {
    name: 'Sui Testnet',
    explorer: 'https://suiscan.xyz/testnet',
    wormholeAddress: '0xf47329f4344f3bf0f8e436e2f7b485466cff300f12a166563995d3888c296a94',
    wormholeChainId: 21,
    wormholeFinality: 0,
  },
  solana_devnet: {
    name: 'Solana Devnet',
    explorer: 'https://explorer.solana.com/?cluster=devnet',
    wormholeAddress: '3u8hJUVTA4jH1wYAyUur7FFZVQ8H635K3tSHHF4ssjQ5',
    wormholeChainId: 1,
    wormholeFinality: 0,
  }
} as Record<string, WormholeNetwork>;

export const THE_MESSAGE = 'Knock, Knock!';
export const THE_MESSAGE_RESPONSE = 'Go away!';