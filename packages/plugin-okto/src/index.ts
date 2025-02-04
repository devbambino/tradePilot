import {
  Plugin,
  Action,
  elizaLogger
} from "@elizaos/core";
import { settings } from "@elizaos/core";
import { OktoClient, OktoClientConfig } from '@okto_web3/core-js-sdk';
import { getPortfolio, getAccount, getChains, getNftCollections, getOrdersHistory, getPortfolioNFT, getTokens } from "@okto_web3/core-js-sdk/explorer";
import { getGoogleIdToken } from "./google.ts";
import { GetSupportedNetworksResponseData, Order, UserNFTBalance, UserPortfolioData } from "@okto_web3/core-js-sdk/types";
import { tokenTransfer, nftTransfer, evmRawTransaction } from "@okto_web3/core-js-sdk/userop";
import { NFTTransferIntentParams, RawTransactionIntentParams, TokenTransferIntentParams, Token, Wallet } from "./types.ts";
import { getPortfolioAction } from "./actions/getPortfolioAction.ts";
import { getAccountAction } from "./actions/getAccountAction.ts";
import { getChainAction } from "./actions/getChainAction.ts";
import { getNftCollectionsAction } from "./actions/getNftCollectionsAction.ts";
import { getOrdersHistoryAction } from "./actions/getOrdersHistoryAction.ts";
import { getPortfolioNftAction } from "./actions/getPortfolioNftAction.ts";
import { getTokensAction } from "./actions/getTokensAction.ts";
import { transferTokensAction } from "./actions/transferTokensAction.ts";
import { nftTransferAction } from "./actions/nftTransferAction.ts";

export class OktoPlugin implements Plugin {
  readonly name: string = "okto";
  readonly description: string = "Interface web3 with Okto API";
  public oktoClient: OktoClient;

  constructor() {
    const environment = settings.OKTO_ENVIRONMENT || "sandbox";
    const vendorPrivKey = settings.OKTO_VENDOR_PRIVATE_KEY;
    if (!vendorPrivKey) {
      throw new Error("OKTO_VENDOR_PRIVATE_KEY is required for OktoPlugin and is not set");
    }
    const vendorSWA = settings.OKTO_VENDOR_SWA;
    if (!vendorSWA) {
      throw new Error("OKTO_VENDOR_SWA is required for OktoPlugin and is not set");
    }
    const googleClientId = settings.GOOGLE_CLIENT_ID;
    if (!googleClientId) {
      throw new Error("GOOGLE_CLIENT_ID is required for OktoPlugin and is not set");
    }
    const googleClientSecret = settings.GOOGLE_CLIENT_SECRET;
    if (!googleClientSecret) {
      throw new Error("GOOGLE_CLIENT_SECRET is required for OktoPlugin and is not set");
    }

    const clientConfig: OktoClientConfig = {
      environment: environment as any,
      vendorPrivKey: vendorPrivKey as any,
      vendorSWA: vendorSWA as any,
    }
    this.oktoClient = new OktoClient(clientConfig);
    
    getGoogleIdToken(googleClientId, googleClientSecret).then(async (tokens: any) => {
      try {
        const user = await this.oktoClient.loginUsingOAuth({
          idToken: tokens.id_token,
          provider: 'google',
        });
        elizaLogger.info("Okto Authenticateion Success", JSON.stringify(user, null, 2));
      } catch (error: any) {
        elizaLogger.error("Okto Authenticateion Error", error.message);
      }
    })
  }

  actions: Action[] = [
    getPortfolioAction(this),
    getAccountAction(this),
    getChainAction(this),
    getNftCollectionsAction(this),
    getOrdersHistoryAction(this),
    getPortfolioNftAction(this),
    getTokensAction(this),
    transferTokensAction(this),
    nftTransferAction(this),
  ];

  async getPortfolio(): Promise<UserPortfolioData> {
    return await getPortfolio(this.oktoClient);
  }

  async getAccount(): Promise<Wallet[]> {
    return await getAccount(this.oktoClient);
  }

  async getChains(): Promise<GetSupportedNetworksResponseData[]> {
    return await getChains(this.oktoClient);
  }

  async getNftCollections(): Promise<Order[]> {
    return await getNftCollections(this.oktoClient);
  }

  async getOrdersHistory(): Promise<Order[]> {
    return await getOrdersHistory(this.oktoClient);
  }

  async getPortfolioNFT(): Promise<UserNFTBalance[]> {
    return await getPortfolioNFT(this.oktoClient);
  }

  async getTokens(): Promise<Token[]> {
    return await getTokens(this.oktoClient);
  }

  async tokenTransfer(params: TokenTransferIntentParams): Promise<string> {
    const userOp = await tokenTransfer(this.oktoClient, params);
    const signedUserOp = await this.oktoClient.signUserOp(userOp);
    const tx = await this.oktoClient.executeUserOp(signedUserOp);
    return tx;
  }

  async nftTransfer(params: NFTTransferIntentParams): Promise<string> {
    const userOp = await nftTransfer(this.oktoClient, params);
    const signedUserOp = await this.oktoClient.signUserOp(userOp);
    const tx = await this.oktoClient.executeUserOp(signedUserOp);
    return tx;
  }

  async evmRawTransaction(params: RawTransactionIntentParams): Promise<string> {
    const userOp = await evmRawTransaction(this.oktoClient, params);
    const signedUserOp = await this.oktoClient.signUserOp(userOp);
    const tx = await this.oktoClient.executeUserOp(signedUserOp);
    return tx;
  }

}
export default new OktoPlugin();
