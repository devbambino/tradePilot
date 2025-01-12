import axios from 'axios';
import {
    AcceptChannelParams,
    AcceptChannelParamsNumberKeys,
    AcceptChannelResponse,
    AddTLCParams,
    AddTLCParamsNumberKeys,
    AddTLCResponse,
    BTCOrderResponse,
    BTCOrderResponseNumberKeys,
    CancelInvoiceParams,
    CancelInvoiceResponse,
    ChannelInfoNumberKeys,
    ChannelListResponse,
    ChannelNumberKeys,
    CommitmentSignedParams,
    ConnectPeerParams,
    DisconnectPeerParams,
    GetInvoiceParams,
    GetInvoiceResponse,
    GetNodeInfoResponse,
    GetNodeInfoResponseNumberKeys,
    GetPaymentParams,
    GetReceiveBTCOrderParams,
    GraphChannelsParams,
    GraphChannelsResponse,
    GraphNodesParams,
    GraphNodesResponse,
    InvoiceDataNumberKeys,
    InvoiceResponse,
    ListChannelsParams,
    NewInvoiceParams,
    NewInvoiceParamsNumberKeys,
    InvoiceNumberKeys,
    NodeInfoNumberKeys,
    OpenChannelParams,
    OpenChannelParamsNumberKeys,
    OpenChannelResponse,
    ParseInvoiceParams,
    ParseInvoiceResponse,
    PaymentResponse,
    PaymentResponseNumberKeys,
    ReceiveBTCParams,
    ReceiveBTCParamsNumberKeys,
    RemoveTLCParams,
    SendBTCParams,
    SendBTCResponse,
    SendBTCResponseNumberKeys,
    SendPaymentParams,
    SendPaymentParamsNumberKeys,
    ShutdownChannelParams,
    ShutdownChannelParamsNumberKeys,
    SubmitCommitmentTransactionParams,
    SubmitCommitmentTransactionResponse,
    UdtArgInfoNumberKeys,
    UpdateChannelParams,
    UpdateChannelParamsNumberKeys
} from "./types.ts";
import { randomBytes } from 'crypto';

export class RpcClient {
    public rpcUrl: string;
    public headers: any;

    public logFunc: (...args: any) => any

    private counter: number;
    private autoConvert: boolean;

    public tlcExpirySecond = 3600; // s
    public invoiceExpirySecond = 3600; // s

    constructor(rpcUrl: string, autoConvert = true, headers = {}) {
        this.rpcUrl = rpcUrl;
        this.headers = headers;
        this.autoConvert = autoConvert;
        this.counter = 0;

        this.logFunc = console.log
    }

    private generateId(): number {
        const timestamp = Math.floor(Date.now() / 1000);
        return timestamp * 10 + (this.counter++ % 10);
    }

    public async call<T>(method: string, params: any[]): Promise<T> {
        const id = this.generateId()
        this.logFunc?.(`[RPC Call #${id}]`, method, params)

        const response = await axios.post(this.rpcUrl, {
            id, jsonrpc: '2.0', method, params,
        }, {
            headers: this.headers
        });

        this.logFunc?.(`[RPC Response #${id}]`, response?.data)

        if (!response?.data) {
            throw new Error('RPC Error: Empty response');
        }

        if (response.data.error) {
            throw new Error(`RPC Error: ${response.data.error.message}`);
        }

        return response.data.result;
    }

    // CCH Module
    async sendBtc(params: SendBTCParams): Promise<SendBTCResponse> {
        const res = await this.call<SendBTCResponse>('send_btc', [params]);
        return this.autoConvert ? convert(res, SendBTCResponseNumberKeys) : res;
    }

    async receiveBtc(params: ReceiveBTCParams): Promise<BTCOrderResponse> {
        params = convert(params, ReceiveBTCParamsNumberKeys, true);
        const res = await this.call<BTCOrderResponse>('receive_btc', [params]);
        return this.autoConvert ? convert(res, BTCOrderResponseNumberKeys) : res;
    }

