import { elizaLogger } from "@elizaos/core";
import { ImapFlow, MailboxObject } from "imapflow";
import { simpleParser } from "mailparser";
import { createTransport, Transporter } from "nodemailer";
import {
    EmailMessage,
    IMailAdapter,
    ImapSmtpMailConfig,
    MailConfig,
    SearchCriteria,
    SendEmailParams,
} from "../types";

export class ImapSmtpMailAdapter implements IMailAdapter {
    private client: ImapFlow;
    private mailbox: MailboxObject;
    private mailer: Transporter<any, any>;
    private config: MailConfig;
    private lastUID: number | null = null;
    private uidValidity: number | null = null;
    private isConnected: boolean = false;
    private isConnecting: boolean = false;
    private connectionPromise: Promise<void> | null = null;
    private reconnectAttempts: number = 0;
    private readonly MAX_RECONNECT_ATTEMPTS = 3;
    private readonly RECONNECT_DELAY = 5000;

    constructor(config: ImapSmtpMailConfig) {
        if (!config.imap) throw new Error("IMAP configuration is required");

        elizaLogger.info("Creating IMAP client", {
            host: config.imap.host,
            port: config.imap.port,
        });

        this.config = config;
        this.initializeClient();
    }

    private initializeClient() {
        this.client = new ImapFlow({
            host: this.config.imap.host,
            port: this.config.imap.port,
            secure: this.config.imap.secure,
            auth: {
                user: this.config.imap.user,
                pass: this.config.imap.password,
            },
            // logger: false,
            // emitLogs: false,
            disableAutoIdle: true,
            tls: {
                rejectUnauthorized: true,
                minVersion: "TLSv1.2",
                servername: this.config.imap.host,
            },
        });

        this.client.on("error", (err) => {
            elizaLogger.error("IMAP connection error:", {
                error: err.message,
                code: err.code,
                command: (err as any).command,
            });
            this.handleDisconnect();
        });

        this.client.on("close", () => {
            elizaLogger.warn("IMAP connection closed");
            this.handleDisconnect();
        });
    }

    private handleDisconnect() {
        this.isConnected = false;
        this.connectionPromise = null;
        // Reset reconnect attempts after a period of successful connection
        setTimeout(() => {
            this.reconnectAttempts = 0;
        }, 60000);
    }

    async connect(): Promise<void> {
        await this.ensureConnection();
    }

    private async ensureConnection() {
        if (this.isConnected) {
            return;
        }

        if (this.isConnecting || this.connectionPromise) {
            return this.connectionPromise;
        }

        if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
            throw new Error(
                `Max reconnection attempts (${this.MAX_RECONNECT_ATTEMPTS}) reached`
            );
        }

        this.connectionPromise = (async () => {
            try {
                this.isConnecting = true;
                this.reconnectAttempts++;

                await this.client.connect();

                this.mailbox = await this.client.mailboxOpen("INBOX", {
                    readOnly: true,
                });

                this.isConnected = true;
                this.connectionPromise = null;
                elizaLogger.debug("Connected to IMAP server");
            } catch (error) {
                this.handleDisconnect();
                elizaLogger.error("Failed to connect to IMAP server:", {
                    error: (error as any).message,
                    code: (error as any).code,
                    command: (error as any).command,
                    attempt: this.reconnectAttempts,
                });

                if (this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
                    await new Promise((resolve) =>
                        setTimeout(resolve, this.RECONNECT_DELAY)
                    );
                    return this.ensureConnection();
                }
                throw error;
            } finally {
                this.isConnecting = false;
            }
        })();

