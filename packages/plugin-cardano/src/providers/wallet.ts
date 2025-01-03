import {
    IAgentRuntime,
    ICacheManager,
    Memory,
    Provider,
    State,
} from "@elizaos/core";


import { MaestroProvider, MaestroSupportedNetworks, MeshWallet, Transaction } from '@meshsdk/core';


import NodeCache from "node-cache";
import * as path from "path";
import BigNumber from "bignumber.js";

import { env } from "process";
import { setGlobalDispatcher, ProxyAgent } from "undici";

if (env.https_proxy) {
    // Corporate proxy uses CA not in undici's certificate store
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    const dispatcher = new ProxyAgent({ uri: new URL(env.https_proxy).toString() });
    setGlobalDispatcher(dispatcher);
}

const PROVIDER_CONFIG = {
    MAINNET_RPC: "",
    ADA_USDM_POOL: "64f35d26b237ad58e099041bc14c687ea7fdc58969d7d5b66e2540ef",
    CHAIN_NAME_IN_DEXSCREENER: "cardano",
    MAX_RETRIES: 3,
    RETRY_DELAY: 2000,
    LOVELACE: "lovelace",
    ADA_DECIMALS: 6n,
    LOVELACE_MULTIPLIER: BigInt(10 ** Number(6n))
};

interface WalletPortfolio {
    totalUsd: string;
    totalAda: string;
}

interface Prices {
    nativeToken: { usd: string };
}

export class WalletProvider {
    wallet: MeshWallet;
    private cache: NodeCache;
    private cacheKey: string = "cardano/wallet";

    constructor(
        wallet: MeshWallet,
        private cacheManager: ICacheManager
    ) {

        this.cache = new NodeCache({ stdTTL: 300 });
        this.wallet = wallet;
    }

    // thanks to plugin-sui
    private async readFromCache<T>(key: string): Promise<T | null> {
        const cached = await this.cacheManager.get<T>(
            path.join(this.cacheKey, key)
        );
        return cached;
    }

    private async writeToCache<T>(key: string, data: T): Promise<void> {
        await this.cacheManager.set(path.join(this.cacheKey, key), data, {
            expires: Date.now() + 5 * 60 * 1000,
        });
    }

    private async getCachedData<T>(key: string): Promise<T | null> {
        // Check in-memory cache first
        const cachedData = this.cache.get<T>(key);
        if (cachedData) {
            return cachedData;
        }

        // Check file-based cache
        const fileCachedData = await this.readFromCache<T>(key);
        if (fileCachedData) {
            // Populate in-memory cache
            this.cache.set(key, fileCachedData);
            return fileCachedData;
        }

        return null;
    }

    private async setCachedData<T>(cacheKey: string, data: T): Promise<void> {
        // Set in-memory cache
        this.cache.set(cacheKey, data);

        // Write to file-based cache
        await this.writeToCache(cacheKey, data);
    }

    private async fetchPricesWithRetry() {
        let lastError: Error;

        for (let i = 0; i < PROVIDER_CONFIG.MAX_RETRIES; i++) {
            try {
                const response = await fetch(
                    `https://api.dexscreener.com/latest/dex/pairs/${PROVIDER_CONFIG.CHAIN_NAME_IN_DEXSCREENER}/${PROVIDER_CONFIG.ADA_USDM_POOL}`
                );

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(
                        `HTTP error! status: ${response.status}, message: ${errorText}`
                    );
                }

                const data = await response.json();
                return data;
            } catch (error) {
                console.error(`Attempt ${i + 1} failed:`, error);
                lastError = error;
                if (i < PROVIDER_CONFIG.MAX_RETRIES - 1) {
                    const delay = PROVIDER_CONFIG.RETRY_DELAY * Math.pow(2, i);
                    await new Promise((resolve) => setTimeout(resolve, delay));
                    continue;
                }
            }
        }

