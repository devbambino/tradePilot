# @elizaos/plugin-nillion

A plugin for storing and retrieving data from Nillion's nilDB within the ElizaOS
ecosystem.

## Description
The Nillion plugin enables seamless integration with the decentralized nilDB
database backed by secure multi-party computation (MPC). The plugin provides
functionality to store and retrieve secrets to/from nilDB. When you store your
data in nilDB nodes, your data are secret shared in a way that none of the nodes
can learn anything about your secrets. Then, when all the secret shares are
combined, you can retrieve your original data.

## Configuration

To get started with nilDB read [our docs](https://nillion-docs-git-feat-fe-svsvd-nillion.vercel.app/build/secretVault-secretDataAnalytics/overview).

To get credentials contact [Georgios Pentafragkas](mailto:georgios.pentafragkas@nillion.com).

The plugin requires the following environment variables to be set:
```bash
NILLION_NILDB_ORG_DID=<Org_ID>
NILLION_NILDB_SCHEMA_ID=<Schema_ID>
NILLION_NILDB_NODE_URLS=<URL_1>,<URL_2>,<URL_3>
NILLION_NILDB_NODE_IDS=<Node_ID_1>,<Node_ID_2>,<Node_ID_3>
NILLION_NILDB_NODE_JWTS=<Node_JWT_1>,<Node_JWT_2>,<Node_JWT_3>
```

## Installation

```bash
pnpm install @elizaos/plugin-nillion
```

## Usage

### Basic Integration

```typescript
import { nillionPlugin } from "@elizaos/plugin-nillion";
```

### Store Secret Example

```typescript
// The plugin automatically handles secret uploads when triggered
// through natural language commands like:

"Upload the following secret to Nillion: MyPassword123"
"Upload my secret 'foo' to nilDB"
"Store this the word PRIVACY on nillion's database"
```

### Retrieve Secret Example

```typescript
// The plugin automatically handles secret retrieval when triggered
// through natural language commands like:

"Retrieve the secret from Nillion with id 59591970-f6d1-490f-839a-02a1e8ba2a3e"
"Download my secret with id 59591970-f6d1-490f-839a-02a1e8ba2a3e from nilDB"
"Load the secret corresponding to id 59591970-f6d1-490f-839a-02a1e8ba2a3e from nillion's database"
```

## API Reference

### Actions

#### 1. NILLION_UPLOAD

Uploads secrets to Nillion's nilDB.

**Aliases:**
- UPLOAD_SECRET_TO_NILLION
- UPLOAD_SECRET_TO_NILDB
- STORE_SECRET_ON_NILLION
- STORE_SECRET_ON_NILDB
- SAVE_SECRET_TO_NILLION
- SAVE_SECRET_TO_NILDB
- UPLOAD_TO_NILLION
- UPLOAD_TO_NILDB
- STORE_ON_NILLION
- STORE_ON_NILDB
- SHARE_SECRET_ON_NILLION
- SHARE_SECRET_ON_NILDB
- PUBLISH_SECRET_TO_NILLION
- PUBLISH_SECRET_TO_NILDB

**Input Content:**
```typescript
interface UploadContent {
    secret: string;
}
```

#### 2. NILLION_RETRIEVE

Retrieve secrets from Nillion's nilDB.

**Aliases:**
- RETRIEVE_SECRET_FROM_NILLION
- RETRIEVE_SECRET_FROM_NILDB
- GET_SECRET_FROM_NILLION
- GET_SECRET_FROM_NILDB
- LOAD_SECRET_FROM_NILLION
- LOAD_SECRET_FROM_NILDB
- RETRIEVE_FROM_NILLION
- RETRIEVE_FROM_NILDB
- LOAD_FROM_NILLION
- LOAD_FROM_NILDB

**Input Content:**
```typescript
interface RetrieveContent {
    id: string;
}
```

## Common Issues & Troubleshooting

**Configuration Issues**
   - Verify all required environment variables are set properly
     (`NILLION_NILDB_URLS`, `NILLION_NILDB_NODE_IDS`, `NILLION_NILDB_NODE_JWTS`
     should all have three comma separated values.)
   - Ensure RPC endpoints are accessible
   - Confirm NILLION_NILDB_ORG and NILLION_NILDB_SCHEMA_ID are set correctly
     (one value each.)

## Security Best Practices

**Environment Variables**
   - Never commit private keys to version control
   - Use secure environment variable management
   - Rotate private keys periodically

## Development Guide

### Setting Up Development Environment

1. Clone the repository
2. Install dependencies:

    ```bash
    pnpm install
    ```

3. Build the plugin:

    ```bash
    pnpm run build
    ```

4. Run the plugin:

    ```bash
    pnpm run dev
    ```

## Future Enhancements

- Currently, we only upload a string. This can be extended to allow any custom schema.

We welcome community feedback and contributions to help prioritize these enhancements.

## Contributing

Contributions are welcome! Please see the [CONTRIBUTING.md](CONTRIBUTING.md) file for more information.

## Credits

This plugin integrates with and builds upon several key technologies:
- [Nillion's nilDB](https://nillion-docs-git-feat-fe-svsvd-nillion.vercel.app/build/secretVault-secretDataAnalytics/overview): Decentralized database

Special thanks to:
- The Eliza community for their contributions and feedback.

## License

This plugin is part of the Eliza project. See the main project repository for license information.
