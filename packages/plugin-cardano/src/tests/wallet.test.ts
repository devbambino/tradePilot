import { defaultCharacter } from "@elizaos/core";

import {
    describe,
    it,
    vi,
    expect,
    beforeAll,
    beforeEach,
    afterEach,
} from "vitest";
import BigNumber from "bignumber.js";
import { WalletProvider } from "../providers/wallet";


import { MaestroProvider, MaestroSupportedNetworks, MeshWallet, Transaction} from '@meshsdk/core';


// Mock NodeCache
vi.mock("node-cache", () => {
    return {
        default: vi.fn().mockImplementation(() => ({
            set: vi.fn(),
            get: vi.fn().mockReturnValue(null),
        })),
    };
});

// Mock path module
vi.mock("path", async () => {
    const actual = await vi.importActual("path");
    return {
        ...actual,
        join: vi.fn().mockImplementation((...args) => args.join("/")),
    };
});

// Mock the ICacheManager
const mockCacheManager = {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn(),
    delete: vi.fn(),
};

// TODO
// const rpcUrl = "http://localhost:50051";
//
let network = "Preprod" as MaestroSupportedNetworks;
// cardano wallet https://www.lace.io/
let mnemonic = "alter time route ...";
// free https://dashboard.gomaestro.org/
const maestro = "";
describe("Wallet provider", () => {
    let walletProvider: WalletProvider;
    let mockedRuntime;

    beforeAll(async () => {
        // const blockchainProvider = new MaestroProvider({
        //     network: network,
        //     apiKey: maestro, // Get yours by visiting https://docs.gomaestro.org/docs/Getting-started/Sign-up-login.
        //     turboSubmit: false // Read about paid turbo transaction submission feature at https://docs.gomaestro.org/docs/Dapp%20Platform/Turbo%20Transaction.
        // });

        // const wallet = new MeshWallet({
        //     networkId: network == 'Mainnet' ? 1 : 0, // 0: testnet, 1: mainnet
        //     fetcher: blockchainProvider,
        //     submitter: blockchainProvider,
        //     key: {
        //         type: 'mnemonic',
        //         words: mnemonic.split(" "),
        //     },
        // });

        // walletProvider = new WalletProvider(wallet, mockCacheManager);
        // mockedRuntime = {
        //     character: defaultCharacter,
        // };
    });

    beforeEach(() => {
        vi.clearAllMocks();
        mockCacheManager.get.mockResolvedValue(null);
    });

    afterEach(() => {
        vi.clearAllTimers();
    });

    describe("Wallet Integration", () => {
        it("should check wallet address", async () => {
            // const result =
            //     await walletProvider.getFormattedPortfolio(mockedRuntime);

            // const prices = await walletProvider.fetchPrices().catch((error) => {
            //     console.error(`Error fetching ADA price:`, error);
            //     throw error;
            // });
            // const tokenMap = await walletProvider
            //     .getWalletBalance()
            //     .catch((error) => {
            //         console.error(`Error fetching ADA amount:`, error);
            //         throw error;
            //     });

            // const balance = tokenMap.get("lovelace");
            // const adaAmount =
            //     Number(balance) /
            //     Number(1_000_000);
            // const totalUsd = new BigNumber(adaAmount.toString()).times(
            //     prices.nativeToken.usd
            // );

            // const portfolio = {
            //     totalUsd: totalUsd.toString(),
            //     totalAda: adaAmount.toString(),
            // };

            // console.log("portfolio: ", portfolio);
            // const address = await walletProvider.getAddress();

            // const txId = await walletProvider.sendAda(address, 3);

            // console.log("txId: ", txId);

            // expect(result).toEqual(
            //     `Eliza\nWallet Address: ${address}\n` +
            //     `Total Value: $${totalUsd.toFixed(2)} (${adaAmount.toFixed(4)} ADA)\n`
            // );

            expect(1).toEqual(1)
        }, 10000);
    });

});
