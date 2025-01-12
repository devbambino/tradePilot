// Basic types
export type Currency = 'Fibb' | 'Fibt' | 'Fibd';
export type HashAlgorithm = 'sha256';
export type Hash256 = string;
export type PeerId = string;
export type MultiAddr = string;
export type JsonBytes = string;

// Script related types
export interface Script {
    code_hash: string;
    hash_type: string;
    // hash_type: 'type' | 'data' | 'data1';
    args: string;
}

// CCH Module Types
export interface SendBTCParams {
    btc_pay_req: string;
    currency: Currency;
}

export interface SendBTCResponse {
    timestamp: string | number;
    expiry: string | number;
    ckb_final_tlc_expiry_delta: string | number;
    currency: Currency;
    wrapped_btc_type_script: Script;
    btc_pay_req: string;
    ckb_pay_req: string;
    payment_hash: Hash256;
    amount_sats: string | number;
    fee_sats: string | number;
    status: string;
}

export const SendBTCResponseNumberKeys = [
    'timestamp',
    'expiry',
    'ckb_final_tlc_expiry_delta',
    'amount_sats',
    'fee_sats'
];

export interface ReceiveBTCParams {
    payment_hash: Hash256;
    channel_id: Hash256;
    amount_sats: string | number;
    final_tlc_expiry: string | number;
}

export const ReceiveBTCParamsNumberKeys = [
    'amount_sats',
    'final_tlc_expiry'
];

export interface GetReceiveBTCOrderParams {
    payment_hash: Hash256;
}

export interface BTCOrderResponse {
    timestamp: string | number;
    expiry: string | number;
    ckb_final_tlc_expiry_delta: string | number;
    currency: Currency;
    wrapped_btc_type_script: Script;
    btc_pay_req: string;
    ckb_pay_req: string;
    payment_hash: Hash256;
    amount_sats: string | number;
    fee_sats: string | number;
    status: string;
}

export const BTCOrderResponseNumberKeys = [
    'timestamp',
    'expiry',
    'ckb_final_tlc_expiry_delta',
    'amount_sats',
    'fee_sats'
];

// Channel Module Types
export interface OpenChannelParams {
    peer_id: PeerId;
    funding_amount: string | number;
    public?: boolean;
    funding_udt_type_script?: Script;
    shutdown_script?: Script;
    commitment_delay_epoch?: string | number;
    commitment_fee_rate?: string | number;
    funding_fee_rate?: string | number;
    tlc_expiry_delta?: string | number;
    tlc_min_value?: string | number;
    tlc_fee_proportional_millionths?: string | number;
    max_tlc_value_in_flight?: string | number;
    max_tlc_number_in_flight?: string | number;
}

export const OpenChannelParamsNumberKeys = [
    'funding_amount',
    'commitment_delay_epoch',
    'commitment_fee_rate',
    'funding_fee_rate',
    'tlc_expiry_delta',
    'tlc_min_value',
    'tlc_fee_proportional_millionths',
    'max_tlc_value_in_flight',
    'max_tlc_number_in_flight'
];

export interface OpenChannelResponse {
    temporary_channel_id: Hash256;
}

export interface AcceptChannelParams {
    temporary_channel_id: Hash256;
    funding_amount: string | number;
    shutdown_script?: Script;
    max_tlc_value_in_flight?: string | number;
    max_tlc_number_in_flight?: string | number;
    tlc_min_value?: string | number;
    tlc_fee_proportional_millionths?: string | number;
    tlc_expiry_delta?: string | number;
}

export const AcceptChannelParamsNumberKeys = [
    'funding_amount',
    'max_tlc_value_in_flight',
    'max_tlc_number_in_flight',
    'tlc_min_value',
    'tlc_fee_proportional_millionths',
    'tlc_expiry_delta'
];

export interface AcceptChannelResponse {
    channel_id: Hash256;
}

export interface ChannelState {
    state_name: string;
    state_flags: string[];
}

