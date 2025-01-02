import type { Plugin } from "@elizaos/core";
import { getOnChainActions } from "./actions";
import { erc20, USDC,PEPE } from "@goat-sdk/plugin-erc20";
import { sendETH } from "@goat-sdk/wallet-evm";
import { getWalletClient, getWalletProvider } from "./wallet";
import {polymarket} from "@goat-sdk/plugin-polymarket";
import {uniswap} from "@goat-sdk/plugin-uniswap";
import {farcasterPlugin} from "@goat-sdk/plugin-farcaster";

async function createGoatPlugin(
    getSetting: (key: string) => string | undefined
): Promise<Plugin> {
    const walletClient = getWalletClient(getSetting);
    const actions = await getOnChainActions({
        wallet: walletClient,
        // Add plugins here based on what actions you want to use
        // See all available plugins at https://ohmygoat.dev/chains-wallets-plugins#plugins
        plugins: [sendETH(), erc20({ tokens: [USDC,PEPE] })],
    });

    return {
        name: "[GOAT] Onchain Actions",
        description: "Base integration plugin",
        providers: [getWalletProvider(walletClient)],
        evaluators: [],
        services: [],
        actions: actions,
    };
}

export default createGoatPlugin;
