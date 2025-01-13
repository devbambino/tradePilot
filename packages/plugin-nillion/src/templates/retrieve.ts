export const retrieveTemplate = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.

Example response:
\`\`\`json
{
    "id": "fc453df9-0f2c-4c4f-99a0-912dc9dbbdb1"
}
\`\`\`

{{recentMessages}}

Given the recent messages, extract the secret's id to retrieve it from nillion's nildb:
- id

Respond with a JSON markdown block containing only the extracted values.`;