        console.error(
            "All attempts failed. Throwing the last error:",
            lastError
        );
        throw lastError;
    }

    async fetchPrices(): Promise<Prices> {
        try {
            const cacheKey = "prices";
            const cachedValue = await this.getCachedData<Prices>(cacheKey);

            if (cachedValue) {
                console.log("Cache hit for fetchPrices");
                return cachedValue;
            }
            console.log("Cache miss for fetchPrices");

            const priceData = await this.fetchPricesWithRetry().catch(
                (error) => {
                    console.error(
                        `Error fetching ${PROVIDER_CONFIG.CHAIN_NAME_IN_DEXSCREENER.toUpperCase()} price:`,
                        error
                    );
                    throw error;
                }
            );
            const prices: Prices = {
                nativeToken: { usd: priceData.pair.priceUsd },
            };
            this.setCachedData(cacheKey, prices);
            return prices;
        } catch (error) {
            console.error("Error fetching prices:", error);
            throw error;
        }
    }

    private async formatPortfolio(
        runtime: IAgentRuntime,
        portfolio: WalletPortfolio
    ): Promise<string> {
        const address = await this.getAddress();
        let output = `${runtime.character.name}\n`;
        output += `Wallet Address: ${address}\n`;

        const totalUsdFormatted = new BigNumber(portfolio.totalUsd).toFixed(2);
        const totalAdaFormatted = new BigNumber(
            portfolio.totalAda
        ).toFixed(4);

        output += `Total Value: $${totalUsdFormatted} (${totalAdaFormatted} ADA)\n`;

        return output;
    }

    private async fetchPortfolioValue(): Promise<WalletPortfolio> {
        try {
            const address = await this.getAddress();
            const cacheKey = `portfolio-${address}`;
            const cachedValue =
                await this.getCachedData<WalletPortfolio>(cacheKey);

            if (cachedValue) {
                console.log("Cache hit for fetchPortfolioValue", cachedValue);
                return cachedValue;
            }
            console.log("Cache miss for fetchPortfolioValue");

            // usdm价格
            const prices = await this.fetchPrices().catch((error) => {
                console.error(
                    `Error fetching ${PROVIDER_CONFIG.CHAIN_NAME_IN_DEXSCREENER.toUpperCase()} price:`,
                    error
                );
                throw error;
            });
            const tokenMap = await this.getWalletBalance().catch(
                (error) => {
                    console.error(
                        `Error fetching ${PROVIDER_CONFIG.CHAIN_NAME_IN_DEXSCREENER.toUpperCase()} amount:`,
                        error
                    );
                    throw error;
                }
            );
            const balance = tokenMap.get(PROVIDER_CONFIG.LOVELACE);
            const adaAmount =
                Number(balance) /
                Number(PROVIDER_CONFIG.LOVELACE_MULTIPLIER);
            const totalUsd = new BigNumber(adaAmount.toString()).times(
                prices.nativeToken.usd
            );

            const portfolio = {
                totalUsd: totalUsd.toString(),
                totalAda: adaAmount.toString(),
            };
            this.setCachedData(cacheKey, portfolio);
            console.log("Fetched portfolio:", portfolio);
            return portfolio;
        } catch (error) {
            console.error("Error fetching portfolio:", error);
            throw error;
        }
    }

    async getFormattedPortfolio(runtime: IAgentRuntime): Promise<string> {
        try {
            const portfolio = await this.fetchPortfolioValue();
            const result = await this.formatPortfolio(runtime, portfolio);
            return result;
        } catch (error) {
            console.error("Error generating portfolio report:", error);
            return "Unable to fetch wallet information. Please try again later.";
        }
    }

    async getAddress(): Promise<string> {
        const unusedAddresses = await this.wallet.getUnusedAddresses();
        return unusedAddresses[0];
    }

    async getWalletBalance(): Promise<Map<string, BigNumber>> {
        const blance = await this.wallet.getBalance();
        console.log("Wallet balance: ", blance);
        const tokenMap = new Map<string, BigNumber>();
        for (const key in blance) {
            if (Object.prototype.hasOwnProperty.call(blance, key)) {
                const asset = blance[key];
                const unit = asset.unit;
                const quantity = asset.quantity;
                const amount = new BigNumber(quantity);
                if (tokenMap.has(unit)) {
                    // 如果已存在，累加值
                    tokenMap.set(unit, tokenMap.get(unit).plus(amount));
                } else {
                    // 如果不存在，直接设置
                    tokenMap.set(unit, amount);
                }
            }
        }
        return tokenMap;
    }

    async sendAda(recipient: string, adaAmount: string | number): Promise<string> {

        // // Adjust amount with decimals
        // const adjustedAmount = BigInt(
        //     Number(adaAmount) * Math.pow(10, 6)
        // );
        // console.log(
        //     `Transferring: ${adaAmount} ada tokens (${adjustedAmount} base units)`
        // );

        const lovelace = toLovelace(adaAmount);

        const tx = new Transaction({ initiator: this.wallet })
            .sendLovelace(
                recipient,
                lovelace.toString()
            );

        const unsignedTx = await tx.build();
        const signedTx = this.wallet.signTx(unsignedTx);
        const txHash = await this.wallet.submitTx(signedTx);

        return txHash;
    }
}

const toLovelace = (amount: string | number): BigNumber => {
    const lovelace = new BigNumber(amount).times("1000000");
    return lovelace;
};


export const initWalletProvider = async (runtime: IAgentRuntime) => {
    const mnemonic = runtime.getSetting("CARDANO_PRIVATE_KEY");
    let mnemonics: string[];
    if (!mnemonic) {
        throw new Error("CARDANO_PRIVATE_KEY is missing");
    } else {
        mnemonics = mnemonic.split(" ");
        if (mnemonics.length < 2) {
            throw new Error("CARDANO_PRIVATE_KEY seems invalid");
        }
    }
    const rpcUrl =
        runtime.getSetting("CARDANO_RPC_URL") || PROVIDER_CONFIG.MAINNET_RPC;

    const network = runtime.getSetting("CARDANO_NETWORK") as MaestroSupportedNetworks;


    const maestro = runtime.getSetting("CARDANO_MAESTRO_APIKEY") || "";

    const blockchainProvider = new MaestroProvider({
        network: network,
        apiKey: maestro, // Get yours by visiting https://docs.gomaestro.org/docs/Getting-started/Sign-up-login.
        turboSubmit: false // Read about paid turbo transaction submission feature at https://docs.gomaestro.org/docs/Dapp%20Platform/Turbo%20Transaction.
    });

    const wallet = new MeshWallet({
        networkId: network == 'Mainnet' ? 1 : 0, // 0: testnet, 1: mainnet
        fetcher: blockchainProvider,
        submitter: blockchainProvider,
        key: {
            type: 'mnemonic',
            words: mnemonics,
        },
    });


    return new WalletProvider(wallet, runtime.cacheManager);
};

export const nativeWalletProvider: Provider = {
    async get(
        runtime: IAgentRuntime,
        message: Memory,
        state?: State
    ): Promise<string | null> {
        try {
            const walletProvider = await initWalletProvider(runtime);
            return await walletProvider.getFormattedPortfolio(runtime);
        } catch (error) {
            console.error(
                `Error in ${PROVIDER_CONFIG.CHAIN_NAME_IN_DEXSCREENER.toUpperCase()} wallet provider:`,
                error
            );
            return null;
        }
    },
};
