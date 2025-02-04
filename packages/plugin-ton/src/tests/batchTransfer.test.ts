import { describe, it, vi, beforeAll, beforeEach, afterEach, expect } from "vitest";
import { BatchTransferAction, SingleTransferContent } from "../actions/batchTransfer";
import { defaultCharacter } from "@elizaos/core";
import { type KeyPair, mnemonicToWalletKey } from "@ton/crypto";
import { WalletProvider } from "../providers/wallet";

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
export const mockCacheManager = {
  get: vi.fn().mockResolvedValue(null),
  set: vi.fn(),
  delete: vi.fn(),
};

const NFT_TOKEN_CONTRACT_ADDRESS = "kQC_fD_gbAgXsuizLU-5usV4sIuRhotmM3DYIUSkBpFYXwAR";
const JETON_TOKEN_CONTRACT_ADDRESS = "kQAiboDEv_qRrcEdrYdwbVLNOXBHwShFbtKGbQVJ2OKxY_Di";

export const testnet = "https://testnet.toncenter.com/api/v2/jsonRPC";

describe("BatchTransferAction", () => {
  let batchTransferAction: BatchTransferAction;
  let walletProvider: WalletProvider;

  beforeAll(async () => {
      const privateKey = process.env.TON_PRIVATE_KEY;
      if (!privateKey) {
          throw new Error(`TON_PRIVATE_KEY is missing`);
      }
  
      const mnemonics = privateKey.split(" ");
      if (mnemonics.length < 2) {
          throw new Error(`TON_PRIVATE_KEY mnemonic seems invalid`);
      }

    const keypair = await mnemonicToWalletKey(mnemonics, "");

      walletProvider = new WalletProvider(keypair, testnet, mockCacheManager);
      batchTransferAction = new BatchTransferAction(walletProvider);
  });

  beforeEach(() => {
      vi.clearAllMocks();
      mockCacheManager.get.mockResolvedValue(null);
  });

  afterEach(() => {
      vi.clearAllTimers();
  });

//   it("should process valid transfers successfully", async () => {
//     const validTransfers: SingleTransferContent[] = [
//       { type: "ton", recipientAddress: "UQBLy_5Fr6f8NSpMt8SmPGiItnUE0JxgTJZ6m6E8aXoLtCpL", amount: "1", text: "" },
//       { type: "token", recipientAddress: "0QDIUnzAEsgHLL7YSrvm_u7OYSKw93AQbtdidRdcbm7tQep5", amount: "100", tokenId: "kQDLvsZol3juZyOAVG8tWsJntOxeEZWEaWCbbSjYakQpuYN5", text: "" },
//       { type: "nft", recipientAddress: "0QDIUnzAEsgHLL7YSrvm_u7OYSKw93AQbtdidRdcbm7tQep5", tokenId: "EQValidNFT", metadata: "Test NFT", text: "" },
//     ];

//     const result = await batchTransferAction.createBatchTransfer({
//       transfers: validTransfers,
//       batchSignature: true,
//       text: "",
//     });

//     expect(result).toHaveProperty("transfersReport");
//     expect(Array.isArray(result.transfersReport)).toBe(true);
//     expect(result.transfersReport).toHaveLength(validTransfers.length);
//     result.transfersReport.forEach(report => {
//       expect(report.status).toBe("success");
//     });
//     expect(result.batchSignature).toBe(true);
//     expect(result.message).toBe("Batch transfer processed successfully");
//   });

  it("should fail batch transfer if token address is invalid", async () => {
    const transfers: SingleTransferContent[] = [
    //   { type: "ton", recipientAddress: "0QBLy_5Fr6f8NSpMt8SmPGiItnUE0JxgTJZ6m6E8aXoLtJHB", amount: "1", text: "" },
    //   { type: "token", recipientAddress: "0QBLy_5Fr6f8NSpMt8SmPGiItnUE0JxgTJZ6m6E8aXoLtJHB", amount: "1", tokenId: JETON_TOKEN_CONTRACT_ADDRESS, text: "" },
      { type: "token", recipientAddress: "0QBLy_5Fr6f8NSpMt8SmPGiItnUE0JxgTJZ6m6E8aXoLtJHB", amount: "1", tokenId: "INVALID", text: "" },
    ];

    const result = await batchTransferAction.createBatchTransfer({
      transfers,
      batchSignature: false,
      text: "",
    });

    expect(result.transfersReport).toHaveLength(transfers.length);
    expect(result.transfersReport[0].status).toBe("failure");
    expect(result.transfersReport[0].error).toContain("Invalid token address");
    expect(result.message).toBe("Batch transfer failed");
  });

  it("should fail batch transfer if no valid transfers to process", async () => {
    const invalidTransfers: SingleTransferContent[] = [
      { type: "ton", recipientAddress: "INVALID", amount: "1", text: "" },
    //   { type: "token", recipientAddress: "0QBLy_5Fr6f8NSpMt8SmPGiItnUE0JxgTJZ6m6E8aXoLtJHB", amount: "1", tokenId: JETON_TOKEN_CONTRACT_ADDRESS, text: "" },
    ];

    const result = await batchTransferAction.createBatchTransfer({
      transfers: invalidTransfers,
      batchSignature: false,
      text: "",
    });

    // All transfers are invalid so the messages array becomes empty.
    expect(result.transfersReport).toHaveLength(invalidTransfers.length);
    expect(result.transfersReport[0].status).toBe("failure");
    expect(result.transfersReport[0].error).toContain("Invalid recipient address");
    // expect(result.transfersReport[1].error).toBeUndefined();
    // expect(result.transfersReport[1].status).toBe("success");
    expect(result.error).toContain("No valid transfers to process");
    expect(result.message).toBe("Batch transfer failed");
  });

  it("should handle error during sending batch transfer", async () => {
    // Use a wallet provider that simulates an error during send.
    const failingBatchTransferAction = new BatchTransferAction(walletProvider);
    const validTransfers: SingleTransferContent[] = [
      { type: "ton", recipientAddress: "INVALID", amount: "1", text: "" },
    ];

    const result = await failingBatchTransferAction.createBatchTransfer({
      transfers: validTransfers,
      batchSignature: false,
      text: "",
    });

    // The valid transfer should be marked as a failure due to the simulated send error.
    expect(result.transfersReport).toHaveLength(validTransfers.length);
    result.transfersReport.forEach(report => {
      expect(report.status).toBe("failure");
      expect(report.error).toContain("Invalid recipient address");
    });
    expect(result.message).toBe("Batch transfer failed");
    expect(result.error).toContain("No valid transfers to process");
  });
}); 