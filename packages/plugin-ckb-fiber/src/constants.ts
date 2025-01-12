import {Script} from "./ckb/fiber/types.ts";

export const EnvKeys = {
    RPC_URL: 'FIBER_RPC_URL',
    RPC_HEADERS: 'FIBER_RPC_HEADERS',

    DEFAULT_PEER_ID: 'FIBER_DEFAULT_PEER_ID',
    DEFAULT_PEER_ADDRESS: 'FIBER_DEFAULT_PEER_ADDRESS',

    CKB_FUNDING_AMOUNT: 'FIBER_CKB_FUNDING_AMOUNT',
    UDT_FUNDING_AMOUNTS: 'FIBER_UDT_FUNDING_AMOUNTS',
} as const

export const EnvDefaults = {
    RPC_URL: 'http://127.0.0.1:8227',
    RPC_HEADERS: '{}',

    // JoyId Peer ID
    DEFAULT_PEER_ID: 'QmPQ1BpLXmD4HpF9ed9oqkhd4yGyQogGYfeEVA83fR9MVJ',
    // JoyId Peer Address
    DEFAULT_PEER_ADDRESS: '/ip4/16.162.99.28/tcp/8119/p2p/QmPQ1BpLXmD4HpF9ed9oqkhd4yGyQogGYfeEVA83fR9MVJ',

    CKB_FUNDING_AMOUNT: '500',
    UDT_FUNDING_AMOUNTS: '{"usdi": 10, "rusd": 10}'
} as const

export type SupportedUDT = {
    decimal: number
    description: string
    script: Script
}

export const CKBDecimal = 8;
export const SupportedUDTs: Record<string, SupportedUDT> = {
    'usdi': {
        decimal: 6,
        description: 'USDI Stablecoin',
        script: {
            code_hash: '0xcc9dc33ef234e14bc788c43a4848556a5fb16401a04662fc55db9bb201987037',
            hash_type: 'type',
            args: '0x71fd1985b2971a9903e4d8ed0d59e6710166985217ca0681437883837b86162f'
        }
    },
    'rusd': {
        decimal: 6,
        description: 'RUSD Stablecoin',
        script: {
            code_hash: '0x1142755a044bf2ee358cba9f2da187ce928c91cd4dc8692ded0337efa677d21a',
            hash_type: 'type',
            args: '0x878fcc6f1f08d48e87bb1c3b3d5083f23f8a39c5d5c764f253b55b998526439b'
        }
    },
}
export type UDTType = keyof typeof SupportedUDTs

