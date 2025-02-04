import {
  elizaLogger,
  composeContext,
  generateObject,
  ModelClass,
  type IAgentRuntime,
  type Memory,
  type State,
  type HandlerCallback,
  Content,
} from "@elizaos/core";
import { Address, internal, SendMode, toNano } from "@ton/core";
import { Builder } from "@ton/ton";
import { z } from "zod";
import { initWalletProvider, nativeWalletProvider, WalletProvider } from "../providers/wallet";
import { sanitizeTonAddress, waitSeqno } from "../utils/util";

export interface SingleTransferContent extends Content {
  type: "ton" | "token" | "nft";
  recipientAddress: string;
  amount?: string;
  tokenId?: string;
  metadata?: string;
}

export interface BatchTransferContent extends Content {
  transfers: SingleTransferContent[];
  batchSignature: boolean;
}

// Schema for each transfer item in the batch.
const transferItemSchema = z
  .object({
    type: z.enum(["ton", "token", "nft"]),
    recipientAddress: z.string().nonempty("Recipient address is required"),
    amount: z.string().optional(),
    tokenId: z.string().optional(),
    metadata: z.string().optional(),
  })
  // TON transfers require an amount.
  .refine((data) => (data.type === "ton" ? !!data.amount : true), {
    message: "Amount is required for TON transfers",
    path: ["amount"],
  })
  // Token and NFT transfers require a tokenId.
  .refine((data) => (data.type === "token" || data.type === "nft" ? !!data.tokenId : true), {
    message: "tokenId is required for token and NFT transfers",
    path: ["tokenId"],
  })
  // Token transfers also require an amount.
  .refine((data) => (data.type === "token" ? !!data.amount : true), {
    message: "Amount is required for token transfers",
    path: ["amount"],
  });

// Schema for a batch transfer request.
const batchTransferSchema = z.object({
  transfers: z.array(transferItemSchema).min(1, "At least one transfer must be provided"),
  batchSignature: z.boolean().optional(),
});

const batchTransferTemplate = `Respond with a JSON markdown block containing the properties:
{
  "transfers": [
    {
      "type": "<ton|token|nft>",
      "recipientAddress": "<Recipient's TON address>",
      "amount": "<Transfer amount as string (required for ton and token transfers)>",
      "tokenId": "<Token contract address or NFT identifier (required for token and nft transfers)>",
      "metadata": "<Optional metadata if applicable>"
    }
  ],
  "batchSignature": "<Optional boolean flag indicating batch signing>"
}
{{recentMessages}}

Extract and output only these values.`;

type TransferItem = z.infer<typeof transferItemSchema>;

function isBatchTransferContent(content: Content): content is BatchTransferContent {
  return (
    Array.isArray(content.transfers) &&
    content.transfers.every((transfer) => transferItemSchema.safeParse(transfer).success) &&
    typeof content.batchSignature === "boolean"
  );
}

/**
 * BatchTransferAction encapsulates the core logic for creating a batch transfer which can include
 * TON coins, fungible tokens (e.g., Jettons), and NFTs. Each transfer item is processed individually,
 * and any errors are recorded per item.
 */
export class BatchTransferAction {
  private walletProvider: WalletProvider;
  constructor(walletProvider: WalletProvider) {
    this.walletProvider = walletProvider;
  }

  /**
   * Build a TON transfer message.
   */
  private buildTonTransfer(item: TransferItem): { message: any; report: any } {
    const message = internal({
      to: Address.parse(item.recipientAddress),
      value: toNano(item.amount!),
      bounce: true,
      body: "",
    });
    return {
      message,
      report: {
        type: item.type,
        recipientAddress: item.recipientAddress,
        amount: item.amount,
        status: "pending",
      },
    };
  }

