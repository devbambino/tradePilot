import {
    ActionExample,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    State,
    type Action,
} from "@elizaos/core";
import twilio from 'twilio';

export const sendWhatsAppMessageAction: Action = {
    name: "SendWhatsAppMessage",
    similes: [
        "SendWhatsAppMessage"
    ],
    validate: async (_runtime: IAgentRuntime, _message: Memory) => {
        return true;
    },
    description:
        "Send a WhatsApp message to the mobile number provided by the user",
    handler: async (
        _runtime: IAgentRuntime,
        _message: Memory,
        _state: State,
        _options:{[key:string]: unknown},
        _callback: HandlerCallback,
    ): Promise<boolean> => {
        // Check if environment variables are set
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;

        console.log("CHECK _message: ",_message.content.text);

        if (!accountSid || !authToken) {
            console.error('TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN is not set');
            return false;
        }

        // Extract the mobile number from the message
        const mobileNumberRegex = /(?:\+|00)(\d{1,3})\s?(\d{3,5})\s?(\d{4,10})/; // This regex matches numbers like +1 123 4567890 or 001 123 4567890
        const text = (_message.content as { text?: string })?.text || '';
        const matches = text.match(mobileNumberRegex);

        const messageRegex = /(['"])(.*?)\1/;
        const messageMatch = text.match(messageRegex);

        let mobileNumberProvidedByUser = null;
        let messageToSendFromUser = null;

        if(messageMatch){
            messageToSendFromUser = messageMatch[2];
        }
        if (matches) {
            // Combine the parts of the number into a single string, removing spaces and plus signs
            mobileNumberProvidedByUser = `+${matches[1]}${matches[2]}${matches[3]}`;
        } else {
            const alternativeMobileNumberRegex = /\b(\d{3})[-.]?(\d{3})[-.]?(\d{4})\b/; // For formats like 123-456-7890 or 123.456.7890
            if (!mobileNumberProvidedByUser) {
                const alternativeMatches = text.match(alternativeMobileNumberRegex);
                if (alternativeMatches) {
                    mobileNumberProvidedByUser = `+${alternativeMatches[1]}${alternativeMatches[2]}${alternativeMatches[3]}`;
                }
            }
        }

        // Your Twilio WhatsApp enabled phone number this is a different from twilio regular phone number
        const twilioNumber = process.env.TWILIO_WHATSAPP_PHONE_NUMBER;

        if (!mobileNumberProvidedByUser) {
            console.error('Mobile number is missing');

            //TODO: this can be improve by letting the AI Agent generate his/her own reply for the specific issue
            _callback({
                text: `Sorry there was an issue sending the WhatsApp message, please try again later`,
            });
            return false;
        }

        if (!twilioNumber) {
            console.error('Twilio WhatsApp number is missing');

            //TODO: this can be improve by letting the AI Agent generate his/her own reply for the specific issue
            _callback({
                text: `Sorry there was an issue sending the WhatsApp message, please try again later`,
            });
            return false;
        }

        if(messageToSendFromUser==null){
            console.error('messageToSendFromUser is empty or null');

            //TODO: this can be improve by letting the AI Agent generate his/her own reply for the specific issue
            _callback({
                text: `Sorry there was an issue sending the WhatsApp message, please try again later`,
            });
            return false;
        }

        try {
            // Initialize Twilio client
            const client = twilio(accountSid, authToken);

            // Send the WhatsApp message
            const message = await client.messages.create({
                body: messageToSendFromUser, // The message body
                to: `whatsapp:${mobileNumberProvidedByUser}`, // The recipient's WhatsApp number
                from: `whatsapp:${twilioNumber}`, // Your Twilio WhatsApp number
            });

            // for debug purposes uncomment this
            console.log("check twilio message body: ", message);

            //TODO: this can be improve by letting the AI Agent generate his/her own reply to user
            const messageFromAgent = `WhatsApp message sent successfully to ${mobileNumberProvidedByUser}`;

            // Call the callback to notify the user
            _callback({
                text: messageFromAgent,
            });

            return true;
        } catch (error) {
            console.error('Failed to send WhatsApp message:', error);
            _callback({
                text: `Failed to send WhatsApp message to ${mobileNumberProvidedByUser}`,
            });
            return false;
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: { text: "please send my message via WhatsApp to target mobile number" },
            },
            {
                user: "{{user2}}",
                content: { text: "", action: "SEND_WHATSAPP_MESSAGE" },
            },
        ],
    ] as ActionExample[][],
} as Action;