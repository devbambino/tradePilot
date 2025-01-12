import {CKBFiberService} from "./ckb/fiber/service.ts";

export * from "./types";

import {Plugin} from "@elizaos/core";
import {nodeProvider} from "./providers/nodeProvider.ts";
import {channelsProvider} from "./providers/channelsProvider.ts";
import {sendPayment} from "./actions/sendPayment.ts";
import {getInfo} from "./actions/getInfo.ts";
import {listChannels} from "./actions/listChannels.ts";
import {getPayment} from "./actions/getPayment.ts";
import {newInvoice} from "./actions/newInvoice.ts";
import {connectPeer} from "./actions/connectPeer.ts";
import {openChannel} from "./actions/openChannel.ts";
import {closeChannel} from "./actions/closeChannel.ts";

export const ckbFiberPlugin: Plugin = {
    name: "ckb-fiber",
    description: "Fiber network (Lighting network on CKB) integration plugin",
    actions: [
        getInfo,
        listChannels,
        sendPayment,
        getPayment,
        newInvoice,
        connectPeer,
        openChannel,
        closeChannel
    ],
    providers: [nodeProvider, channelsProvider],
    evaluators: [],
    // separate examples will be added for services and clients
    services: [new CKBFiberService()],
    clients: [],
};
