import { SUPPORTED_NETWORKS, SUPPORTED_TOKENS } from "./constants.ts";

function getAllowedNetworks() {
  return SUPPORTED_NETWORKS.map(network => `readonly ${network}: "${network}";`).join("\n\t");
}

function getAllowedAssets() {
  return SUPPORTED_TOKENS.map(token => `readonly ${token}: "${token}";`).join("\n\t");
}

export const transferTemplate = `
Extract the following details from the most recent message for processing token transfer using the Okto SDK:
- **receivingAddress** (string): The address to transfer the tokens to.
- **transferAmount** (number): The amount to transfer to the address. This can be a decimal number as well.
- **assetId** (string): The asset ID to transfer (e.g., ETH, BTC).
    static assets: {
       ${getAllowedAssets()}
    };
- **network** (string): The blockchain network to use. Allowed values are:
    static networks: {
       ${getAllowedNetworks()}
    };

Only Provide the details in the following JSON format, focusing exclusively on the most recent message:

{
    "receivingAddress": "<receiving_address>",
    "transferAmount": <amount>,
    "assetId": "<asset_id>",
    "network": "<network>"
}

Here are the recent user messages for context (focus on the last message):
{{recentMessages}}
`;

export const nftTransferTemplate = `
Extract the following details from the most recent message for processing NFT transfer using the Okto SDK:
- **recipientWalletAddress** (string): The wallet address to which the NFT should be transferred.
- **nftId** (string): The unique identifier of the NFT.
- **collectionAddress** (string): The contract address of the NFT collection.
- **amount** (number): The quantity of NFTs to transfer (usually 1 for ERC721, but may vary for ERC1155).
- **nftType** (string): Either 'ERC721' or 'ERC1155'.
- **caip2Id** (string): The CAIP-2 identifier for the blockchain network (e.g., "eip155:1" for Ethereum mainnet).

Only provide the details in the following JSON format, focusing exclusively on the most recent message:

{
    "recipientWalletAddress": "<recipient_wallet_address>",
    "nftId": "<nft_id>",
    "collectionAddress": "<collection_address>",
    "amount": <amount>,
    "nftType": "<ERC721 or ERC1155>",
    "caip2Id": "<caip2_id>"
}

Here are the recent user messages for context (focus on the last message):
{{recentMessages}}
`;