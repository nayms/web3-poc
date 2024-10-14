module sui_gateway::send {
    /// The `Main` struct stores the state of the contract.
    ///
    /// Fields:
    /// - `id`: Unique identifier for the contract object.
    /// - `owner`: The address of the owner of the contract.
    /// - `wormhole`: The address of the Wormhole contract.
    /// - `chain_id`: The chain ID.
    /// - `nonce`: A counter used for message sending.
    /// - `message_fee`: The fee required to send a message.
    public struct Main has key {
        id: UID,
        owner: address,
        nonce: u64,
        message_fee: u64,
    }

    const EUnauthorized: u64 = 0;

    /// Initializes the contract. This function should be called once.
    fun init(ctx: &mut TxContext) {
        let owner = tx_context::sender(ctx);

        let main = Main {
            id: object::new(ctx),
            owner,
            nonce: 0,
            message_fee: 0,
        };

        transfer::share_object(main);
    }

    // /// Registers the emitter with the Wormhole contract.
    // public entry fun register_emitter(
    //     main: &mut Main,
    //     coins: &mut Coin<SUI>,
    //     ctx: &mut TxContext
    // ) {
    //     let sender = tx_context::sender(ctx);
    //     assert!(sender == main.owner, error::unauthorized());

    //     let wormhole_package = package::claim(main.wormhole, ctx);
    //     let (emitter_cap, success) = package::execute_entry_function(
    //         &wormhole_package,
    //         "wormhole",
    //         "register_emitter",
    //         vector::empty<package::TypeTag>(),
    //         vector[bcs::to_bytes(&sender)],
    //         vector[coin::into_balance(coins)],
    //         ctx
    //     );

    //     assert!(success, error::internal(1));

    //     // Store the EmitterCap
    //     transfer::transfer(EmitterCap { id: object::new(ctx) }, sender);

    //     package::return_claimed(wormhole_package);
    // }

    /// Updates the message fee by querying the Wormhole contract.
    public entry fun update_message_fee(
        main: &mut Main,
        wormhole_state: &wormhole::state::State,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        assert!(sender == main.owner, EUnauthorized);
        main.message_fee = wormhole::state::message_fee(wormhole_state);
    }

    // /// Sends a message via the Wormhole contract.
    // public entry fun send_message(
    //     main: &mut Main,
    //     emitter_cap: &EmitterCap,
    //     message: vector<u8>,
    //     coins: &mut Coin<SUI>,
    //     ctx: &mut TxContext
    // ) {
    //     let sender = tx_context::sender(ctx);
    //     let amount = coin::value(coins);

    //     assert!(amount >= main.message_fee, error::insufficient_balance());

    //     main.nonce = main.nonce + 1;

    //     let wormhole_package = package::claim(main.wormhole, ctx);
    //     let (sequence, success) = package::execute_entry_function(
    //         &wormhole_package,
    //         "wormhole",
    //         "publish_message",
    //         vector::empty<package::TypeTag>(),
    //         vector[
    //             bcs::to_bytes(&main.nonce),
    //             message,
    //             bcs::to_bytes(&0u32), // consistency_level
    //         ],
    //         vector[coin::into_balance(coins)],
    //         ctx
    //     );

    //     assert!(success, error::internal(1));

    //     // Emit an event with the sequence number
    //     // ... (Event emission logic goes here)

    //     package::return_claimed(wormhole_package);
    // }

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
