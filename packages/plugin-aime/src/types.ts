import { z } from "zod";

// Define the NFT interface
export interface NFT {
    id?: number;
    user_id?: string;
    raw_data?: string;
    data_id?: string;
    character_id?: string;
    is_main?: boolean;
    data_key?: string;
    data_value?: string;
    data_type?: string;
    judgements?: {
        Pass?: number;
        Think?: string;
        Conflict?: number;
        Data_key?: string;
        Response?: string;
        Data_value?: string;
    };
    pinecone_id?: string;
    raw_data_pinecone_id?: string;
    nft_avatar_url?: string;
    nft_image_url?: string;
    nft_image_bg?: string;
    price_amount?: string;
    sig?: string;
    user_wallet?: string;
    activated?: boolean;
    tweet_id?: string;
    action_id?: string;
    created_at?: string;
    updated_at?: string;
    aime_address?: `0x${string}`;
    aime_token_id?: number;
    remark?: string;
    status?: string;
}

// Define Zod schema for API response validation
export const NFTResponseSchema = z.object({
    context: z.string(),
    nft_info: z.object({
        id: z.number().optional(),
        user_id: z.string().optional(),
        raw_data: z.string().optional(),
        data_id: z.string().optional(),
        character_id: z.string().optional(),
        is_main: z.boolean().optional(),
        data_key: z.string().optional(),
        data_value: z.string().optional(),
        data_type: z.string().optional(),
        judgements: z.object({
            Pass: z.number().optional(),
            Think: z.string().optional(),
            Conflict: z.number().optional(),
            Data_key: z.string().optional(),
            Response: z.string().optional(),
            Data_value: z.string().optional(),
        }).optional(),
        pinecone_id: z.string().optional(),
        raw_data_pinecone_id: z.string().optional(),
        nft_avatar_url: z.string().optional(),
        nft_image_url: z.string().optional(),
        nft_image_bg: z.string().optional(),
        price_amount: z.string().optional(),
        sig: z.string().optional(),
        user_wallet: z.string().optional(),
        activated: z.boolean().optional(),
        tweet_id: z.string().optional(),
        action_id: z.string().optional(),
        created_at: z.string().optional(),
        updated_at: z.string().optional(),
        aime_address: z.string().optional(),
        aime_token_id: z.number().optional(),
        remark: z.string().optional(),
        status: z.string().optional(),
    })
});

// Type for API response
export type NFTResponse = z.infer<typeof NFTResponseSchema>;
