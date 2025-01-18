module 0x0::template_coin {
    use std::option;
    use sui::coin;
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::url;

    /// The OTW for the Coin
    public struct TEMPLATE_COIN has drop {}

    const DECIMALS: u8 = 6;
    const SYMBOL: vector<u8> = b"TMPL";
    const NAME: vector<u8> = b"Template Coin";
    const DESCRIPTION: vector<u8> = b"Template Coin Description";
    const IMAGE_URL: vector<u8> = b"https://strapi-dev.scand.app/uploads/sui_c07df05f00.png";

    /// Init the Coin
    fun init(
        witness: TEMPLATE_COIN,
        ctx: &mut TxContext
    ) {
        let (treasury, metadata) = coin::create_currency(
            witness,
            DECIMALS,
            SYMBOL,
            NAME,
            DESCRIPTION,
            option::some(
                url::new_unsafe_from_bytes(IMAGE_URL)
            ),
            ctx
        );

        transfer::public_transfer(treasury, tx_context::sender(ctx));
        transfer::public_share_object(metadata);
    }
}