  /**
   * Build a token transfer message.
   */
  private buildTokenTransfer(item: TransferItem): { message: any; report: any } {
    const forwardPayload = new Builder()
      .storeUint(0, 32) // Using 0 opcode for a comment or payload placeholder.
      .storeBuffer(Buffer.from(item.metadata || "", "utf-8"))
      .endCell();

    const tokenTransferBody = new Builder()
      .storeUint(0x0f8a7ea5, 32) // Opcode for token transfer (e.g., Jetton)
      .storeUint(0, 64) // Query id placeholder
      .storeCoins(toNano(item.amount!))
      .storeAddress(Address.parse(item.recipientAddress))
      .storeAddress(Address.parse(item.recipientAddress)) // Response destination (can be custom)
      .storeBit(0) // No custom payload flag
      .storeCoins(toNano("0.02")) // Forward amount for notification message
      .storeBit(1) // Indicates forwardPayload is referenced
      .storeRef(forwardPayload)
      .endCell();

    const message = internal({
      to: Address.parse(item.tokenId!),
      value: toNano("0.1"), // Fixed fee for token transfers; may be adjusted as needed.
      bounce: true,
      body: tokenTransferBody,
    });

    return {
      message,
      report: {
        type: item.type,
        recipientAddress: item.recipientAddress,
        tokenId: item.tokenId,
        amount: item.amount,
        status: "pending",
      },
    };
  }

  /**
   * Build an NFT transfer message.
   */
  private buildNftTransfer(item: TransferItem): { message: any; report: any } {
    const nftTransferBody = new Builder()
      .storeUint(3, 32) // Opcode for transferring NFT ownership
      .storeUint(0, 64) // Query id placeholder
      .storeAddress(Address.parse(item.recipientAddress))
      .endCell();

    const message = internal({
      to: Address.parse(item.tokenId!),
      value: toNano("0.05"), // Fixed fee for NFT transfers; may be adjusted.
      bounce: true,
      body: nftTransferBody,
    });

    return {
      message,
      report: {
        type: item.type,
        recipientAddress: item.recipientAddress,
        tokenId: item.tokenId,
        status: "pending",
      },
    };
  }

  /**
   * Creates a batch transfer based on an array of transfer items.
   * Each item is processed with a try/catch inside the for loop to ensure that individual errors
   * do not abort the entire batch.
   *
   * @param params - The batch transfer input parameters.
   * @returns An object with a detailed report for each transfer.
   */
  async createBatchTransfer(params: BatchTransferContent): Promise<any> {
    const { transfers, batchSignature } = params;
    const transferReports: any[] = [];
    const messages = [];

    // Process each transfer item individually through a try/catch block.
    for (const item of transfers) {
      let result: { message?: any; report: any };
      try {
        if (item.type === "ton") {
            const recipientAddress = sanitizeTonAddress(item.recipientAddress);
            if(!recipientAddress) {
                throw new Error(`Invalid recipient address: ${item.recipientAddress}`);
            }
            item.recipientAddress = recipientAddress;
            result = this.buildTonTransfer(item);
        } else if (item.type === "token") {
            const recipientAddress = sanitizeTonAddress(item.recipientAddress);
            if(!recipientAddress) {
                throw new Error(`Invalid recipient address: ${item.recipientAddress}`);
            }
            item.recipientAddress = recipientAddress;
            const tokenAddress = sanitizeTonAddress(item.tokenId);
            if(!tokenAddress) {
                throw new Error(`Invalid token address: ${item.tokenId}`);
            }
            item.tokenId = tokenAddress;
            result = this.buildTokenTransfer(item);
        } else if (item.type === "nft") {
            const recipientAddress = sanitizeTonAddress(item.recipientAddress);
            if(!recipientAddress) {
                throw new Error(`Invalid recipient address: ${item.recipientAddress}`);
            }
            item.recipientAddress = recipientAddress;
            const tokenAddress = sanitizeTonAddress(item.tokenId);
            if(!tokenAddress) {
                throw new Error(`Invalid token address: ${item.tokenId}`);
            }
            item.tokenId = tokenAddress;
            result = this.buildNftTransfer(item);
        } else {
          throw new Error(`Unsupported transfer type: ${item.type}`);
        }
      } catch (error: any) {
        result = {
          report: {
            type: item.type,
            recipientAddress: item.recipientAddress,
            amount: item.amount,
            tokenId: item.tokenId,
            status: "failure",
            error: error.message,
          },
        };
      }
      transferReports.push(result.report);
      if (result.message) {
        messages.push(result.message);
      }
    }

    if (messages.length === 0) {
      return {
        transfersReport: transferReports,
        error: "No valid transfers to process",
        message: "Batch transfer failed",
      };
    }

    try {
      // Open the wallet contract and fetch the current sequence number.
      const walletContract = this.walletProvider.getWalletClient().open(this.walletProvider.wallet);
      const seqno = await walletContract.getSeqno();

      // Create a batch transfer containing all valid messages.
      const transfer = await walletContract.createTransfer({
        seqno,
        secretKey: this.walletProvider.keypair.secretKey,
        messages,
        sendMode: SendMode.IGNORE_ERRORS + SendMode.PAY_GAS_SEPARATELY,
      });

      // Send the transfer and wait until it is processed.
      await walletContract.send(transfer);
      await waitSeqno(seqno, this.walletProvider.wallet);

      // Update reports for successfully processed transfers.
      for (const report of transferReports) {
        if (report.status === "pending") {
          report.status = "success";
        }
      }

      return {
        transfersReport: transferReports,
        batchSignature: batchSignature || false,
        message: "Batch transfer processed successfully",
      };
    } catch (error: any) {
      // On error, mark any pending transfers as failures.
      for (const report of transferReports) {
        if (report.status === "pending") {
          report.status = "failure";
          report.error = error.message;
        }
      }
      elizaLogger.error("Error during batch transfer:", error);
      return {
        transfersReport: transferReports,
        message: "Batch transfer encountered errors",
        error: error.message,
      };
    }
  }
}


