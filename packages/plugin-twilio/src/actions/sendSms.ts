import {
    ActionExample,
    generateText,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    ModelClass,
    State,
    type Action,
} from "@elizaos/core";
import twilio from 'twilio';

export const sendSmsAction: Action = {
    name: "SendSms",
    similes: [
        "SendSms"
    ],
    validate: async (_runtime: IAgentRuntime, _message: Memory) => {
        return true;
    },
    description:
        "Send SMS to the mobile number provided by the user",
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
        }else{
            const alternativeMobileNumberRegex = /\b(\d{3})[-.]?(\d{3})[-.]?(\d{4})\b/; // For formats like 123-456-7890 or 123.456.7890
            if (!mobileNumberProvidedByUser) {
                const alternativeMatches = text.match(alternativeMobileNumberRegex);
                if (alternativeMatches) {
                    mobileNumberProvidedByUser = `${alternativeMatches[1]}${alternativeMatches[2]}${alternativeMatches[3]}`;
                }
            }
        }

        const twilioNumber = process.env.TWILIO_PHONE_NUMBER; // Your Twilio phone number

        if (!twilioNumber) {
            console.error('Twilio phone number is missing');
            // TODO: generate text to have a different message from AI Agent
            _callback({
                text: `Sorry there was an issue send sms, please try again later`,
            });
            return false;
        }

        const recentMessages =  `Extract the phone number from the user recent messages ${_state.recentMessages}`;

        if (!mobileNumberProvidedByUser) {
            console.error('Mobile number is missing will try to get the phone number or mobile number from recent messages');

            mobileNumberProvidedByUser = await generateText(
                {
                    runtime: _runtime,
                    context: recentMessages,
                    modelClass: ModelClass.SMALL,
                    stop: ["\n"],
                    customSystemPrompt: "only extract the message that the user intend to send and only get the last one"
                }
            );
        }

        if (!mobileNumberProvidedByUser) {
            console.error('Mobile number is missing');
            // TODO: generate text to have a different message from AI Agent
            _callback({
                text: `Sorry,  there was an issue send sms, please try again later`,
            });
            return false;
        }

        const recentUserMessages = `Extract the message intended for SMS or text: ${_state.recentMessages}`;

        if (!messageToSendFromUser) {
            console.error('messageToSendFromUser is missing will try to get the user message from recent messages');

            messageToSendFromUser = await generateText(
                {
                    runtime: _runtime,
                    context: recentUserMessages,
                    modelClass: ModelClass.SMALL,
                    stop: ["\n"]
                }
            );
        }

        if(messageToSendFromUser==null){
            console.error('messageToSendFromUser is empty or null');

            // TODO: generate text to have a different message from AI Agent
            _callback({
                text: `Sorry there was an issue sending the WhatsApp message, please try again later`,
            });
            return false;
        }

        try {
            // Initialize Twilio client
            const client = twilio(accountSid, authToken);

            // Send the SMS
            const message= await client.messages.create({
                body: messageToSendFromUser, // The message body
                to: mobileNumberProvidedByUser, // The recipient's phone number
                from: twilioNumber, // Your Twilio phone number
            });

            // for debug purposes uncomment this
            console.log("check twilio message body: ", message);

            const messageFromAgent = `SMS sent successfully to ${mobileNumberProvidedByUser}`;

            // Call the callback to notify the user
            _callback({
                text: messageFromAgent,
            });

            return true;
        } catch (error) {
            console.error('Failed to send SMS:', error);
            _callback({
                text: `Failed to send SMS to ${mobileNumberProvidedByUser}`,
            });
            return false;
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: { text: "please send my message via sms to target mobile number" },
            },
            {
                user: "{{user2}}",
                content: { text: "", action: "SEND_SMS" },
            },
        ],
    ] as ActionExample[][],
} as Action;