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
        ctx: &mut TxContext
    ) {
        assert!(coin::value(&coins) >= main.message_fee, EInsufficientBalance);

        main.nonce = main.nonce + 1;

        let messageTicket = wormhole::publish_message::prepare_message(
            emitter_cap,
            main.nonce,
            message
        );

        wormhole::publish_message::publish_message(
            wormhole_state,
            coins,
            messageTicket,
            clock
        );
    }

    // /// Encodes the message according to the specified format.
    // fun encode_message(
    //     payload_id: u8,
    //     message: &string::String
    // ): vector<u8> {
    //     let message_bytes = string::bytes(message);
    //     let length = vector::length(&message_bytes);
    //     assert!(length <= 0xFFFF, error::invalid_argument(0)); // Ensure length fits in two bytes.

    //     let mut result = vector::empty<u8>();
    //     vector::push_back(&mut result, payload_id);
    //     vector::push_back(&mut result, (length >> 8) as u8);
    //     vector::push_back(&mut result, (length & 0xFF) as u8);
    //     vector::append(&mut result, message_bytes);

    //     result
    // }
}
