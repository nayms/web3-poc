import { Account, KeyPair, Near } from 'near-api-js';
import * as nearAPI from 'near-api-js';
import type { KeyPairString } from 'near-api-js/lib/utils';
import { deriveChildPublicKey, najPublicKeyStrToUncompressedHexPoint, uncompressedHexPointToEvmAddress } from './kdf';
const { keyStores } = nearAPI;

export const createWallet = (mpContractId: string, nearAccountId: string, nearPrivateKey: string) => {
    const keyStore = new keyStores.InMemoryKeyStore();
    keyStore.setKey('testnet', nearAccountId, KeyPair.fromString(nearPrivateKey as KeyPairString));

    console.log('Near MPC call details:');
    console.log('Near accountId', nearAccountId);
    console.log('MPC contractId', mpContractId);
    
    const config = {
        networkId: 'testnet',
        keyStore: keyStore,
        nodeUrl: 'https://rpc.testnet.near.org',
        walletUrl: 'https://testnet.mynearwallet.com/',
    }

    const near = new Near(config);
    const account = new Account(near.connection, nearAccountId);
    
    const deriveAddress = async (): Promise<{ publicKey: Buffer, address: string, derivationPath: string }> => {
        const derivationPath = 'ethereum-1';
        const publicKey = await deriveChildPublicKey(najPublicKeyStrToUncompressedHexPoint(), nearAccountId, derivationPath);
        const address = await uncompressedHexPointToEvmAddress(publicKey);
        return { publicKey: Buffer.from(publicKey, 'hex'), address, derivationPath };
    }
    
    const sign = async (payloadArray: Uint8Array, path: string, gas: string, attachedDeposit: string): Promise<{ big_r: Uint8Array, s: Uint8Array, recovery_id: number }> => {
        const payload = Array.from(payloadArray)
        
        let args = {
            payload,
            path,
            key_version: 0,
            rlp_payload: undefined,
            request: undefined,
        };
    
        args = {
            request: args,
        } as any;
    
        console.log(
            'sign payload',
            payload.length > 200 ? payload.length : payload.toString(),
        );
        console.log('with path', path);
        console.log('this may take approx. 30 seconds to complete');
    
        let res;
        try {
            res = await account.functionCall({
                contractId: mpContractId,
                methodName: 'sign',
                args,
                gas: BigInt(gas),
                attachedDeposit: BigInt(attachedDeposit),
            });
        } catch (e) {
            throw new Error(`error signing: ${JSON.stringify(e)}`);
        }
    
        // parse result into signature values we need r, s but we don't need first 2 bytes of r (y-parity)
        if ('SuccessValue' in (res.status as any)) {
            const successValue = (res.status as any).SuccessValue;
            const decodedValue = Buffer.from(successValue, 'base64').toString(
                'utf-8',
            );
            const { big_r, s, recovery_id } = JSON.parse(decodedValue);
            return {
                big_r,
                s,
                recovery_id,
            };
        }

        throw new Error(`Error signing: ${JSON.stringify(res)}`);
    
    }
    
    return { near, account, sign, deriveAddress };
}

