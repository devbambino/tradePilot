import {
    IAgentRuntime,
    ICacheManager,
    Memory,
    Provider,
    State,
} from "@elizaos/core";
import { fetchAccount, Mina, PrivateKey, PublicKey } from "o1js";

import BigNumber from "bignumber.js";
import NodeCache from "node-cache";
import * as path from "path";
import { getMinaNeworkCconfig, fetchMinaUsdtUrl, MINA_DECIMALS } from "../environment";
import { verifyWalletParams } from "../utils/verifyTools";
// Provider configuration
const PROVIDER_CONFIG = {
    MAX_RETRIES: 3,
    RETRY_DELAY: 2000,
};

interface WalletPortfolio {
    totalUsd: string;
    totalMina: string;
}

interface Prices {
    mina: { usd: string };
}

export class WalletProvider {
    privateKey: PrivateKey;
    publicKey: PublicKey;
    address: string;
    private cache: NodeCache;
    private cacheKey: string = "mina/wallet";

    constructor(
        privatekey: PrivateKey,
        // minaNet: ReturnType<typeof Mina.Network>,
        private cacheManager: ICacheManager
    ) {
        this.privateKey = privatekey;
        this.publicKey = this.privateKey.toPublicKey();
        this.address = this.publicKey.toBase58();
        this.cache = new NodeCache({ stdTTL: 300 }); // Cache TTL set to 5 minutes
    }

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
                    fetchMinaUsdtUrl
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

    async fetchPortfolioValue(): Promise<WalletPortfolio> {
        try {
            const cacheKey = `portfolio-${this.address}`;
            const cachedValue =
                await this.getCachedData<WalletPortfolio>(cacheKey);

            if (cachedValue) {
                console.log("Cache hit for fetchPortfolioValue", cachedValue);
                return cachedValue;
            }
            console.log("Cache miss for fetchPortfolioValue");

            const prices = await this.fetchPrices().catch((error) => {
                console.error("Error fetching MINA price:", error);
                throw error;
            });

            const senderAccount = await fetchAccount({ publicKey: this.publicKey });
            const accountDetails = senderAccount.account;
            const totalMina =  accountDetails?.balance.toString() || "0";
            const minaAmount = Number.parseInt(totalMina) / Math.pow(10, MINA_DECIMALS);
            console.log(
                `Using the fee payer account ${this.address} with nonce: ${
                    accountDetails?.nonce
                } and balance: ${minaAmount}.`
            );

            const totalUsd = new BigNumber(minaAmount).times(prices.mina.usd);
            const portfolio = {
                totalUsd: totalUsd.toString(),
                totalMina: minaAmount.toString(),
            };
            this.setCachedData(cacheKey, portfolio);
            console.log("Fetched portfolio:", portfolio);
            return portfolio;
        } catch (error) {
            console.error("Error fetching portfolio:", error);
            throw error;
        }
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

            const minaPriceData = await this.fetchPricesWithRetry().catch(
                (error) => {
                    console.error("Error fetching MINA price:", error);
                    throw error;
                }
            );

            const minaPrice = minaPriceData.data[0].last;
            const prices: Prices = {
                mina: { usd: minaPrice.toString() },
            };
            this.setCachedData(cacheKey, prices);
            return prices;
        } catch (error) {
            console.error("Error fetching prices:", error);
            throw error;
        }
    }

    formatPortfolio(runtime, portfolio: WalletPortfolio): string {
        let output = `${runtime.character.name}\n`;
        output += `Wallet Address: ${this.address}\n`;

        const totalUsdFormatted = new BigNumber(portfolio.totalUsd).toFixed(2);
        const totalMinaFormatted = new BigNumber(portfolio.totalMina).toFixed(4);

        output += `Total Value: $${totalUsdFormatted} (${totalMinaFormatted} Mina)\n`;

        return output;
    }

    async getFormattedPortfolio(runtime): Promise<string> {
        try {
            const portfolio = await this.fetchPortfolioValue();
            return this.formatPortfolio(runtime, portfolio);
        } catch (error) {
            console.error("Error generating portfolio report:", error);
            return "Unable to fetch wallet information. Please try again later.";
        }
    }

    async getBaseTXUrl(runtime): Promise<string> {
        const [minaNetName, minaRpcUrl, _] =  verifyWalletParams(runtime);
        if (minaRpcUrl.startsWith("http")) {
            return path.join(minaRpcUrl, "/tx");
        } else {
            const minaNet = getMinaNeworkCconfig(minaNetName);
            return minaNet.explorerTransactionUrl;
        }
    }
}

export function initWalletProvider(runtime: IAgentRuntime) {

    const [minaNetName, minaRpcUrl, privateKey] =  verifyWalletParams(runtime);

    if (minaRpcUrl.startsWith("http")) {
        const network = Mina.Network({
            mina: minaRpcUrl,
            archive: minaRpcUrl
        });

        const provider: WalletProvider = new WalletProvider(
            privateKey,
            runtime.cacheManager
        );

        Mina.setActiveInstance(network);

        return provider;
    }

    const minaNet = getMinaNeworkCconfig(minaNetName);
    const network = Mina.Network({
        mina: minaNet.baseUrl,
        archive: minaNet.archive
    });

    const provider = new WalletProvider(
        privateKey,
        runtime.cacheManager
    );

    Mina.setActiveInstance(network);

    return provider;
}

const walletProvider: Provider = {
    get: async (
        runtime: IAgentRuntime,
        _message: Memory,
        _state?: State
    ): Promise<string | null> => {
        try {
            const provider = initWalletProvider(runtime);
            return await provider.getFormattedPortfolio(runtime);
        } catch (error) {
            console.error("Error in wallet provider:", error);
            return null;
        }
    },
};

// Module exports
export { walletProvider };
