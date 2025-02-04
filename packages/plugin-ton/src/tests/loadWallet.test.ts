import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import loadWalletAction from "../actions/loadWallet";
import { WalletProvider } from "../providers/wallet";

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

describe("LOAD_TON_WALLET Action (File Operations)", () => {
  let oldCwd: string;
  let tempDir: string;
  let backupFile: string;
  let generatedWalletAddress: string;

  beforeAll(() => {
    // Switch to a temporary directory to isolate file operations.
    oldCwd = process.cwd();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "wallet-test-"));
    process.chdir(tempDir);
  });

  afterAll(() => {
    process.chdir(oldCwd);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  beforeEach(async () => {
    // Create a backup file by generating a new wallet.
    const runtimeForGenerate = {
      getSetting: (key: string) => {
        if (key === "TON_WALLET_EXPORT_PASSWORD") return "testpassword";
        if (key === "TON_RPC_URL")
          return "https://toncenter.com/api/v2/jsonRPC";
        return "";
      },
    } as any;

    const { walletProvider } = await WalletProvider.generateNew(
      runtimeForGenerate,
      "testpassword"
    );
    generatedWalletAddress = walletProvider.getAddress();

    const backupDir = path.join(process.cwd(), "ton_wallet_backups");
    const files = fs.readdirSync(backupDir);
    // Assume the most recent file is the one just created.
    backupFile = path.join(backupDir, files[files.length - 1]);
  });

  it("should load an existing wallet from a backup file and verify backup creation", async () => {
    // Verify that the backup file was created.
    expect(fs.existsSync(backupFile)).toBe(true);
    const backupContent = fs.readFileSync(backupFile, "utf-8");
    // The encrypted backup is in format "iv:encryptedData" (iv is 16 bytes in hex = 32 characters)
    expect(backupContent).toMatch(/^[a-f0-9]{32}:[a-f0-9]+$/i);

    // Set up runtime so that the backup file path is passed via settings.
    const runtime = {
      getSetting: (key: string) => {
        if (key === "TON_WALLET_EXPORT_PASSWORD") return "testpassword";
        if (key === "TON_WALLET_BACKUP_FILE") return backupFile;
        if (key === "TON_RPC_URL")
          return "https://toncenter.com/api/v2/jsonRPC";
        return "";
      },
    } as any;

    // Provide the backup file path via message content.
    const message = {
      getContent: () => ({ filePath: backupFile }),
    } as any;
    const state = {} as any;
    const callback = vi.fn();

    const result = await loadWalletAction.handler(
      runtime,
      message,
      state,
      {},
      callback
    );
    expect(result).toBe(true);
    expect(callback).toHaveBeenCalled();
    
    const callbackArg = callback.mock.calls[0][0];
    // Verify that the wallet address returned during load matches the one generated earlier.
    expect(callbackArg.text).toContain(generatedWalletAddress);
  });

  it("should fail if no wallet backup file path is provided", async () => {
    const runtime = {
        getSetting: (key: string) => {
            if (key === "TON_WALLET_EXPORT_PASSWORD") return "testpassword";
            if (key === "TON_RPC_URL")
              return "https://toncenter.com/api/v2/jsonRPC";
            return "";
          },
    } as any;
    const message = {
      content: {},
    } as any;
    const state = {} as any;
    const callback = vi.fn();

    const result = await loadWalletAction.handler(
      runtime,
      message,
      state,
      {},
      callback
    );
    expect(result).toBe(false);
    const callbackArg = callback.mock.calls[0][0];
    expect(callbackArg.text).toContain("No wallet backup file path provided");
  });
}); 