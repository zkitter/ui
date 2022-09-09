# Zkitter UI

[![Discord](https://img.shields.io/discord/887573677959417889)](https://discord.com/invite/GVP9MghwXc)

This repo is home to website [Zkitter](https://zkitter.com).

## Requirements
- Node 12.22+
- NPM 6.14+

### Configurations
You can set configuration using environment variable or by creating a `config.prod.json` or `config.dev.json` file. You can see a sample of the config file [here](./config.sample.json).

| Name | Description |  
| ------------- |-------------| 
| `WEB3_HTTP_PROVIDER` | a valid Http provider (e.g. `https://mainnet.infura.io/v3/<project-id>`) |
| `ENS_RESOLVER` | contract address for ENS Public Resolver |
| `GUN_PEERS` | Seed peers to connect to for GunDB. |
| `ARB_HTTP_PROVIDER` | a valid Http provider to Arbitrum network (e.g. `https://arbitrum.infura.io/v3/<project-id>`). |
| `ARB_REGISTRAR` | Contract address for the [Zkitter registration contract](https://github.com/zkitter/contracts). |
| `ARB_ADDRESS` | The Arbitrum address to be used to fund onboarding. |
| `BASE_URL` | Base URL to the server. |
| `INDEXER_API` | URL to [Zkitter API](https://docs.zkitter.com/developers/api). |
| `INTERREP_API` | URL to [Interep API](https://docs.interep.link/api). |

## Build Instructions

**Installation**
```
npm i
```

**Unit test**
```
npm t
```

**Run Developement Server**
```
npm run dev
```

**Production Build**
```
npm run build
```

**Run in production**
```
npm start
```
