# Eliza 🤖 on Cosmos Interchain - using AKASH powered ressources

<div align="center">
  <img src="./docs/static/img/eliza_banner.jpg" alt="Eliza Banner" width="60%" />
</div>

<div align="center">

📖 [Documentation](https://elizaos.github.io/eliza/) | 🎯 [Examples](https://github.com/thejoven/awesome-eliza)

</div>


## 🚩 Overview

<div align="center">
  <img src="./docs/static/img/eliza_diagram.png" alt="Eliza Diagram" width="100%" />
</div>

## ✨ Features

- 🛠️ Full-featured Discord, Twitter and Telegram connectors
- 🔗 Support for every model (Llama, Grok, OpenAI, Anthropic, etc.)
- 👥 Multi-agent and room support
- 📚 Easily ingest and interact with your documents
- 💾 Retrievable memory and document store
- 🚀 Highly extensible - create your own actions and clients
- ☁️ Supports many models (local Llama, OpenAI, Anthropic, Groq, etc.)
- 📦 Just works!


# This guide wants to empower communities to run their own community bots with ease, but would be a nasty plague in the hand of scammers
So: Please share this guide only with teams, devs, communities and builder you trust and have faith in.

Scammers killing the spaces, making people leaving and disappoining the ecosystem--
Dear Scammers, you ngmi, get a real life and stop abusing people-- talented people don't need to scam, but you would be better of shaming yourself

### Prerequisites

- [Python 2.7+](https://www.python.org/downloads/)
- [Node.js 23+](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)
- nvm use v23.3.0 or nvm alias default v23.3.0
- [pnpm](https://pnpm.io/installation)
- 



### Create filestructure


git clone https://github.com/elizaos/eliza.git

``

### Edit the .env file. This file holds all API Keys, Seedphrases and Twitter/Discord/Telegram credentials ... don´t share it

Copy .env.example to .env and fill in the appropriate values. Fills the file with default values first

```
cp .env.example .env
```

to edit the file:
nano .env 
    nano commands: CTRL+X Save and Exit
                    CTRL+W Search
                    

### Get Akash API KEY
Go to https://chatapi.akash.network/ and Generate a API KEY. Question How to use the service? Taking Cosmos into AI age
The API is free to use, and you don't need to re-confirm your email... but it is rate-limited on a per-hour-basis. This limit is set way igher than casual users will ever need it, only from training purposes you will have to chunk the tasks or run a dedicated environment as described below

now edit the .env and add these keys:

```bash
nano .env
```
Search for "AKASH"... CTRL + W
Enter your key
```bash
AKASH_CHAT_API_KEY=sk-1agDViherhwqzr3r # REPLACE YOUR KEY HERE
```
Save with CTRL + X


exit & save

### Edit your character file

head into the character folder:
```
cd characters
```
create a template of c3po.character.json to use as a template for your own model:
```
cp c3po.character.json avatar.character.json
nano avatar.character.json
```
The structure is structured like this:
bio:  The self-definition passed to the LLM (sub-concisousness so to say)
lore: Examples of expression, used to generate the style of texting
knowledge: These are memories at genesis, so if you want your bot to know your website, discord url, etc.. add it here

The header should be set like this, so fill in the modelProvider, in our case this should be:
```
 "modelProvider": "akash_chat_api",
```
"clients" should be left empty for now, as we need to create Bot Tokens for them to work properly. You add "telegram","discord","twitter" later in a comma seperated way

```
{
    "name": "Avatar",
    "clients": ["telegram","discord","twitter"],
    "modelProvider": "akash_chat_api",
    "settings": {
        "secrets": {},
        "voice": {
            "model": "en_US-male-medium"
```

  


### First build initialization

```bash
pnpm i
pnpm build
pnpm start --characters="~./eliza/characters/avatar.character.json"`
```
This should start a running instance

- To keep the instance running after logoff you need process manager pm2:
-```
-  npm install pm2
-```


To start the process via pm2

```
pm2 start pnpm --name eliza -- start -- --character=./eliza/characters/avatar.character.json

```

This creates a process, check the status or end the daemon. use pm2 save to save the process
```
-     pm2 start eliza
-     pm2 stop eliza
-     pm2 log
-     pm2 status
-     pm2 start "pnpm" -- start --character="/yourpath/characters/avatar.character.json" to create pm2 entry
      pm2 save
```


### First Chat

Open a new window, run pnpm start:client
Head to the website displayed there


### Telegram Connection
https://telegram.me/BotFather
actually pretty easy, copy&paste your bot token into the .env

add "telegram" to your characterfiles header:

Example:
```
{
    "name": "Bud",
    "plugins": ["@elizaos/plugin-web-search"],
    "clients": ["telegram"],
    "modelProvider": "akash_chat_api",
    "settings": {
        },
        "voice": {
            "model": "en_US-male-medium"
        }
    },
```

beware: you need to leave a space behind the ":" after "clients": ---> 
so this is correct:  
```"clients": ["telegram"],```
but not ```"clients":["telegram"],```
the full set would look like: ["telegram","twitter","discord"],

damn syntax handlers...;)

### Discord Connection
Head to and create a Bot Token
https://discord.com/developers

Somehow you need to "reset" your token, otherwise you wont see the necessary token (not just numbers, looks like this: TMzMDEzMzE4Njc.....
Then you can use the invite link generated during startup to add them to your server

You need to set bot permission intentions all to the right, that are disbled by default
then enter your Application ID and the API Token like shown below:

## Advanced Character settings:

Example:
```
{
    "name": "Bud",
    "plugins": ["@elizaos/plugin-web-search"],
    "clients": ["discord"],
    "modelProvider": "akash_chat_api",
    "settings": {
        "secrets": {
            "DISCORD_APPLICATION_ID": "1330176587323924",
            "DISCORD_API_TOKEN": "MTMzMDEzMzE4NjczNnewf9843f984r98E_9dK3zQp577QWKjS4i-wz78"
        },
        "voice": {
            "model": "en_US-male-medium"
        }
    },
```

 ```"secrets"``` : This overrides the values given in .env for that specific character. So you can give characters unique tg handles or discord id's
 
```"plugins"``` to embed plugins from the /packages folder. remember to run "npm add eliaos@your-new-lugin" from the main directory to fetch dependencies first

Best Plugins right now are
-web-search (Gives the ability to handle an online search if the model requires more information
-dexscreener-API
-coingecko-API
-image-generation
-video-generation
-speech-synthesis (can join discord voice channels)
-twitter (no API access needed) 
-discord
-telegram
-whatsapp


### Accessing the Database:
```
cd /agent/data
```
here you'll find the db.sqlite file

get yourself sqlitebrowser and run:
```
sqlitebrowser db.sqlite
```
check the "memory" table...


## Advanced Vector Indexing Database:
This is not necessary for character imitating models, but is useful for big workloads and long-trained models:
You can upscale your Database in CPU and HDD with growing demand later easily

Deploy an AKASh Postgres Vector enabled Database with this YAML Sheet:
https://console.akash.network/

```
---
version: "2.0"

services:
  postgres:
    image: ankane/pgvector 
    expose:
      - port: 5432
        to:
          - global: true
    env:
      - PGDATA=/var/lib/postgresql/data/pgdata
      - "POSTGRES_USER=admin"
      - "POSTGRES_PASSWORD=let-me-in"
      - "POSTGRES_DB=mydb"
    params:
      storage:
        data:
          mount: /var/lib/postgresql/data
          readOnly: false
profiles:
  compute:
    postgres:
      resources:
        cpu:
          units: 4.0
        memory:
          size: 8Gi
        storage:
          - size: 20Gi
          - name: data
            size: 20Gi
            attributes:
              persistent: true
              class: beta3
          
  placement:
    akash:
      attributes:
        host: akash
      signedBy:
        anyOf:
          - "akash1365yvmc4s7awdyj3n2sav7xfx76adc6dnmlx63"
      pricing:
        postgres: 
          denom: uakt
          amount: 10000

deployment:
  postgres:
    akash:
      profile: postgres
      count: 1 
```
change username and password and
adjust and scale the cpu, hdd to your need

after deployment, add the login to the .env file:
```
POSTGRES_URL=postgresql://eliza:yourpassword@provider.akash.ddns.net:yourportassigned/eliza_db
```

use pgadmin4 to access and backup the database via webbrowser

### Run a AKASH dedicated Engine
If you get blocked by the akash chat api because you consume too much computing power, condsider to run a dedicated instance temporarly:

Use this yaml to deploy:
```
---
version: "2.0"
services:
  ollama:
    ############################
    image: ollama/ollama:0.3.6
    ############################
    #Always check https://hub.docker.com/r/ollama/ollama/tags for the latest version tag!
    expose:
      - port: 11434
        as: 11434
        to:
          - global: true
    env:
    #######################
      - MODEL=llama3.1:405b 
    #######################
    #Supports any model from : https://ollama.com/library
    command:
      - /bin/sh
      - -c
      - |
        ollama serve & 
        while ! ollama pull ${MODEL}; do
          echo "Waiting for ollama pull to succeed..."
          sleep 2.5
        done
        ollama list
        pkill ollama
        ollama serve
profiles:
  compute:
    ollama:
      resources:
        cpu:
          units: 8
        #Higher is better for AI! Be sure to change thread setting in app.
        memory:
          size: 28Gi
        #7B requires about 4.5GB of free RAM
        #13B requires about 12GB free
        #30B requires about 20GB free // 24 not enough
        storage:
          size: 100Gi
        #Bigger models may require more storage.
        #Increase as required.
        gpu:
          units: 1
          attributes:
            vendor:
              nvidia: 
  placement:
    akash:
      #######################################################
      #Keep this section to deploy on trusted providers
      signedBy:
        anyOf:
          - "akash1365yvmc4s7awdyj3n2sav7xfx76adc6dnmlx63"
      #######################################################
      #Remove this section to deploy on untrusted providers
      #Beware* You may have deployment, security, or other issues on untrusted providers
      #https://docs.akash.network/providers/akash-audited-attributes
      pricing:
        ollama:
          denom: uakt
          amount: 10000
deployment:
  ollama:
    akash:
      profile: ollama
      count: 1
```
down-adjust some values, this version costs lot of $$ a month..
You can close your deploy anytime and get your remaining depost back, so if you need it just for 1-2h its pretty cheap though
so add these lines into your .env:

## Ollama Configuration
```
OLLAMA_SERVER_URL=http://your-assgined-server:your-mapped-port               # Default: localhost:11434
OLLAMA_MODEL=llama3.1:405b
OLLAMA_EMBEDDING_MODEL=mxbai-embed-large         # Default: mxbai-embed-large
SMALL_OLLAMA_MODEL=llama3.1:405b             # Default: llama3.2
MEDIUM_OLLAMA_MODEL=llama3.1:405b          # Default: hermes3
LARGE_OLLAMA_MODEL=llama3.1:405b   
```
you need to set the model to llama3.1:405b for small, medium, and large
also change the given modelprovider in the characterfile from "akash_chat_api" to "ollama"


## Get the big thing: 
If it comes to 3d realtime generation, speech synthesis and live Video modelling, maybe this one suits your needs:
```
---
version: "2.0"
services:
  vllm:
    image: vllm/vllm-openai:v0.6.2@sha256:730ef3d3c17a217b34cfdbfd99be80b3f459e37ef2fc0c5c43ba70752dad08ae
    expose:
      - port: 8000
        as: 8000
        to:
          - global: true
    command:
      - bash
      - "-c"
    args:
      - >- 
        vllm serve hugging-quants/Meta-Llama-3.1-405B-Instruct-AWQ-INT4 
        --tensor-parallel-size 8 
        --speculative-model meta-llama/Meta-Llama-3.1-8B-Instruct 
        --num-speculative-tokens 5 
        --use-v2-block-manager
    env:
      - "HF_TOKEN=" # Hugging Face API token required for Meta-Llama Models
      #- "NCCL_DEBUG=INFO" # Uncomment to enable NCCL debugging
    params:
      storage:
        shm:
          mount: /dev/shm
        data:
          mount: /root/.cache
          readOnly: false
profiles:
  compute:
    vllm:
      resources:
        cpu:
          units: 16
        memory:
          size: 128Gi
        storage:
          - size: 100Gi
          - name: data
            size: 1000Gi
            attributes:
              persistent: true
              class: beta3
          - name: shm
            size: 10Gi
            attributes:
              class: ram
              persistent: false
        gpu:
          units: 8
          attributes:
            vendor:
              nvidia:
                - model: h100
                  ram: 80Gi
                - model: a100
                  ram: 80Gi
  placement:
    dcloud:
      pricing:
        vllm:
          denom: uakt
          amount: 1000000
deployment:
  vllm:
    dcloud:
      profile: vllm
      count: 1
```


# Cosmos Transaction Module:

for now its working solely for tx bank transfers, but with SKIP API it will be able to IBC, trade and stake tokens
more to come soon....




- [Discord](https://discord.gg/ai16z). Best for: sharing your applications and hanging out with the community.

## Contributors

<a href="https://github.com/elizaos/eliza/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=elizaos/eliza" />
</a>

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=elizaos/eliza&type=Date)](https://star-history.com/#elizaos/eliza&Date)
