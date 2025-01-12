import {
    elizaLogger,
    IAgentRuntime,
    Service,
    ServiceType,
} from "@elizaos/core";
import { ccc } from "@ckb-ccc/core";
import { getClient, RpcClient } from "./rpcClient.ts";
import { SupportedUDTs, UDTType } from "../../constants.ts";
import {Channel, OpenChannelParams, PaymentResponse} from "./types.ts";
import { env, fromDecimal, toDecimal, udtEq } from "../../utils.ts";

export const ServiceTypeCKBFiber = "ckb_fiber" as ServiceType; // ServiceType.CKB_FIBER

export enum State {
    Uninitialized,
    Initializing,
    Initialized,
}

export class CKBFiberService extends Service {
    public runtime: IAgentRuntime;
    public rpcClient: RpcClient;
    public state = State.Uninitialized;

    static serviceType = ServiceTypeCKBFiber;

    async initialize(runtime: IAgentRuntime): Promise<void> {
        if (this.state != State.Uninitialized) {
            elizaLogger.error(`CKBFiberService is ${State[this.state]}`);
            return;
        }

        this.runtime = runtime;
        this.rpcClient = getClient(env(this.runtime, "RPC_URL"));

        this.state = State.Initializing;
        try {
            await this.initClient();
            this.state = State.Initialized;
        } catch (e) {
            elizaLogger.error("Failed to initialize CKBFiberService", e);
            this.state = State.Uninitialized;
        }
    }

    private async initClient() {
        const peerId = env(this.runtime, "DEFAULT_PEER_ID");
        const peerAddress = env(this.runtime, "DEFAULT_PEER_ADDRESS");

        const ckbFundingAmount = Number(
            env(this.runtime, "CKB_FUNDING_AMOUNT")
        );
        const udtFundingAmounts = JSON.parse(
            env(this.runtime, "UDT_FUNDING_AMOUNTS").toLowerCase()
        );

        await this.rpcClient.connectPeer({ address: peerAddress, save: true });

        const channels = await this.rpcClient.listChannels({ peer_id: peerId });

        if (!channels?.channels) {
            elizaLogger.error("Failed to list channels");
            throw new Error("Failed to list channels");
        }

        const readyChannels = channels.channels.filter(
            (channel) => channel?.state?.state_name == "CHANNEL_READY"
        );
        elizaLogger.log(
            `Ready channels: (${readyChannels.length}/${channels.channels.length})`
        );

        const ckbChannels = readyChannels.filter(
            (channel) => channel.funding_udt_type_script == undefined
        );
        const udtChannels = readyChannels.filter(
            (channel) => channel.funding_udt_type_script != undefined
        );
        elizaLogger.log(
            `CKB channels: ${ckbChannels.length}, UDT channels: ${udtChannels.length}`
        );

        // Open channel if not exist, connect to the default peer, so that we can send payment
        if (ckbChannels.length === 0) {
            elizaLogger.log(
                `Opening channel with peer ${peerId} with ${ckbFundingAmount} CKB`
            );

            await this.openChannel(peerId, ckbFundingAmount);
            await this.waitForChannelReady(peerId);
        } else elizaLogger.info(`CKB channel with peer ${peerId} is ready`);

        for (const udtType in udtFundingAmounts) {
            const udtAmount = udtFundingAmounts[udtType];
            if (
                udtChannels.find((channel) =>
                    udtEq(
                        channel.funding_udt_type_script,
                        SupportedUDTs[udtType].script
                    )
                )
            ) {
                elizaLogger.log(
                    `${udtType} channel with peer ${peerId} is ready`
                );
                continue;
            }
            elizaLogger.info(
                `Opening channel with peer ${peerId} with ${udtAmount} ${udtType}`
            );

            await this.openChannel(peerId, udtAmount, true, udtType);
            await this.waitForChannelReady(peerId, udtType);
        }
    }

    public async checkNode() {
        try {
            await this.rpcClient.getNodeInfo();
            return true;
        } catch (e) {
            elizaLogger.error(
                "Can‘t access the node, please check your node process or network connection.",
                e
            );
            return false;
        }
    }

    public ensureUDTType(udtType?: UDTType) {
        if (!udtType) return null;

        udtType = udtType.toLowerCase() as UDTType;

        if (!SupportedUDTs[udtType]) {
            elizaLogger.error(`Unsupported UDT type: ${udtType}`);
            throw new Error(`Unsupported UDT type: ${udtType}`);
        }
        return udtType;
    }