    async getReceiveBtcOrder(params: GetReceiveBTCOrderParams): Promise<BTCOrderResponse> {
        const res = await this.call<BTCOrderResponse>('get_receive_btc_order', [params]);
        return this.autoConvert ? convert(res, BTCOrderResponseNumberKeys) : res;
    }

    // Channel Module
    async openChannel(params: OpenChannelParams): Promise<OpenChannelResponse> {
        params = convert(params, OpenChannelParamsNumberKeys, true);
        return await this.call<OpenChannelResponse>('open_channel', [params]);
    }

    async acceptChannel(params: AcceptChannelParams): Promise<AcceptChannelResponse> {
        params = convert(params, AcceptChannelParamsNumberKeys, true);
        return await this.call<AcceptChannelResponse>('accept_channel', [params]);
    }

    async listChannels(params: ListChannelsParams = {}): Promise<ChannelListResponse> {
        const res = await this.call<ChannelListResponse>('list_channels', [params]);
        if (this.autoConvert && res.channels) {
            res.channels = res.channels.map(channel =>
                convert(channel, ChannelNumberKeys)
            );
        }
        return res;
    }

    async shutdownChannel(params: ShutdownChannelParams): Promise<void> {
        params.fee_rate ||= 1020;
        params = convert(params, ShutdownChannelParamsNumberKeys, true);
        await this.call<void>('shutdown_channel', [params]);
    }

    async updateChannel(params: UpdateChannelParams): Promise<void> {
        params = convert(params, UpdateChannelParamsNumberKeys, true);
        await this.call<void>('update_channel', [params]);
    }

    // Dev Module
    async commitmentSigned(params: CommitmentSignedParams): Promise<void> {
        await this.call<void>('commitment_signed', [params]);
    }

    async addTLC(params: AddTLCParams): Promise<AddTLCResponse> {
        params.expiry ||= Date.now() + this.tlcExpirySecond * 1000;
        params = convert(params, AddTLCParamsNumberKeys, true);
        return await this.call<AddTLCResponse>('add_tlc', [params]);
    }

    async removeTLC(params: RemoveTLCParams): Promise<void> {
        await this.call<void>('remove_tlc', [params]);
    }

    async submitCommitmentTransaction(params: SubmitCommitmentTransactionParams): Promise<SubmitCommitmentTransactionResponse> {
        return await this.call<SubmitCommitmentTransactionResponse>('submit_commitment_transaction', [params]);
    }

    // Graph Module
    async graphNodes(params: GraphNodesParams = {}): Promise<GraphNodesResponse> {
        const res = await this.call<GraphNodesResponse>('graph_nodes', [params]);
        if (this.autoConvert && res.nodes) {
            res.nodes = res.nodes.map(node => {
                node = convert(node, NodeInfoNumberKeys);
                node.udt_cfg_infos = node.udt_cfg_infos.map(udt => convert(udt, UdtArgInfoNumberKeys));
                return node;
            })
        }
        return res;
    }

    async graphChannels(params: GraphChannelsParams = {}): Promise<GraphChannelsResponse> {
        const res = await this.call<GraphChannelsResponse>('graph_channels', [params]);
        if (this.autoConvert && res.channels) {
            res.channels = res.channels.map(channel =>
                convert(channel, ChannelInfoNumberKeys)
            );
        }
        return res;
    }

    // Info Module
    async getNodeInfo(): Promise<GetNodeInfoResponse> {
        let res = await this.call<GetNodeInfoResponse>('node_info', []);
        if (this.autoConvert && res) {
            res = convert(res, GetNodeInfoResponseNumberKeys);
            res.udt_cfg_infos = res.udt_cfg_infos.map(udt => convert(udt, UdtArgInfoNumberKeys));
        }
        return res
    }

    // Invoice Module
    private generatePreimage() {
        const buffer = randomBytes(32);
        return buffer.toString('hex');
    }

