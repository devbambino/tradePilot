export * from "./actions/helloLit/helloLit";
export * from "./actions/tools/erc20transfer/toolCall";
export * from "./actions/tools/ecdsaSign/toolCall";
export * from "./actions/tools/uniswapSwap/toolCall";

import type { Plugin } from "@elizaos/core";
import { HELLO_LIT_ACTION } from "./actions/helloLit/helloLit";
import { WALLET_TRANSFER_LIT_ACTION } from "./actions/tools/erc20transfer/toolCall";
import { ECDSA_SIGN_LIT_ACTION } from "./actions/tools/ecdsaSign/toolCall";
import { UNISWAP_SWAP_LIT_ACTION } from "./actions/tools/uniswapSwap/toolCall";
import { sendTx } from "./actions/sendTx";
import { litProvider } from "./providers";

export const litPlugin: Plugin = {
    name: "lit",
    description: "Lit Protocol integration plugin",
    providers: [litProvider],
    evaluators: [],
    services: [],
    actions: [sendTx],
};

export default litPlugin;
