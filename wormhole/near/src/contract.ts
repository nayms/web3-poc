import { assert, NearBindgen, NearPromise, type PromiseIndex, call, encode, initialize, near, view } from 'near-sdk-js';

const BASIC_GAS = BigInt("30000000000000");
const NO_DEPOSIT = BigInt(0);
const NO_ARGS = JSON.stringify({});


@NearBindgen({})
class Main {
  owner: string;
  wormhole: string;
  chainId: number;
  nonce: number;
  messageFee: bigint;
  lastMessageSequence: bigint;

  constructor() {
    this.owner = '';
    this.wormhole = '';
    this.chainId = 0;
    this.nonce = 0;
    this.messageFee = BigInt(0);
    this.lastMessageSequence = BigInt(0);
  }

  @initialize({})
  init({ wormhole, chainId }: { wormhole: string; chainId: number }): void {
    assert(!near.storageRead('STATE'), "Already initialized");
    assert(chainId > 0, "invalid chainId");

    this.owner = near.predecessorAccountId();
    this.wormhole = wormhole;
    this.chainId = chainId;
  }

  @call({ payableFunction: true })
  register_emitter(): NearPromise {
    const deposit = near.attachedDeposit();
    assert(deposit > BigInt(0), "Must attach a deposit");

    near.log(`Current account id: ${near.currentAccountId()}`);
    near.log(`Deposit: ${deposit}`);

    return NearPromise.new(this.wormhole)
      .functionCall("register_emitter", JSON.stringify({ emitter: near.currentAccountId() }), deposit, BigInt("100000000000000"))
      .asReturn();
  }

  @call({})
  update_message_fee(): NearPromise {
    return NearPromise.new(this.wormhole)
      .functionCall("message_fee", NO_ARGS, NO_DEPOSIT, BASIC_GAS)
      .then(
        NearPromise.new(near.currentAccountId())
          .functionCall(
            "_update_message_fee_callback",
            NO_ARGS,
            NO_DEPOSIT,
            BASIC_GAS,
          )
      )
      .asReturn();
  }

  @call({ privateFunction: true })
  _update_message_fee_callback(): void {
    try {
      this.messageFee = BigInt(near.promiseResult(0 as PromiseIndex));
      near.log(`Updated message fee: ${this.messageFee}`);
    } catch {
      near.log("Failed to update message fee");
    }
  }

  @call({ payableFunction: true })
  send_message({ message }: { message: string }): NearPromise {
    const deposit = near.attachedDeposit();
    assert(deposit >= this.messageFee, "Attached deposit is less than the message fee");

    const encodedMessage = this.encodeMessage({
      payloadId: 1,
      message,
    });

    near.log(`Encoded message: ${encodedMessage}`);

    this.nonce += 1;
    near.log(`Nonce: ${this.nonce}`);

    return NearPromise.new(this.wormhole)
      .functionCall("publish_message", JSON.stringify({ data: encodedMessage.toString(), nonce: this.nonce }), deposit, BigInt("200000000000000"))
      .then(
        NearPromise.new(near.currentAccountId())
          .functionCall(
            "_publish_message_callback",
            NO_ARGS,
            NO_DEPOSIT,
            BASIC_GAS,
          )
      )
      .asReturn();
  }

  @call({ privateFunction: true })
  _publish_message_callback(): void {
    try {
      this.lastMessageSequence = BigInt(near.promiseResult(0 as PromiseIndex));
      near.log(`Last message sequence: ${this.lastMessageSequence}`);
    } catch {
      near.log("Failed to update last message sequence");
    }
  }

  @view({})
  get_last_message_sequence(): bigint {
    return this.lastMessageSequence;
  }

  private encodeMessage(message: { payloadId: number; message: string }): Uint8Array {
    const messageBytes = encode(message.message);
    const result = new Uint8Array(3 + messageBytes.length);
    result[0] = message.payloadId;
    result[1] = messageBytes.length & 0xff;
    result[2] = (messageBytes.length >> 8) & 0xff;
    result.set(messageBytes, 3);
    return result;
  }
}