export interface Channel {
    channel_id: Hash256;
    is_public: boolean;
    channel_outpoint: string;
    peer_id: PeerId;
    funding_udt_type_script: Script | null;
    state: ChannelState;
    local_balance: string | number;
    offered_tlc_balance: string | number;
    remote_balance: string | number;
    received_tlc_balance: string | number;
    latest_commitment_transaction_hash: string;
    created_at: string | number;
}

export const ChannelNumberKeys = [
    'local_balance',
    'offered_tlc_balance',
    'remote_balance',
    'received_tlc_balance',
    'created_at'
];

export interface ListChannelsParams {
    peer_id?: PeerId;
    include_closed?: boolean;
}

export interface ChannelListResponse {
    channels: Channel[];
}

export interface ShutdownChannelParams {
    channel_id: Hash256;
    close_script: Script;
    force?: boolean;
    fee_rate?: string | number;
}

export const ShutdownChannelParamsNumberKeys = [
    'fee_rate'
];

export interface UpdateChannelParams {
    channel_id: Hash256;
    enabled?: boolean;
    tlc_expiry_delta?: string | number;
    tlc_minimum_value?: string | number;
    tlc_fee_proportional_millionths?: string | number;
}

export const UpdateChannelParamsNumberKeys = [
    'tlc_expiry_delta',
    'tlc_minimum_value',
    'tlc_fee_proportional_millionths'
];

// Dev Module Types
export interface CommitmentSignedParams {
    channel_id: Hash256;
    commitment_transaction: string;
    signature: string;
}

export interface AddTLCParams {
    channel_id: Hash256;
    amount: string | number;
    payment_hash: Hash256;
    expiry?: string | number;
    hash_algorithm?: HashAlgorithm;
}

export const AddTLCParamsNumberKeys = [
    'amount',
    'expiry'
];

export interface AddTLCResponse {
    tlc_id: string;
}

export interface RemoveTLCParams {
    channel_id: Hash256;
    tlc_id: string;
    payment_preimage: string;
}

export interface SubmitCommitmentTransactionParams {
    channel_id: Hash256;
    commitment_number: string;
}

export interface SubmitCommitmentTransactionResponse {
    tx_hash: Hash256;
}

// Graph Module Types
export interface GraphNodesParams {
    limit?: string;
    after?: JsonBytes;
}

export interface UdtCellDep {
    dep_type: string;
    tx_hash: string;
    index: string;
}

export interface UdtArgInfo {
    name: string;
    script: Script;
    auto_accept_amount: string | number;
    cell_deps: UdtCellDep[];
}

export const UdtArgInfoNumberKeys = [
    'auto_accept_amount'
];

export interface NodeInfo {
    node_name?: string;
    addresses: MultiAddr[];
    node_id: string;
    timestamp: string | number;
    chain_hash: Hash256;
    auto_accept_min_ckb_funding_amount: string | number;
    udt_cfg_infos: UdtArgInfo[];
}

export const NodeInfoNumberKeys = [
    'timestamp',
    'auto_accept_min_ckb_funding_amount'
];

export interface GraphNodesResponse {
    nodes: NodeInfo[];
    last_cursor: JsonBytes;
}

export interface GraphChannelsParams {
    limit?: string;
    after?: JsonBytes;
}

export interface ChannelInfo {
    channel_id: Hash256;
    channel_outpoint: string;
    node1: string;
    node2: string;
    created_timestamp: string | number;
    last_updated_timestamp_of_node1?: string | number;
    last_updated_timestamp_of_node2?: string | number;
    fee_rate_of_node1?: string | number;
    fee_rate_of_node2?: string | number;
    capacity: string | number;
    chain_hash: Hash256;
    udt_type_script?: Script;
    is_public: boolean;
}

export const ChannelInfoNumberKeys = [
    'created_timestamp',
    'last_updated_timestamp_of_node1',
    'last_updated_timestamp_of_node2',
    'fee_rate_of_node1',
    'fee_rate_of_node2',
    'capacity'
];

