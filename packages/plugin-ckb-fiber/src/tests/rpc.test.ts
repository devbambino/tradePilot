import {RpcClient, getClient} from '../ckb/fiber/rpcClient.ts';
import axios from 'axios';
import {afterEach, beforeAll, beforeEach, describe, expect, it, vi} from "vitest";

vi.mock('axios');

describe('FiberRPCClient', () => {
    const realRpcUrl = 'http://localhost:8227';
    const mockRpcUrl = 'http://localhost:8229';

    // Must comment `vi.mock('axios')` before running this test
    // describe('Use real axios', () => {
    //     let realClient: RpcClient;
    //
    //     const defaultPeerId = 'QmPQ1BpLXmD4HpF9ed9oqkhd4yGyQogGYfeEVA83fR9MVJ';
    //     const defaultPeerAddress = '/ip4/16.162.99.28/tcp/8119/p2p/QmPQ1BpLXmD4HpF9ed9oqkhd4yGyQogGYfeEVA83fR9MVJ'
    //
    //     beforeEach(async () => {
    //         realClient = new RpcClient(realRpcUrl);
    //     });
    //
    //     describe('Get ndoe info', () => {
    //         it('should return node info', async () => {
    //             const nodeInfo = await realClient.getNodeInfo();
    //             console.log("NodeInfo", JSON.stringify(nodeInfo, null, 2));
    //         })
    //     });
    //
    //     describe('List channels', () => {
    //         it('should return list of channels', async () => {
    //             const channels = await realClient.listChannels();
    //             console.log("Channels", JSON.stringify(channels, null, 2));
    //         });
    //     })
    //
    //     describe('Open channel', () => {
    //         it('should open a channel', async () => {
    //             await realClient.connectPeer({address: defaultPeerAddress});
    //
    //             const result = await realClient.openChannel({
    //                 peer_id: defaultPeerId,
    //                 funding_amount: 100,
    //                 public: true
    //             });
    //             console.log("OpenChannel", JSON.stringify(result, null, 2));
    //
    //             let retry = 20;
    //             const interval = setInterval(async () => {
    //                 const channels = await realClient.listChannels({peer_id: defaultPeerId});
    //                 const state = channels?.channels[0]?.state
    //                 if (state) {
    //                     console.log("Channel state", JSON.stringify(state));
    //                     if (state.state_name === 'CHANNEL_READY') clearInterval(interval);
    //                 }
    //                 if (--retry <= 0) {
    //                     clearInterval(interval);
    //                     throw new Error('Channel not ready');
    //                 }
    //             }, 3000);
    //         });
    //     });
    //
    // });

    describe('Use mocked axios', () => {
        let mockClient: RpcClient;
        const mockedAxios = axios as any // vi.Mocked<typeof axios>;

        beforeEach(() => {
            mockClient = new RpcClient(mockRpcUrl);
            vi.clearAllMocks();
        });

        describe('Data Conversion', () => {
            it('should convert hex to number in response when autoConvert is true', async () => {
                const mockResponse = {
                    data: {
                        jsonrpc: '2.0',
                        id: 1,
                        result: {
                            timestamp: '0x61c8d240',
                            expiry: '0xe10',
                            amount_sats: '0x3e8',
                            fee_sats: '0x64',
                            ckb_final_tlc_expiry_delta: '0x12c'
                        }
                    }
                };

                mockedAxios.post.mockResolvedValueOnce(mockResponse);

                const clientWithConversion = new RpcClient(mockRpcUrl, true);
                const result = await clientWithConversion.sendBtc({
                    btc_pay_req: '',
                    currency: 'fibt'
                });

                expect(result).toEqual({
                    timestamp: 1640550976,  // 0x61c8d240 in decimal
                    expiry: 3600,          // 0xe10 in decimal
                    amount_sats: 1000,     // 0x3e8 in decimal
                    fee_sats: 100,         // 0x64 in decimal
                    ckb_final_tlc_expiry_delta: 300  // 0x12c in decimal
                });
            });

            it('should convert number to hex in request when autoConvert is true', async () => {
                mockedAxios.post.mockResolvedValueOnce({
                    data: { jsonrpc: '2.0', id: 1, result: {} }
                });

                const clientWithConversion = new RpcClient(mockRpcUrl, true);
                await clientWithConversion.receiveBtc({
                    amount_sats: 1000,
                    final_tlc_expiry: 3600,
                    payment_hash: '0x1234',
                    channel_id: '0x5678'
                });

                expect(mockedAxios.post).toHaveBeenCalledWith(
                    mockRpcUrl,
                    expect.objectContaining({
                        params: [expect.objectContaining({
                            amount_sats: '0x3e8',
                            final_tlc_expiry: '0xe10'
                        })]
                    }),
                    expect.any(Object)
                );
            });

            it('should convert nested objects in response when autoConvert is true', async () => {
                const mockResponse = {
                    data: {
                        jsonrpc: '2.0',
                        id: 1,
                        result: {
                            invoice: {
                                amount: '0x5f5e100',
                                data: {
                                    timestamp: '0x61c8d240'
                                }
                            }
                        }
                    }
                };

                mockedAxios.post.mockResolvedValueOnce(mockResponse);

                const clientWithConversion = new RpcClient(mockRpcUrl, true);
                const result = await clientWithConversion.newInvoice({
                    amount: 100,
                    description: 'Test invoice',
                    currency: 'fibt',
                    payment_preimage: '0x1234',
                    hash_algorithm: 'sha256'
                });

                expect(result.invoice).toEqual({
                    amount: 100000000,  // 0x5f5e100 (100000000)
                    data: {
                        timestamp: 1640550976  // 0x61c8d240 in decimal
                    }
                });
            });

            it('should not convert data when autoConvert is false', async () => {
                const mockResponse = {
                    data: {
                        jsonrpc: '2.0',
                        id: 1,
                        result: {
                            timestamp: '0x61c8d240',
                            amount_sats: '0x3e8'
                        }
                    }
                };

                mockedAxios.post.mockResolvedValueOnce(mockResponse);

                const clientWithoutConversion = new RpcClient(mockRpcUrl, false);
                const result = await clientWithoutConversion.sendBtc({
                    btc_pay_req: '',
                    currency: 'fibt'
                });

                expect(result).toEqual({
                    timestamp: '0x61c8d240',
                    amount_sats: '0x3e8'
                });
            });
        })

        describe('Error Handling', () => {
            it('should throw error when RPC call fails', async () => {
                const errorMessage = 'Invalid request';
                mockedAxios.post.mockResolvedValueOnce({
                    data: {
                        jsonrpc: '2.0',
                        id: 1,
                        error: {
                            message: errorMessage
                        }
                    }
                });

                await expect(mockClient.sendBtc({
                    btc_pay_req: 'invalid',
                    currency: 'fibt'
                })).rejects.toThrow(`RPC Error: ${errorMessage}`);
            });
        });

    });

    describe('Singleton Pattern', () => {
        it('should return the same instance for the same RPC URL', () => {
            const client1 = getClient(mockRpcUrl);
            const client2 = getClient(mockRpcUrl);
            expect(client1).toBe(client2);
        });

        it('should create new instance for different RPC URL', () => {
            const client1 = getClient(mockRpcUrl);
            const client2 = getClient(realRpcUrl);
            expect(client1).not.toBe(client2);
        });
    });
});
