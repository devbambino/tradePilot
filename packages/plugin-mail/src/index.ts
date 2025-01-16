import { Plugin } from "@elizaos/core";
import {
    markAsReadAction,
    readEmailsAction,
    searchEmailsAction,
    sendEmailAction,
} from "./actions";
import { MailService } from "./service/mail";
import { MailPluginService } from "./service/plugin";
import { MailConfig } from "./types";

export { MailConfig, MailService };

const mailPluginService = new MailPluginService();

export const mailPlugin: Plugin = {
    name: "mail",
    description: "Email plugin for reading, sending, and searching emails",
    actions: [
        readEmailsAction,
        sendEmailAction,
        markAsReadAction,
        searchEmailsAction,
    ],
    services: [mailPluginService],
    providers: [],
    evaluators: [],
};

export default mailPlugin;
