import type { WalletClientBase } from "@goat-sdk/core";
import { viem } from "@goat-sdk/wallet-viem";
import { createWalletClient, Hex, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { mainnet } from "viem/chains";

// Add the chain you want to use, remember to update also
// the EVM_PROVIDER_URL to the correct one for the chain
export const chain = mainnet;

export function getWalletClient(
    getSetting: (key: string) => string | undefined
) {
    const privateKey = getSetting("EVM_PRIVATE_KEY");
    if (!privateKey) return null;
    const hexPrivateKey = `0x${privateKey}` as Hex;

    const provider = getSetting("EVM_PROVIDER_URL");
    if (!provider) throw new Error("EVM_PROVIDER_URL not configured");

    console.log("goat provider:",provider);

    const wallet = createWalletClient({
        account: privateKeyToAccount(hexPrivateKey),
        chain: chain,
        transport: http(provider),
    });

    return viem(wallet);
}

export function getWalletProvider(walletClient: WalletClientBase) {
    return {
        async get(): Promise<string | null> {
            try {
                const address = walletClient.getAddress();
                const balance = await walletClient.balanceOf(address);
                return `EVM Wallet Address: ${address}\nBalance: ${balance} ETH`;
            } catch (error) {
                console.error("Error in EVM wallet provider:", error);
                return null;
            }
        },
    };
}
