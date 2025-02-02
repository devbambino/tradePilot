# Reputation Plugin

A plugin for managing reputation scores from various providers (e.g., Twitter, GivPower) in a secure database. It allows you to retrieve, store, and update scores for users, and associate different identifiers (e.g., Twitter handles and wallet addresses) with a unified user record.

## Overview

This plugin provides functionality to:

- Track and manage Twitter reputation scores
- Track and manage GivPower scores
- Relate user identifiers (e.g., Twitter handles and wallet addresses)
- Refresh scores from external providers on-demand
- Handle both PostgreSQL and SQLite as database backends

## Installation

Install the plugin via npm:

```bash
npm install plugin-reputation-db
```

## Configuration

The plugin can be configured to use either PostgreSQL or SQLite as the database backend.

### PostgreSQL Configuration

Pass the PostgreSQL connection string as an environment variable:

```bash
export POSTGRES_URL="postgresql://username:password@localhost:5432/reputationdb"
```

### SQLite Configuration

If no PostgreSQL connection string is provided, the plugin will default to using SQLite with a local database file named `reputation.db`.

## Usage

Import and use the ReputationDB functionality in your application:

### Initialization

```typescript
import ReputationDB from 'plugin-reputation-db';

// Initialize with PostgreSQL or SQLite
const db = new ReputationDB(process.env.POSTGRES_URL);
```

### Get or Fetch Twitter Score

```typescript
const twitterScore = await db.getTwitterScore('example_handle');
console.log('Twitter Score:', twitterScore);
```

### Get or Fetch GivPower Score

```typescript
const givPowerScore = await db.getGivPowerScore('0xExampleWalletAddress');
console.log('GivPower Score:', givPowerScore);
```

### Relate a Wallet Address with a Twitter Handle

```typescript
await db.relateUser('0xExampleWalletAddress', 'example_handle');
```

### Refresh Scores for a Specific User

```typescript
await db.refreshScoresForUser(['twitter', 'givPower'], {
  twitterHandle: 'example_handle',
  walletAddress: '0xExampleWalletAddress',
});
```

### Get Scores Across All Providers for a User

```typescript
const scores = await db.getScoresForUser({
  twitterHandle: 'example_handle',
  walletAddress: '0xExampleWalletAddress',
});
console.log('All Scores:', scores);
```

### Close the Database Connection

```typescript
await db.closeConnection();
```

## Features

### ReputationDB
The main database manager providing comprehensive tracking and analysis:

- `getTwitterScore(twitterHandle: string, refresh?: boolean)`: Retrieve or fetch the Twitter reputation score for a user.
- `getGivPowerScore(walletAddress: string, refresh?: boolean)`: Retrieve or fetch the GivPower score for a user.
- `relateUser(walletAddress: string, twitterHandle: string)`: Relate a wallet address with a Twitter handle.
- `refreshScoresForUser(providers: string[], user: { twitterHandle?: string; walletAddress?: string })`: Refresh scores from external providers for a specific user.
- `getScoresForUser(user: { twitterHandle?: string; walletAddress?: string })`: Retrieve scores for a user across all providers.

## Development

### Building

```bash
npm run build
```

### Testing

```bash
npm run test
```

### Linting

```bash
npm run lint
```

## Dependencies

- `pg`: PostgreSQL client
- `better-sqlite3`: SQLite database interface
- `uuid`: Unique identifier generation

## Common Issues/Troubleshooting

### Issue: Database Connection Errors
**Cause:** Incorrect PostgreSQL connection string or file permissions for SQLite.

**Solution:** Verify the connection string and ensure the SQLite database file is accessible.

### Issue: Data Consistency
**Cause:** Concurrent database access in SQLite.

**Solution:** Use proper transaction handling and avoid simultaneous writes.

## Security Best Practices

- Use parameterized queries to prevent SQL injection.
- Validate all input data before storage.
- Regularly back up the database.

## Contributing

Contributions are welcome! Please see the `CONTRIBUTING.md` file for more information.

## Credits

This plugin integrates and builds upon several key technologies:

- `pg`: PostgreSQL client
- `better-sqlite3`: SQLite database driver
- `uuid`: UUID generation library

Special thanks to the developers and the community for their contributions and feedback.

For more information about database management and security:

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [SQLite Documentation](https://sqlite.org/docs.html)


