# Ton Connect Plugin for Eliza

The plugin for Eliza enables connection to any TON wallet via the Ton Connect protocol.

## Overview

This plugin offers the following features:

- Seamless connection to any supported TON wallets via Ton Connect.
- Support for multiple wallets and simultaneous connections.
- Display a list of connected wallets.
- Effortless disconnection from Ton Connect.
- A provider to select and manage active connections (e.g., execute transactions).

## Installation

```bash
npm install @elizaos/plugin-ton-connect
```

## Configuration

The plugin requires the following environment variables:

```env
TON_CONNECT_MANIFEST_URL=https://domain/ton-manifest.json
```
How to create manifest read [here](https://docs.ton.org/v3/guidelines/ton-connect/guidelines/creating-manifest) 

## Usage

Import and register the plugin in your Eliza configuration:

```typescript
import { tonConnectPlugin } from "@elizaos/plugin-ton-connect";

export default {
    plugins: [tonConnectPlugin],
    // ... other configuration
};
```
