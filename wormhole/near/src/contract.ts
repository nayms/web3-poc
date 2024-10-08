import { assert, NearBindgen, NearPromise, type PromiseIndex, call, initialize, near } from 'near-sdk-js';

const THIRTY_TGAS = BigInt("30000000000000");
const NO_DEPOSIT = BigInt(0);
const NO_ARGS = JSON.stringify({});


@NearBindgen({})
class Main {
  owner: string;
  wormhole: string;
  chainId: number;
  wormholeFinality: number;

  constructor() {
    this.owner = '';
    this.wormhole = '';
    this.chainId = 0;
    this.wormholeFinality = 0;
  }

  @initialize({})
  init({ wormhole, chainId, wormholeFinality }: { wormhole: string; chainId: number; wormholeFinality: number }): void {
    assert(!near.storageRead('STATE'), "Already initialized");
    assert(chainId > 0, "invalid chainId");
    assert(wormholeFinality > 0, "invalid wormholeFinality");

    this.owner = near.predecessorAccountId();
    this.wormhole = wormhole;
    this.chainId = chainId;
    this.wormholeFinality = wormholeFinality;
  }

  @call({ payableFunction: true })
  send_message({ message }: { message: string }): NearPromise {
    const deposit = near.attachedDeposit();

    const promise = NearPromise.new(this.wormhole)
    .functionCall("message_fee", NO_ARGS, NO_DEPOSIT, THIRTY_TGAS)
    .then(
      NearPromise.new(near.currentAccountId())
        .functionCall(
          "_send_message",
          JSON.stringify({ message }),
          deposit,
          THIRTY_TGAS,
        ),
    );

    return promise.asReturn();
  }

  @call({ privateFunction: true })
  _send_message({ message }: { message: string }): void {
    let fee: bigint;

    try {
      fee = BigInt(near.promiseResult(0 as PromiseIndex));
      near.log(`The message fee is: ${fee}`);
    } catch {
      near.log("Failed to fetch message fee");
      return
    }

    const deposit = near.attachedDeposit();

    if (deposit < fee) {
      near.log("Attached deposit is less than the message fee");
      return;
    }

    const encodedMessage = this.encodeMessage({
      payloadId: 1,
      message,
    });

    near.log(`Encoded message: ${encodedMessage}`);

    NearPromise.new(this.wormhole).functionCall("publish_message", encodedMessage.toString(), deposit, THIRTY_TGAS)
  }

  private encodeMessage(message: { payloadId: number; message: string }): Uint8Array {
    const encoder = new TextEncoder();
    const messageBytes = encoder.encode(message.message);
    const result = new Uint8Array(3 + messageBytes.length);
    result[0] = message.payloadId;
    result[1] = messageBytes.length & 0xff;
    result[2] = (messageBytes.length >> 8) & 0xff;
    result.set(messageBytes, 3);
    return result;
  }
}

