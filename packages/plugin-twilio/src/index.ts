import { Plugin } from "@elizaos/core";
import { sendWhatsAppMessageAction,sendSmsAction } from "./actions";
export * as actions from "./actions";

export const twilioPlugin: Plugin = {
    name: "twilio",
    description: "twilio basic send sms action implementation",
    actions: [
        sendSmsAction,
        sendWhatsAppMessageAction,
    ]
};
