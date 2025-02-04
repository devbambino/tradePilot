import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import type { Account } from "viem";

import { WalletProvider } from "../providers/wallet";
import { seiDevnet } from "viem/chains";
import { StakeAction } from "../actions/stake";

// Mock the ICacheManager
const mockCacheManager = {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn(),
};

describe("Stake Action", () => {
    let wp: WalletProvider;

    beforeEach(async () => {
        vi.clearAllMocks();
        mockCacheManager.get.mockResolvedValue(null);

        const pk = generatePrivateKey();
        const chain = seiDevnet
        const chainWithName = {name: "devnet", chain: chain}
        wp = new WalletProvider(pk, mockCacheManager as any, chainWithName);
    });

    afterEach(() => {
        vi.clearAllTimers();
    });

    describe("Constructor", () => {
        it("should initialize with wallet provider", () => {
            const ta = new StakeAction(wp);

            expect(ta).toBeDefined();
        });
    });
    describe("Stake", () => {
        let ta: StakeAction;
        let validator: Account;

        beforeEach(() => {
            ta = new StakeAction(wp);
            validator = privateKeyToAccount(generatePrivateKey());
        });

        it("throws if not enough gas", async () => {
            await expect(
                ta.stake({
                    validatorAddress: validator.address,
                    amount: "1",
                })
            ).rejects.toThrow(
                "Staking delegation failed: The total cost (gas * gas fee + value) of executing this transaction exceeds the balance of the account."
            );
        });
    });
});
