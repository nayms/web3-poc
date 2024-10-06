import { wormhole } from '@wormhole-foundation/sdk';

import aptos from '@wormhole-foundation/sdk/aptos';
import evm from '@wormhole-foundation/sdk/evm';

const wh = await wormhole('Testnet', [
  evm,
  aptos,
]);

const aptosChain = wh.getChain('Aptos')
const ethChain = wh.getChain('Ethereum')