const buildBatchTransferDetails = async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
): Promise<BatchTransferContent> => {
    const walletInfo = await nativeWalletProvider.get(runtime, message, state);
    state.walletInfo = walletInfo;

    // Initialize or update state
    let currentState = state;
    if (!currentState) {
        currentState = (await runtime.composeState(message)) as State;
    } else {
        currentState = await runtime.updateRecentMessageState(currentState);
    }


    // Compose transfer context
    const batchTransferContext = composeContext({
        state,
        template: batchTransferTemplate,
    });

    // Generate transfer content with the schema
    const content = await generateObject({
        runtime,
        context: batchTransferContext,
        schema: batchTransferSchema,
        modelClass: ModelClass.SMALL,
    });

    let batchTransferContent: BatchTransferContent = content.object as BatchTransferContent;

    if (batchTransferContent === undefined) {
        batchTransferContent = content as unknown as BatchTransferContent;
    }

    return batchTransferContent;
};

export default {
  name: "BATCH_TRANSFER",
  similes: ["BATCH_ASSET_TRANSFER", "MULTI_ASSET_TRANSFER"],
  description:
    "Creates a unified batch transfer for TON coins, tokens (e.g., Jettons), and NFTs. " +
    "Supports flexible input parameters including recipient addresses, amounts, token identifiers, and optional metadata. " +
    "Returns a detailed report summarizing the outcome for each transfer.",
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    options: any,
    callback?: HandlerCallback
  ) => {
    elizaLogger.log("Starting BATCH_TRANSFER handler...");

    const details = await buildBatchTransferDetails(runtime, message, state);
    if(!isBatchTransferContent(details)) {
        console.error("Invalid content for BATCH_TRANSFER action.");
        if (callback) {
            callback({
                text: "Unable to process transfer request. Invalid content provided.",
                content: { error: "Invalid transfer content" },
            });
        }
        return false;
    }
    try {

      const walletProvider = await initWalletProvider(runtime);
      const batchTransferAction = new BatchTransferAction(walletProvider);
      const result = await batchTransferAction.createBatchTransfer(details);
      if (callback) {
        callback({
          text: `Batch transfer processed successfully`,
          content: result,
        });
      }
    } catch (error: any) {
      elizaLogger.error("Error in BATCH_TRANSFER handler:", error);
      if (callback) {
        callback({
          text: `Error in BATCH_TRANSFER: ${error.message}`,
          content: { error: error.message },
        });
      }
    }
    return true;
  },
  template: batchTransferTemplate,
  validate: async (_runtime: IAgentRuntime) => true,
  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          transfers: [
            {
              type: "ton",
              recipientAddress: "EQRecipientTonAddressExample",
              amount: "1",
            },
            {
              type: "token",
              recipientAddress: "EQRecipientForTokenExample",
              amount: "100",
              tokenId: "EQTokenContractAddressExample",
              metadata: "Jetton transfer",
            },
            {
              type: "nft",
              recipientAddress: "EQRecipientForNFTExample",
              tokenId: "EQNFTIdentifierExample",
              metadata: "NFT transfer",
            },
          ],
          batchSignature: true,
          action: "BATCH_TRANSFER",
        },
      },
      {
        user: "{{user1}}",
        content: {
          text: "Batch transfer processed successfully",
        },
      },
    ],
  ],
}; 