    public async openChannel(
        peerId: string,
        fundingAmount: number,
        isPublic = true,
        udtType?: UDTType,
        options: Partial<OpenChannelParams> = {}
    ) {
        udtType = this.ensureUDTType(udtType);

        if (udtType)
            options.funding_udt_type_script = SupportedUDTs[udtType].script;

        const result = await this.rpcClient.openChannel({
            peer_id: peerId,
            funding_amount: fromDecimal(fundingAmount, udtType),
            public: isPublic,
            ...options,
        });

        return result.temporary_channel_id;
    }
    public async waitForChannelReady(
        peerId: string,
        udtType?: UDTType,
        index = 0,
        retry = 30,
        interval = 3000
    ) {
        udtType = this.ensureUDTType(udtType);

        return new Promise<Channel>((resolve, reject) => {
            const intervalId = setInterval(async () => {
                const channels = await this.rpcClient.listChannels({
                    peer_id: peerId,
                });

                if (!channels?.channels) {
                    elizaLogger.error("Failed to list channels");
                }

                const targetChannels =
                    (udtType
                        ? channels?.channels
                              ?.filter(
                                  (channel) =>
                                      channel.funding_udt_type_script !=
                                      undefined
                              )
                              ?.filter((channel) =>
                                  udtEq(
                                      channel.funding_udt_type_script,
                                      SupportedUDTs[udtType].script
                                  )
                              )
                        : channels?.channels?.filter(
                              (channel) =>
                                  channel.funding_udt_type_script == undefined
                          )) || [];

                const state = targetChannels[index]?.state;
                elizaLogger.log(`Checking Channel state: ${state?.state_name}`);
                if (state && state.state_name === "CHANNEL_READY") {
                    clearInterval(intervalId);
                    resolve(targetChannels[index]);
                } else if (--retry <= 0) {
                    clearInterval(intervalId);
                    elizaLogger.error("Channel not ready");
                    reject(new Error("Channel not ready"));
                }
            }, interval);
        });
    }

    public async sendPayment(
        invoice: string,
        amount: number,
        udtType?: UDTType
    ) {
        udtType = this.ensureUDTType(udtType);

        const invoiceData = await this.rpcClient.parseInvoice({ invoice });
        if (invoiceData.invoice.amount !== fromDecimal(amount, udtType)) {
            elizaLogger.error(
                `Invoice amount does not match transfer amount: Invoice amount ${toDecimal(invoiceData.invoice.amount, udtType)}, Transfer amount ${amount}`
            );
            throw new Error(
                `Invoice amount does not match transfer amount: Invoice amount ${toDecimal(invoiceData.invoice.amount, udtType)}, Transfer amount ${amount}`
            );
        }

        // Check udtType
        const attrs = invoiceData.invoice.data.attrs
            .map((attr) => Object.entries(attr))
            .flat();
        const udtScriptAttr = attrs.find(([key]) => key === "UdtScript");

        // If udt
        if (udtType) {
            if (!udtScriptAttr) {
                elizaLogger.error("UDT script not found in invoice");
                throw new Error("UDT script not found in invoice");
            }
            const script = ccc.Script.fromBytes(udtScriptAttr[1] as string);
            const script_ = {
                code_hash: script.codeHash,
                hash_type: script.hashType,
                args: script.args,
            };
            if (!udtEq(script_, SupportedUDTs[udtType].script)) {
                elizaLogger.error(
                    `Mismatch UDT type: Invoice UDT type ${JSON.stringify(script)}, Transfer UDT type ${udtType}`
                );
                throw new Error(
                    `Mismatch UDT type: Invoice UDT type ${JSON.stringify(script)}, Transfer UDT type ${udtType}`
                );
            }
        }
        // If ckb
        else if (udtScriptAttr) {
            elizaLogger.error(`Mismatch Token`);
            throw new Error("Mismatch Token");
        }

        const { payment_hash } = await this.rpcClient.sendPayment({ invoice });
        return await this.waitForPayment(payment_hash);
    }

    public async waitForPayment(
        paymentHash: string,
        retry = 30,
        interval = 3000
    ) {
        return new Promise<PaymentResponse>((resolve, reject) => {
            const intervalId = setInterval(async () => {
                const payment = await this.rpcClient.getPayment({
                    payment_hash: paymentHash,
                });

                if (!payment) {
                    elizaLogger.error("Failed to get payment");
                }

                elizaLogger.log(`Checking payment status: ${payment.status}`);
                if (payment.status === "Success") {
                    clearInterval(intervalId);
                    resolve(payment);
                } else if (payment.status === "Failed") {
                    clearInterval(intervalId);
                    reject(new Error("Payment failed"));
                } else if (--retry <= 0) {
                    clearInterval(intervalId);
                    elizaLogger.error("Payment not completed");
                    reject(new Error("Payment not completed"));
                }
            }, interval);
        });
    }

    public async newInvoice(amount: number, udtType?: UDTType) {
        udtType = this.ensureUDTType(udtType);

        return await this.rpcClient.newInvoice({
            amount: fromDecimal(amount, udtType),
            currency: "Fibt",
        });
    }
}
