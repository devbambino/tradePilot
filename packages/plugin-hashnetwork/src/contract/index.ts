import {
    type Account,
    type Address,
    createPublicClient,
    createWalletClient,
    defineChain,
    http,
} from "viem";
import type { OnChainProof } from "../utils/proof";
import abi from "./abi";

const chain = defineChain({
    id: 4274,
    name: "Hash-Testnet",
    nativeCurrency: {
        decimals: 18,
        name: "Hash",
        symbol: "HASH",
    },
    rpcUrls: {
        default: {
            http: ["https://hash-testnet.rpc.caldera.xyz/http"],
        },
        public: {
            http: ["https://hash-testnet.rpc.caldera.xyz/http"],
        },
    },
    blockExplorers: {
        default: {
            name: "Hash Explorer",
            url: "https://hash-testnet.explorer.caldera.xyz",
        },
    },
});

const publicClient = createPublicClient({
    chain,
    transport: http(),
});

export async function addProofOnChain({
    proof,
    contractAddress,
    account,
}: {
    proof: OnChainProof;
    contractAddress: Address;
    account: Account;
}) {
    const { request } = await publicClient.simulateContract({
        address: contractAddress,
        abi,
        functionName: "addProof",
        args: [proof],
    });
    const walletClient = createWalletClient({
        chain: publicClient.chain,
        transport: http(),
        account,
    });
    const txHash = await walletClient.writeContract(request);
    await publicClient.waitForTransactionReceipt({ hash: txHash });
    return txHash;
}
