<div align="start">

# 🤖 Eliza

![Eliza Banner](./docs/static/img/eliza_banner.jpg)

---

[![Technical Report](https://img.shields.io/badge/📑_Technical_Report-blue)](https://arxiv.org/pdf/2501.06781)
[![Documentation](https://img.shields.io/badge/📖_Documentation-green)](https://elizaos.github.io/eliza/)
[![Examples](https://img.shields.io/badge/🎯_Examples-orange)](https://github.com/thejoven/awesome-eliza)

</div>

---

## 🌍 README Translations

<div align="start">

[中文说明](i18n/readme/README_CN.md) • [日本語の説明](i18n/readme/README_JA.md) • [한국어 설명](i18n/readme/README_KOR.md) • [Persian](i18n/readme/README_FA.md) • [Français](i18n/readme/README_FR.md) • [Português](i18n/readme/README_PTBR.md) • [Türkçe](i18n/readme/README_TR.md) • [Русский](i18n/readme/README_RU.md) • [Español](i18n/readme/README_ES.md) • [Italiano](i18n/readme/README_IT.md) • [ไทย](i18n/readme/README_TH.md) • [Deutsch](i18n/readme/README_DE.md) • [Tiếng Việt](i18n/readme/README_VI.md) • [עִברִית](i18n/readme/README_HE.md) • [Tagalog](i18n/readme/README_TG.md) • [Polski](i18n/readme/README_PL.md) • [Arabic](i18n/readme/README_AR.md) • [Hungarian](i18n/readme/README_HU.md) • [Srpski](i18n/readme/README_RS.md) • [Română](i18n/readme/README_RO.md) • [Nederlands](i18n/readme/README_NL.md) • [Ελληνικά](i18n/readme/README_GR.md)

</div>

---

## 🚩 Overview

<div align="center">

![Eliza Diagram](./docs/static/img/eliza_diagram.png)

</div>

---

## ✨ Features

- 🛠️ Full-featured Discord, Twitter and Telegram connectors
- 🔗 Support for every model (Llama, Grok, OpenAI, Anthropic, Gemini, etc.)
- 👥 Multi-agent and room support
- 📚 Easily ingest and interact with your documents
- 💾 Retrievable memory and document store
- 🚀 Highly extensible - create your own actions and clients
- 📦 Just works!

---

## 📺 Video Tutorials

[![AI Agent Dev School](https://img.shields.io/badge/🎓_AI_Agent_Dev_School-red)](https://www.youtube.com/watch?v=ArptLpQiKfI&list=PLx5pnFXdPTRzWla0RaOxALTSTnVq53fKL)

---

## 🎯 Use Cases

- 🤖 Chatbots
- 🕵️ Autonomous Agents
- 📈 Business Process Handling
- 🎮 Video Game NPCs
- 🧠 Trading

---

## 🚀 Quick Start

### Prerequisites

- [Python 2.7+](https://www.python.org/downloads/)
- [Node.js 23+](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)
- [pnpm](https://pnpm.io/installation)

> **Note for Windows Users:** [WSL 2](https://learn.microsoft.com/en-us/windows/wsl/install-manual) is required.

### For Windows Users (Optional)

* Install the Remote Development extension in Visual Studio.
* Press **F1** in Visual Studio, type  **"Remote"** , and select  **Remote Explorer: Focus on WSL Targets View** .

### Use the Starter (Recommended)

```bash
git clone https://github.com/elizaos/eliza-starter.git
cd eliza-starter
cp .env.example .env
pnpm i && pnpm build && pnpm start
```

Once the agent is running, You should see the message to run "pnpm start:client" at the end.
Open another terminal and move to same directory and then run below command and follow the URL to chat to your agent.

```bash
pnpm start:client
```

Then read the [Documentation](https://elizaos.github.io/eliza/) to learn how to customize your Eliza.

### Manually Start Eliza (Only recommended if you know what you are doing)

#### Checkout the latest release

```bash
# Clone the repository
git clone https://github.com/elizaos/eliza.git

# This project iterates fast, so we recommend checking out the latest release
git checkout $(git describe --tags --abbrev=0)
# If the above doesn't checkout the latest release, this should work:
# git checkout $(git describe --tags `git rev-list --tags --max-count=1`)
```

#### Edit the .env file

Copy .env.example to .env and fill in the appropriate values.

```bash
cp .env.example .env
```

> **Note:** .env is optional. If you're planning to run multiple distinct agents, you can pass secrets through the character JSON

#### Start Eliza

```bash
pnpm i
pnpm build
pnpm start

# The project iterates fast, sometimes you need to clean the project if you are coming back to the project
pnpm clean
```

---

### Interact via Browser

Once the agent is running, you should see the message to run "pnpm start:client" at the end.

Open another terminal, move to the same directory, run the command below, then follow the URL to chat with your agent.

```bash
pnpm start:client
```

Then read the [Documentation](https://elizaos.github.io/eliza/) to learn how to customize your Eliza.

---

### Automatically Start Eliza

The start script provides an automated way to set up and run Eliza:

```bash
sh scripts/start.sh
```

For detailed instructions on using the start script, including character management and troubleshooting, see our [Start Script Guide](./docs/docs/guides/start-script.md).

> **Note**: The start script handles all dependencies, environment setup, and character management automatically.

---

### Modify Character

1. Open `packages/core/src/defaultCharacter.ts` to modify the default character. Uncomment and edit.
2. To load custom characters:
   - Use `pnpm start --characters="path/to/your/character.json"`
   - Multiple character files can be loaded simultaneously
3. Connect with X (Twitter):
   - change `"clients": []` to `"clients": ["twitter"]` in the character file to connect with X

---

#### Additional Requirements

You may need to install Sharp. If you see an error when starting up, try installing it with the following command:

```bash
pnpm install --include=optional sharp
```

---

### Start Eliza with Gitpod

[![Open in Gitpod](https://gitpod.io/button/open-in-gitpod.svg)](https://gitpod.io/#https://github.com/elizaos/eliza/tree/main)

---

## 💬 Community & Contact

- [GitHub Issues](https://github.com/elizaos/eliza/issues) - Best for: bugs you encounter using Eliza, and feature proposals.
- [Discord](https://discord.gg/ai16z) - Best for: sharing your applications and hanging out with the community.

---

## 📄 Citation

We now have a [paper](https://arxiv.org/pdf/2501.06781) you can cite for the Eliza OS:

```bibtex
@article{walters2025eliza,
  title={Eliza: A Web3 friendly AI Agent Operating System},
  author={Walters, Shaw and Gao, Sam and Nerd, Shakker and Da, Feng and Williams, Warren and Meng, Ting-Chien and Han, Hunter and He, Frank and Zhang, Allen and Wu, Ming and others},
  journal={arXiv preprint arXiv:2501.06781},
  year={2025}
}
```

---

## 👥 Contributors

<div align="center">

[![Contributors](https://contrib.rocks/image?repo=elizaos/eliza)](https://github.com/elizaos/eliza/graphs/contributors)

</div>

---

## ⭐ Star History

<div align="center">

[![Star History Chart](https://api.star-history.com/svg?repos=elizaos/eliza&type=Date)](https://star-history.com/#elizaos/eliza&Date)

</div>


