import { IAgentRuntime, Memory, Provider, State } from "@elizaos/core";
import * as btc from "@scure/btc-signer";
import { secp256k1 } from "@noble/curves/secp256k1";
import { hex } from "@scure/base";
import mempoolJS from "@mempool/mempool.js";
import { MempoolReturn } from "@mempool/mempool.js/lib/interfaces";
import { IAccount } from "../types";

export class WalletProvider {
    mempool: MempoolReturn;
    account: IAccount;

    constructor(privateKey: string) {
        this.account = this.getAccount(privateKey);
        this.mempool = mempoolJS({
            hostname: "mempool.space",
        });
    }

    getAccount(privateKey: string): IAccount {
        const privateKeyA = hex.decode(privateKey);
        const publicKey = secp256k1.getPublicKey(privateKeyA, true);
        const schnorrPublicKey = btc.utils.pubSchnorr(privateKeyA);
        const network = btc.NETWORK;

        const nestedSegwitAddress = btc.p2sh(
            btc.p2wpkh(publicKey, network),
            network
        ).address;

        const taprootAddress = btc.p2tr(
            schnorrPublicKey,
            undefined,
            network
        ).address;

        return {
            nestedSegwitAddress,
            taprootAddress,
            privateKey,
        };
    }

    getAddresses() {
        return {
            nestedSegwitAddress: this.account.nestedSegwitAddress,
            taprootAddress: this.account.taprootAddress,
        };
    }

    async getBalance() {
        const data = await this.mempool.bitcoin.addresses.getAddress({
            address: this.account.nestedSegwitAddress,
        });
        return data?.mempool_stats?.funded_txo_sum || 0;
    }

    async getTransactionHistory() {
        return await this.mempool.bitcoin.addresses.getAddressTxs({
            address: this.account.nestedSegwitAddress,
        });
    }

    async getTransactionStatus(txid: string) {
        return await this.mempool.bitcoin.transactions.getTxStatus({ txid });
    }

    async signPsbt(){}
}

const walletProvider: Provider = {
    get: async (
        runtime: IAgentRuntime,
        _message: Memory,
        _state?: State
    ): Promise<string | null> => {
        try {
            const BTC_PK = runtime.getSetting("BITCOIN_PRIVATE_KEY");
            const provider = new WalletProvider(BTC_PK);
            const balance = await provider.getBalance();
            const addresses = provider.getAddresses();

            return `Ordinals wallet => ${addresses.nestedSegwitAddress} / ${addresses.taprootAddress} | Balance: ${balance}`;
        } catch (error) {
            console.error("Error in wallet provider:", error);
            return null;
        }
    },
};

// Module exports
export { walletProvider };
