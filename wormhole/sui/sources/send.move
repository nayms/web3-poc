module sui_gateway::send {
    use wormhole::emitter::EmitterCap;
    use wormhole::state::State;
    use sui::{clock::Clock};
    use 0x2::coin;
    use sui::coin::{Coin};
    use sui::sui::{SUI};

    public struct Main has key {
        id: UID,
        owner: address,
        nonce: u32,
        message_fee: u64
    }

    const EUnauthorized: u64 = 0;
    const EInsufficientBalance: u64 = 1;
    const EInvalidMessageLength: u64 = 2;

    /// Initializes the contract. This function should be called once.
    fun init(ctx: &mut TxContext) {
        let owner = tx_context::sender(ctx);

        let main = Main {
            id: object::new(ctx),
            owner,
            nonce: 0,
            message_fee: 0
        };

        transfer::share_object(main);
    }

    /// Returns a new emitter cap that will be used to send messages.
    public fun get_emitter_cap(
        main: &mut Main,
        wormhole_state: &State,
        ctx: &mut TxContext
    ): EmitterCap {
        let sender = tx_context::sender(ctx);
        assert!(sender == main.owner, EUnauthorized);
        let emitter_cap = wormhole::emitter::new(wormhole_state, ctx);
        (emitter_cap)
    }

    /// Updates the message fee by querying the Wormhole contract.
    public fun update_message_fee(
        main: &mut Main,
        wormhole_state: &State,
        ctx: &mut TxContext
    ): u64 {
        let sender = tx_context::sender(ctx);
        assert!(sender == main.owner, EUnauthorized);
        main.message_fee = wormhole::state::message_fee(wormhole_state);
        (main.message_fee)
    }

    /// Sends a message via the Wormhole contract.
    public fun send_message(
        main: &mut Main,
        wormhole_state: &mut State,
        emitter_cap: &mut EmitterCap,
        clock: &Clock,
        message: vector<u8>,
        coins: Coin<SUI>,
        _ctx: &mut TxContext
    ) {
        assert!(coin::value(&coins) >= main.message_fee, EInsufficientBalance);

        main.nonce = main.nonce + 1;

        let encodedMessage = encode_message(1, message);

        let messageTicket = wormhole::publish_message::prepare_message(
            emitter_cap,
            main.nonce,
            encodedMessage
        );

        wormhole::publish_message::publish_message(
            wormhole_state,
            coins,
            messageTicket,
            clock
        );
    }

    /// Encodes the message
    ///
    /// The message is encoded as follows:
    /// - 1 byte payload ID
    /// - 2 bytes length of the message
    /// - message bytes
    fun encode_message(
        payload_id: u8,
        message: vector<u8>
    ): vector<u8> {
        let length = vector::length(&message);
        assert!(length <= 0xFFFF, EInvalidMessageLength); // Ensure length fits in two bytes.
        let mut result = vector::empty<u8>();
        vector::push_back(&mut result, payload_id);
        vector::push_back(&mut result, (length >> 8) as u8);
        vector::push_back(&mut result, (length & 0xFF) as u8);
        vector::append(&mut result, message);
        (result)
    }
}