export interface GraphChannelsResponse {
    channels: ChannelInfo[];
    last_cursor: JsonBytes;
}

// Info Module Types
export interface GetNodeInfoResponse {
    version: string;
    commit_hash: string;
    node_id: string;
    node_name?: string;
    addresses: MultiAddr[];
    chain_hash: Hash256;
    open_channel_auto_accept_min_ckb_funding_amount: string | number;
    auto_accept_channel_ckb_funding_amount: string | number;
    default_funding_lock_script: Script; // The wallet lock script
    tlc_expiry_delta: string | number;
    tlc_min_value: string | number;
    tlc_max_value: string | number;
    tlc_fee_proportional_millionths: string | number;
    channel_count: string | number;
    pending_channel_count: string | number;
    peers_count: string | number;
    udt_cfg_infos: UdtArgInfo[];
}

export const GetNodeInfoResponseNumberKeys = [
    'open_channel_auto_accept_min_ckb_funding_amount',
    'auto_accept_channel_ckb_funding_amount',
    'tlc_expiry_delta',
    'tlc_min_value',
    'tlc_max_value',
    'tlc_fee_proportional_millionths',
    'channel_count',
    'pending_channel_count',
    'peers_count'
];

// Invoice Module Types
export interface NewInvoiceParams {
    amount: string | number;
    description?: string;
    currency: Currency;
    payment_preimage?: Hash256;
    expiry?: string | number;
    fallback_address?: string;
    final_expiry_delta?: string | number;
    udt_type_script?: Script;
    hash_algorithm?: HashAlgorithm;
}

export const NewInvoiceParamsNumberKeys = [
    'amount',
    'expiry',
    'final_expiry_delta'
];

export interface InvoiceData {
    timestamp: string | number;
    payment_hash: Hash256;
    attrs: Array<Record<string, any>>;
}

export const InvoiceDataNumberKeys = [
    'timestamp'
];

export interface Invoice {
    currency: Currency;
    amount: string | number;
    signature: string;
    data: InvoiceData;
}

export const InvoiceNumberKeys = [
    'amount'
];

export interface InvoiceResponse {
    invoice_address: string;
    invoice: Invoice;
}

export interface ParseInvoiceParams {
    invoice: string;
}

export interface ParseInvoiceResponse {
    invoice: Invoice;
}

export interface GetInvoiceParams {
    payment_hash: Hash256;
}

export interface GetInvoiceResponse {
    invoice_address: string;
    invoice: Invoice;
    status: string;
}

export interface CancelInvoiceParams {
    payment_hash: Hash256;
}

export interface CancelInvoiceResponse {
    invoice_address: string;
    invoice: Invoice;
    status: string;
}

// Payment Module Types
export interface SendPaymentParams {
    target_pubkey?: string;
    amount?: string | number;
    payment_hash?: Hash256;
    final_tlc_expiry_delta?: string | number;
    tlc_expiry_limit?: string | number;
    invoice?: string;
    timeout?: string | number;
    max_fee_amount?: string | number;
    max_parts?: string | number;
    keysend?: boolean;
    udt_type_script?: Script;
    allow_self_payment?: boolean;
    dry_run?: boolean;
}

export const SendPaymentParamsNumberKeys = [
    'amount',
    'final_tlc_expiry_delta',
    'tlc_expiry_limit',
    'timeout',
    'max_fee_amount',
    'max_parts'
];

export interface GetPaymentParams {
    payment_hash: Hash256;
}

export type PaymentSessionStatus = 'Success' | 'Inflight' | 'Failed';

export interface PaymentResponse {
    payment_hash: Hash256;
    status: PaymentSessionStatus;
    created_at: string | number;
    last_updated_at: string | number;
    failed_error?: string;
    fee: string | number;
}

export const PaymentResponseNumberKeys = [
    'created_at',
    'last_updated_at',
    'fee'
];

// Peer Module Types
export interface ConnectPeerParams {
    address: MultiAddr;
    save?: boolean;
}

export interface DisconnectPeerParams {
    peer_id: PeerId;
}
