# CKB Fiber Plugin
[Fiber](https://github.com/nervosnetwork/fiber) is a type of Lightning Network that enables AI Agents to make stablecoin payments using the Lightning Network. This PR introduces a new plugin: the CKB Fiber Plugin, enabling the Eliza agent to interact with the Fiber Network by managing a Fiber node. We implemented a standalone Fiber Network RPC client and developed a series of actions within the Eliza framework. These actions leverage the RPC client to send RPC requests and facilitate communication with the Fiber node.

# Configuration
The plugin requires the following environment variables:
``` env
# CKB Fiber Configuration
FIBER_ENABLE=true

FIBER_RPC_URL=  # RPC url of your Fiber node, anyone can control the Fiber node through this RPC, so make sure that the RPC url cannot be accessed externally. Default is http://127.0.0.1:8227
FIBER_RPC_HEADERS=  # (Optional) The headers of the Fiber RPC (JSON string). It is used to authenticate the Fiber RPC if needed

FIBER_DEFAULT_PEER_ID=QmSqSsbjkQG6aMBNEkG6hMLKQpMjLW3eaBmUdCghpRWqwJ  # The default peer id of the Fiber node, it is used to connect to the Fiber network, you can get it from https://testnet.explorer.nervos.org/fiber/graph/nodes
FIBER_DEFAULT_PEER_ADDRESS=/ip4/43.198.162.23/tcp/8228/p2p/QmSqSsbjkQG6aMBNEkG6hMLKQpMjLW3eaBmUdCghpRWqwJ  # The default peer address of the Fiber node, it is used to connect to the Fiber network, you can get it from https://testnet.explorer.nervos.org/fiber/graph/nodes

FIBER_CKB_FUNDING_AMOUNT=  # (Optional) The default funding amount when open the default channel
FIBER_UDT_FUNDING_AMOUNTS=  # (Optional) The default funding udt amounts (JSON string) when open the default channel
```
You can check the default values in `src/constants.ts`

# Available Actions

1. **GET_INFO**: Retrieves the current node information from the agent-controlled Fiber node.

2. **LIST_CHANNELS**: Lists all the opened channels of the agent-controlled Fiber node.

3. **SEND_PAYMENT**: Given an invoice, payment amount, and asset type (CKB, USDI, or RUSD) in the context, the agent-controlled Fiber node will verify and send the payment.

4. **GET_PAYMENT**: Given a specific payment hash, retrieves the payment details.

5. **NEW_INVOICE**: Given an amount and asset type (CKB, USDI, or RUSD), the agent generates a new invoice, enabling others to send funds to the agent-controlled Fiber node.

# Cautions & Notes
- **Start Your Fiber Node:** Before using the CKB Fiber Plugin, ensure that your Fiber node is up and running. The Fiber node should be connected to the Fiber network and have sufficient channels opened to facilitate payment transactions. Check [nervosnetwork/fiber](https://github.com/nervosnetwork/fiber) for more information.

- **Network Access Control:** If the Fiber node’s RPC URL is exposed to the external network without proper access control, there could be potential unauthorized access. Ensure the RPC URL is secured or only accessible within the local network to avoid unintended exposure.

- **Sensitive Actions:** Some actions, such as transfers, involve handling sensitive operations. These actions should be properly secured to prevent users from directly triggering them in inappropriate scenarios (e.g., unauthorized transfers). Ensuring proper access control and validation for these actions is critical.

- **Channel and Network Connectivity:** If the Fiber node is not connected to the network or doesn't have enough channels opened, SEND_PAYMENT action will fail. This could affect the overall functionality and cause disruptions in the intended operations of the Fiber node and Eliza Agent interactions.

# Benefits

### Seamless CKB Integration

- **Native CKB Support**: Effortlessly integrate CKB blockchain functionalities into your applications.
- **Efficient Transaction Handling**: Streamlined processes for sending and receiving CKB transactions.

### Robust Financial Operations

- **Automated Payment Processing**: Facilitate automated payments for services such as API calls, content generation, and more.
- **Multi-Layer Transaction Support**: Handle both on-chain and Layer 2 transactions for enhanced flexibility and scalability.
- **Real-Time Balance Monitoring**: Keep track of wallet balances with up-to-date information and notifications.

### Flexible Payment Options

- **Multi-Currency Support**: Accept payments in various cryptocurrencies and fiat currencies with automatic conversion.
- **Customizable Fee Structures**: Adjust transaction fees based on real-time market data and user preferences.
- **Recurring Payments**: Set up recurring billing for subscription-based services, ensuring consistent revenue streams.

### Enhanced Security

- **Secure Key Management**: Protect private keys using environment variables and secure storage solutions.
- **Advanced Encryption**: Ensure all sensitive data is encrypted both in transit and at rest to maintain user privacy.

# Implementation Status

### Core CKB Functionality

- Full support for CKB blockchain operations, including transaction creation and validation.
- Integration with CKB's native wallets and APIs for seamless user interactions.

### Fiber Framework Integration

- Seamless incorporation with the Fiber web framework, ensuring high performance and scalability.
- Middleware support for efficient request handling and processing within Fiber applications.

### Payment Processing Features

- Automated payment workflows implemented, enabling smooth financial transactions between agents.
- Support for both on-chain and Layer 2 transactions to cater to different scalability and cost requirements.

### USD Denomination Support

- Enable USD-denominated transactions with automatic cryptocurrency conversion based on real-time exchange rates.
- Integration of real-time price feeds to ensure accurate fee estimation and financial reporting.

### Upcoming Features

- **Enhanced Analytics**: Development of advanced dashboards for monitoring transaction metrics and user activity (planned).
- **Extended Protocol Support**: Ongoing work to integrate additional blockchain protocols, expanding the plugin's versatility and applicability.

<!--
- [x] **Payment Actions:** Implement actions to send and receive payments using the Fiber Network.
- [ ] **Channel Management:** Implement actions to manage channels, including opening, closing, and updating channels.
- [ ] **CKB functionality:** Implement actions to interact with CKB, such as querying balances, sending CKB transactions, and managing UDTs.
- [ ] **Payment History:** Implement actions to retrieve payment history and details for the agent-controlled Fiber node.
- [ ] **Authorization and Access Control:** Because some actions involve sensitive operations, implementing proper authorization and access control mechanisms is essential.
-->

# Testing
``` bash
cd packages/plugin-ckb-fiber
pnpm test
```

# Usage

## Integration

``` typescript

// Assume this is the user's message received by the client
const message: Memory = {
  id: stringToUuid(
      Date.now() + "-" + runtime.agentId
  ),
  userId: runtime.agentId,
  agentId: runtime.agentId,
  content: {
    text: "Send me 60 USDI, my invoice is: fibt600000001pp8msdlfq6gqzg7dwfhddw3x46u2xydkgzm2e37kp6dr75yakkemrxjm67xjucccgj7hz46reg9m90gvax25pgfcrerysr67fesg34zzsu895nns8g78ua6x23f3w9xjyfzwht9grq5aa2vwaz0gaaxme6dqxfypk3g02753fc0a6e4e4jx7r982qv282mutcw8zzrx3y992av365sfv2pgpschnwn5wv3lglel8x96adqemcsp9j0l2rfue2rvp9yj60320wdewqj8aln2c3dh04s30nxg0hn0vufhdj8gkcvt5h4h8gfr02k8x6rnyulnlqgt5gqzmhkchn6tcqtgk0zkglgrl0wg8ede99gv204rgsqqjge9mq07u23f7vxfcdzpm57rt72359vp0yad9pkl5ttae44vxd5rzq09m2w8rc0ydryljywvgqj2gq0d",
    action: "SEND_PAYMENT",
  },
  roomId: runtime.agentId,
  embedding: getEmbeddingZeroVector(),
  createdAt: Date.now(),
};

// Process the message, it will trigger the SEND_PAYMENT action
// callback is a function to handle the response (e.g., send the response back to the user)
runtime.processActions(message, [], state, callback)

```