    async newInvoice(params: NewInvoiceParams): Promise<InvoiceResponse> {
        params.expiry ||= this.invoiceExpirySecond
        params.payment_preimage ||= this.generatePreimage();
        params = convert(params, NewInvoiceParamsNumberKeys, true);
        const res = await this.call<InvoiceResponse>('new_invoice', [params]);
        if (this.autoConvert && res.invoice) {
            res.invoice = convert(res.invoice, InvoiceNumberKeys);
            res.invoice.data = convert(res.invoice.data, InvoiceDataNumberKeys);
        }
        return res;
    }

    async getInvoice(params: GetInvoiceParams): Promise<GetInvoiceResponse> {
        const res = await this.call<GetInvoiceResponse>('get_invoice', [params]);
        if (this.autoConvert && res.invoice) {
            res.invoice = convert(res.invoice, InvoiceNumberKeys);
            res.invoice.data = convert(res.invoice.data, InvoiceDataNumberKeys);
        }
        return res;
    }

    async parseInvoice(params: ParseInvoiceParams): Promise<ParseInvoiceResponse> {
        const res = await this.call<ParseInvoiceResponse>('parse_invoice', [params]);
        if (this.autoConvert && res.invoice) {
            res.invoice = convert(res.invoice, InvoiceNumberKeys);
            res.invoice.data = convert(res.invoice.data, InvoiceDataNumberKeys);
        }
        return res;
    }

    async cancelInvoice(params: CancelInvoiceParams): Promise<CancelInvoiceResponse> {
        const res = await this.call<CancelInvoiceResponse>('cancel_invoice', [params]);
        if (this.autoConvert && res.invoice) {
            res.invoice = convert(res.invoice, InvoiceNumberKeys);
            res.invoice.data = convert(res.invoice.data, InvoiceDataNumberKeys);
        }
        return res;
    }

    // Payment Module
    async sendPayment(params: SendPaymentParams): Promise<PaymentResponse> {
        params = convert(params, SendPaymentParamsNumberKeys, true);
        const res = await this.call<PaymentResponse>('send_payment', [params]);
        return this.autoConvert ? convert(res, PaymentResponseNumberKeys) : res;
    }

    async getPayment(params: GetPaymentParams): Promise<PaymentResponse> {
        const res = await this.call<PaymentResponse>('get_payment', [params]);
        return this.autoConvert ? convert(res, PaymentResponseNumberKeys) : res;
    }

    // Peer Module
    async connectPeer(params: ConnectPeerParams): Promise<void> {
        await this.call<void>('connect_peer', [params]);
    }

    async disconnectPeer(params: DisconnectPeerParams): Promise<void> {
        await this.call<void>('disconnect_peer', [params]);
    }
}

// Helper functions
export function num2Hex(num: number): string {
    return `0x${num.toString(16)}`;
}

export function hex2Num(hex: string): number {
    return Number(hex)
}

export function objHex2Num<T, Keys extends (keyof T)[]>(obj: T, ...keys: Keys) {
    return keys.reduce((acc, key) => {
        if (typeof obj[key] === 'string') acc[key] = hex2Num(obj[key] as string) as any
        return acc
    }, obj as {[K in keyof T]: K extends Keys[number] ? number : T[K]})
}
export function objNum2Hex<T, Keys extends (keyof T)[]>(obj: T, ...keys: Keys) {
    return keys.reduce((acc, key) => {
        if (typeof obj[key] === 'number') acc[key] = num2Hex(obj[key] as number) as any
        return acc
    }, obj as {[K in keyof T]: K extends Keys[number] ? string : T[K]})
}

export function convert<T>(obj: T, numKeys: string[], toHex = false): T {
    return toHex ?
        objNum2Hex(obj, ...numKeys as (keyof T)[]) as T :
        objHex2Num(obj, ...numKeys as (keyof T)[]) as T;
}

const instances: RpcClient[] = []

export function getClient(rpcURL: string) {
    let instance = instances.find(i => i.rpcUrl === rpcURL)
    if (!instance) {
        instance = new RpcClient(rpcURL)
        instances.push(instance)
    }
    return instance
}
