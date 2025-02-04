import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import createWalletAction from "../actions/createWallet";
import { WalletProvider } from "../providers/wallet";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

describe("CREATE_TON_WALLET Action", () => {
  it("should create a new wallet successfully", async () => {
    // Stub WalletProvider.generateNew to return a fake wallet provider and mnemonic
    const fakeWalletProvider = {
      getAddress: () => "FakeAddress123",
    };
    const fakeMnemonic = ["word1", "word2", "word3"];
    const generateNewSpy = vi
      .spyOn(WalletProvider, "generateNew")
      .mockResolvedValue({
        walletProvider: fakeWalletProvider as unknown as WalletProvider,
        mnemonic: fakeMnemonic,
      });

    // Create a fake runtime that returns a valid export password
    const runtime = {
      getSetting: vi.fn((key: string) => {
        if (key === "TON_WALLET_EXPORT_PASSWORD") return "testpassword";
        return "";
      }),
    } as any;

    // Create a fake message and state
    const message = {
      getContent: () => ({}),
    } as any;
    const state = {} as any;
    const callback = vi.fn();

    const result = await createWalletAction.handler(runtime, message, state, {}, callback);
    expect(result).toBe(true);
    expect(callback).toHaveBeenCalled();

    // Verify callback response
    const callbackArg = callback.mock.calls[0][0];
    expect(callbackArg.text).toContain("FakeAddress123");
    expect(callbackArg.text).toContain("mnemonic");

    generateNewSpy.mockRestore();
  });

  it("should fail if TON_WALLET_EXPORT_PASSWORD is missing", async () => {
    // Create a fake runtime without the export password
    const runtime = {
      getSetting: vi.fn(() => null),
    } as any;
    const message = { getContent: () => ({}) } as any;
    const state = {} as any;
    const callback = vi.fn();

    const result = await createWalletAction.handler(runtime, message, state, {}, callback);
    expect(result).toBe(false);
    const callbackArg = callback.mock.calls[0][0];
    expect(callbackArg.text).toContain("Missing TON_WALLET_EXPORT_PASSWORD");
  });
});

describe("CREATE_TON_WALLET Action (File Operations)", () => {
  let oldCwd: string;
  let tempDir: string;

  beforeAll(() => {
    // Switch to a temporary directory so we don't affect real data.
    oldCwd = process.cwd();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "wallet-test-"));
    process.chdir(tempDir);
  });

  afterAll(() => {
    // Restore original working directory and clean up temp folder.
    process.chdir(oldCwd);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("should create a new wallet and write a backup file", async () => {
    const runtime = {
      getSetting: (key: string) => {
        if (key === "TON_WALLET_EXPORT_PASSWORD") return "testpassword";
        if (key === "TON_RPC_URL") return "https://toncenter.com/api/v2/jsonRPC";
        return "";
      },
    } as any;

    const message = {
      getContent: () => ({}),
    } as any;
    const state = {} as any;
    const callback = vi.fn();

    const result = await createWalletAction.handler(runtime, message, state, {}, callback);
    expect(result).toBe(true);
    expect(callback).toHaveBeenCalled();

    // Verify the backup file is created in the "ton_wallet_backups" directory.
    const backupDir = path.join(process.cwd(), "ton_wallet_backups");
    expect(fs.existsSync(backupDir)).toBe(true);

    const files = fs.readdirSync(backupDir);
    expect(files.length).toBeGreaterThan(0);

    const backupFilePath = path.join(backupDir, files[0]);
    const backupContent = fs.readFileSync(backupFilePath, "utf-8");

    // The encrypted backup is expected to follow the format "iv:encryptedData"
    // where the IV is 16 bytes in hexadecimal (32 hex characters).
    expect(backupContent).toMatch(/^[a-f0-9]{32}:[a-f0-9]+$/i);
  });
}); 