        return this.connectionPromise;
    }

    async getRecentEmails(): Promise<EmailMessage[]> {
        await this.ensureConnection();

        elizaLogger.debug("Fetching new emails", {
            lastUID: this.lastUID,
            uidValidity: this.uidValidity,
            maxEmails: this.config.maxEmails,
        });

        try {
            if (
                this.uidValidity &&
                this.uidValidity !== this.mailbox.uidValidity
            ) {
                elizaLogger.warn("UIDVALIDITY changed, resetting lastUID", {
                    old: this.uidValidity,
                    new: this.mailbox.uidValidity,
                });
                this.lastUID = null;
            }
            this.uidValidity = this.mailbox.uidValidity;

            if (this.lastUID === null) {
                this.lastUID = this.mailbox.uidNext - 1;
                elizaLogger.debug("First run, storing latest UID", {
                    lastUID: this.lastUID,
                });
                return [];
            }

            const emails: EmailMessage[] = [];
            let highestUID = this.lastUID;

            try {
                for await (const message of this.client.fetch(
                    `${this.lastUID + 1}:*`,
                    {
                        uid: true,
                        envelope: true,
                        source: true,
                        internalDate: true,
                        flags: true,
                    }
                )) {
                    if (emails.length >= this.config.maxEmails) break;

                    const parsed = await this.parseMessage(message);
                    if (parsed) {
                        emails.push(parsed);
                    }

                    highestUID = Math.max(highestUID, message.uid);
                }
            } catch (error) {
                elizaLogger.error("Error fetching messages:", error);
                throw error;
            }

            this.lastUID = highestUID;
            elizaLogger.debug("Updated lastUID", {
                newLastUID: this.lastUID,
                resultsCount: emails.length,
            });

            return emails;
        } catch (error) {
            elizaLogger.error("Error fetching messages:", error);
            throw error;
        }
    }

    async searchEmails(criteria: SearchCriteria): Promise<EmailMessage[]> {
        await this.ensureConnection();

        const imapCriteria = this.convertToImapCriteria(criteria);

        elizaLogger.debug("Searching emails with criteria", {
            criteria: imapCriteria,
        });

        try {
            const results = await this.client.search({ or: imapCriteria });
            if (!results.length) {
                return [];
            }

            const emails: EmailMessage[] = [];
            for await (const message of this.client.fetch(results, {
                uid: true,
                envelope: true,
                source: true,
                internalDate: true,
                flags: true,
            })) {
                elizaLogger.info("Fetching message", {
                    uid: message.uid,
                });
                if (emails.length >= this.config.maxEmails) break;

                const parsed = await this.parseMessage(message);
                if (parsed) {
                    emails.push(parsed);
                }
            }

            return emails;
        } catch (error) {
            elizaLogger.error("Error searching emails:", error);
            throw error;
        }
    }

    async sendEmail(params: SendEmailParams): Promise<void> {
        this.mailer = createTransport({
            ...this.config.smtp,
            auth: {
                user: this.config.imap.user,
                pass: this.config.imap.password,
            },
        });

        await this.mailer.sendMail({
            from: this.config.smtp.from,
            to: params.to,
            subject: params.subject,
            text: params.text,
            html: params.html,
        });
    }

    async markAsRead(messageId: string): Promise<void> {
        if (!this.config.markAsRead) return;
        await this.ensureConnection();
        await this.client.messageFlagsAdd(messageId, ["\\Seen"]);
    }

    async dispose(): Promise<void> {
        if (this.isConnected) {
            try {
                elizaLogger.info("Disposing IMAP client");
                await this.client.logout();
            } finally {
                this.isConnected = false;
            }
        }
    }

    private convertToImapCriteria(criteria: SearchCriteria): any[] {
        const imapCriteria: any[] = [];

        if (criteria.from) imapCriteria.push({ from: criteria.from });
        if (criteria.to) imapCriteria.push({ to: criteria.to });
        if (criteria.subject) imapCriteria.push({ subject: criteria.subject });
        if (criteria.body) imapCriteria.push({ body: criteria.body });
        if (criteria.since) imapCriteria.push({ since: criteria.since });
        if (criteria.before) imapCriteria.push({ before: criteria.before });
        if (typeof criteria.seen === "boolean")
            imapCriteria.push({ seen: criteria.seen });
        if (typeof criteria.flagged === "boolean")
            imapCriteria.push({ flagged: criteria.flagged });
        if (criteria.minSize) imapCriteria.push({ larger: criteria.minSize });
        if (criteria.maxSize) imapCriteria.push({ smaller: criteria.maxSize });

        return imapCriteria;
    }

    private async parseMessage(message: any): Promise<EmailMessage | null> {
        try {
            const parsed = await simpleParser(message.source);

            return {
                id: message.uid.toString(),
                messageId: message.envelope.messageId,
                subject: message.envelope.subject,
                from: {
                    text: message.envelope.from?.[0]
                        ? `${message.envelope.from[0].name} <${message.envelope.from[0].address}>`
                        : undefined,
                    value: message.envelope.from?.map((addr: any) => ({
                        address: addr.address,
                        name: addr.name,
                    })),
                },
                to: message.envelope.to?.map((addr: any) => ({
                    address: addr.address,
                    name: addr.name,
                })),
                date: message.internalDate,
                text: parsed.text || "",
                flags: message.flags,
            };
        } catch (error) {
            elizaLogger.error("Error parsing message:", {
                uid: message.uid,
                error,
            });
            return null;
        }
    }
}
