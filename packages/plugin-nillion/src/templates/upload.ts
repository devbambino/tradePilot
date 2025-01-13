export const uploadTemplate = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.

Example response:
\`\`\`json
{
    "secret": "secret value goes here"
}
\`\`\`

{{recentMessages}}

Given the recent messages, extract the secret to upload to nillion's nildb:
- secret

Respond with a JSON markdown block containing only the extracted values.`;
