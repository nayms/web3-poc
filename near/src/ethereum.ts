import { Common } from '@ethereumjs/common';
import { FeeMarketEIP1559Transaction } from '@ethereumjs/tx';
import { type AddressLike, bytesToHex } from '@ethereumjs/util';
import { Contract, JsonRpcProvider } from 'ethers';
import { Web3 } from 'web3';

export class Ethereum {
  private web3: Web3;
  private provider: JsonRpcProvider;
  private chain_id: number;

  constructor(chain_rpc: string, chain_id: number) {
    this.web3 = new Web3(chain_rpc);
    this.provider = new JsonRpcProvider(chain_rpc);
    this.chain_id = chain_id;
    this.queryGasPrice();
  }

  async queryGasPrice() {
    const maxFeePerGas = await this.web3.eth.getGasPrice();
    const maxPriorityFeePerGas = await this.web3.eth.getMaxPriorityFeePerGas();
    return { maxFeePerGas, maxPriorityFeePerGas };
  }

  createTransactionData(receiver: string, abi: any, methodName: string, args: any[] = []) {
    const contract = new Contract(receiver, abi);

    return contract.interface.encodeFunctionData(methodName, args);
  }

  async createPayload(sender: string, receiver: AddressLike, amount: string, data: any) {
    const common = new Common({ chain: this.chain_id });

    // Get the nonce & gas price
    const nonce = await this.web3.eth.getTransactionCount(sender);
    const { maxFeePerGas, maxPriorityFeePerGas } = await this.queryGasPrice();

    console.log('nonce', nonce);
    console.log('maxFeePerGas', maxFeePerGas);
    console.log('maxPriorityFeePerGas', maxPriorityFeePerGas);

    // Construct transaction
    const transactionData = {
      nonce,
      gasLimit: 50_000,
      maxFeePerGas,
      maxPriorityFeePerGas,
      to: receiver,
      data: data,
      value: BigInt(this.web3.utils.toWei(amount, "ether")),
      chain: this.chain_id,
    };

    // Create a transaction
    const transaction = FeeMarketEIP1559Transaction.fromTxData(transactionData, { common });
    const payload = transaction.getHashedMessageToSign();

    return { transaction, payload };
  }


  async reconstructSignature(big_r: any, S: any, recovery_id: any, transaction: any) {
    // reconstruct the signature
    const r = Buffer.from(big_r.affine_point.substring(2), 'hex');
    const s = Buffer.from(S.scalar, 'hex');
    const v = recovery_id;

    const signature = transaction.addSignature(v, r, s);

    if (signature.getValidationErrors().length > 0) throw new Error("Transaction validation errors");
    if (!signature.verifySignature()) throw new Error("Signature is not valid");
    return signature;
  }

  // This code can be used to actually relay the transaction to the Ethereum network
  async relayTransaction(signedTransaction: any) {
    const serializedTx = bytesToHex(signedTransaction.serialize());
    const relayed = await this.web3.eth.sendSignedTransaction(serializedTx);
    return relayed.transactionHash
  }
}