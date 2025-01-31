# LRU Cache - TypeScript Implementation

[![npm version](https://badge.fury.io/js/adev-lru.svg)](https://badge.fury.io/js/adev-lru)

A simple, efficient, and customizable **LRU Cache** (Least Recently Used Cache) implementation in TypeScript. This package offers O(1) access for retrieving and inserting data, and it automatically evicts the least recently used items when the cache exceeds its set capacity.

This package is suitable for use in caching data in client-side applications, backend services, or any application where frequently accessed data should be kept in memory.

- [NPM Package](https://www.npmjs.com/package/adev-lru)
- [How to Create an In-Memory Cache](https://dev.to/armando284/how-to-create-an-in-memory-cache-3ihe)
- [Enhancing Cache with Configurable Data Persistence](https://dev.to/armando284/enhancing-lru-cache-with-configurable-data-persistence-37am)

## Features

- **O(1) Access Time** for retrieving and inserting cache entries.
- **LRU Eviction**: Automatically evicts the least recently used items when the cache exceeds its capacity.
- **TTL (Time-To-Live)**: Supports time-based expiration for cache entries.
- **Customizable Capacity**: Set the cache size and eviction strategy.

## Table of Contents

- [Installation](#installation)
- [Usage](#usage)
- [API](#api)
  - [LRUCache.getInstance](#lrucachegetinstance)
  - [LRUCache.put](#lrucacheput)
  - [LRUCache.get](#lrucacheget)
  - [LRUCache.clear](#lrucacheclear)
  - [LRUCache.clearMetrics](#lrucacheclearmetrics)
- [How It Works](#how-it-works)
- [Contributing](#contributing)
- [License](#license)
- [Guide](#guide)

---

## Installation

You can install the package via npm or yarn:

```bash
npm install adev-lru
# or
yarn add adev-lru
```

## Usage

After installation, you can use the LRU Cache in your application like so:

```typescript
import LRUCache from 'adev-lru';

const cache = LRUCache.getInstance<number>(3);

// Add data to the cache
cache.put('a', 1);
cache.put('b', 2);
cache.put('c', 3);

// Access data from the cache
console.log(cache.get('a')); // Output: 1

// Adding another entry will evict the least recently used item
cache.put('d', 4);
console.log(cache.get('b')); // Output: undefined (evicted)
```

For a more in-depth explanation of how the LRU Cache works, refer to the [Guide](GUIDE.md).

## Using Persistence Systems

The `LRUCache` library supports optional data persistence to ensure cached data remains available between sessions or system restarts. This can be achieved using one of the following adapters:

1. **LocalStorageAdapter**
   - Stores cache data in the browser's `localStorage`. Suitable for lightweight use cases with limited storage requirements.

2. **IndexedDBAdapter**
   - Uses the browser's `IndexedDB` for more robust and scalable data persistence, handling larger datasets effectively.

### Behavior with Persistence
When a persistence adapter is configured, the cache:
- **Reloads Data in Memory**: On initialization, cached data is loaded into memory for fast access.
- **Maintains Consistency**: Updates to the cache are mirrored in the persistence layer in real-time.

### Example: Configuring Persistence Adapters

Here’s how to set up the cache with persistence:

```typescript
import {LRUCache, LocalStorageAdapter, IndexedDBAdapter} from 'adev-lru';

// Example 1: Using LocalStorageAdapter
const localStorageAdapter = new LocalStorageAdapter('my-cache');
const cacheWithLocalStorage = LRUCache.getInstance<number>({
  capacity: 5,
  adapter: localStorageAdapter,
});

// Example 2: Using IndexedDBAdapter
const indexedDBAdapter = new IndexedDBAdapter('myDatabase', 'myStore');
const cacheWithIndexedDB = LRUCache.getInstance<number>({
  capacity: 5,
  adapter: indexedDBAdapter,
});

// Usage remains the same
cacheWithLocalStorage.put('a', 1);
cacheWithIndexedDB.put('b', 2);
console.log(cacheWithLocalStorage.get('a')); // Output: 1
console.log(cacheWithIndexedDB.get('b')); // Output: 2
```

### Handling Concurrency in Multithreaded Environments

When using the cache in parallel systems like web workers or threads, it is critical to:
- **Create a Single Cache Instance**: Export a single shared instance of the cache for all threads to use. 
- **Avoid Independent Instantiations**: This prevents concurrency issues, ensuring consistent access to the same underlying data.

#### Example: Correct Multithreaded Setup

In your main thread or a shared module:

```typescript
import LRUCache from 'adev-lru';

const sharedCache = LRUCache.getInstance<number>(3);

export default sharedCache;
```

In worker threads or other parallel systems:

```typescript
import sharedCache from './sharedCache';

sharedCache.put('a', 42);
console.log(sharedCache.get('a')); // Output: 42
```

### Notes

- **Performance**: By keeping data in memory, the cache ensures rapid access times, even when using persistence adapters.
- **Concurrency Safety**: Following the shared instance model minimizes the risk of race conditions or data inconsistency.

## API

### `LRUCache.getInstance<T>(capacity: number): LRUCache<T>`

- **Parameters**: 
  - `capacity` (number): The maximum number of items the cache will store.
- **Returns**: 
  - An instance of the `LRUCache`.

### `LRUCache.put(key: string, value: T, ttl: number): LRUCache<T>`

- **Parameters**:
  - `key` (string): The unique key for the cache entry.
  - `value` (T): The value to store in the cache.
  - `ttl` (number, optional): Time to live for the entry in milliseconds. Defaults to 60,000 (1 minute).
- **Returns**:
  - The updated `LRUCache` instance.

### `LRUCache.get(key: string): T | undefined`

- **Parameters**:
  - `key` (string): The key of the cache entry to retrieve.
- **Returns**:
  - The cached value if it exists and is not expired. Otherwise, `undefined`.

### `LRUCache.getOption(key: string): Option<T>`

- **Parameters**:
  - key (string): The key of the cache entry to retrieve.
- **Returns**:
  - An Option<T> instance:
    - Option.some(value) if the key exists in the cache and has not expired.
    - Option.none() if the key does not exist or has expired.

### `LRUCache.clear(): void`

- Clears the cache.

### `LRUCache.clearMetrics(): void`

- Clears the internal metrics (`hitCount`, `missCount`, `evictionCount`).

---

## How It Works

The cache uses two core data structures:
1. **Hash Map**: Provides O(1) access to cache entries.
2. **Doubly Linked List**: Ensures the most recently used items are always at the front and the least recently used items are at the back.

This allows us to evict the least recently used items efficiently when the cache exceeds its capacity.

For a detailed breakdown of how the cache is implemented, please refer to the [Guide](GUIDE.md).

---

## Contributing

We welcome contributions to improve this project! To contribute:

1. Fork the repository.
2. Clone your fork to your local machine.
3. Create a new branch: `git checkout -b feature-name`.
4. Make your changes and ensure the code passes all tests.
5. Submit a pull request with a clear description of the changes.

Please follow the coding style used in the project and write tests for any new features or fixes.

---

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more details.

---

## Guide

For a detailed step-by-step guide to building your own LRU Cache from scratch, including the design decisions, code explanations, and the reasoning behind the implementation, check out the [GUIDE.md](GUIDE.md).

---

### Notes

- This `README.md` is structured for a published npm package. It focuses on providing installation, usage, and API documentation, which are the most important for npm package users.
- The **Guide.md** is referenced as a separate document, providing deeper insights into the design and implementation for users interested in learning how the LRU Cache works under the hood.

This structure balances usability and learning, ensuring users can integrate the package with minimal effort while also offering a path for those who want to understand or contribute to the implementation.
