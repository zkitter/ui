let json: {
    web3HttpProvider?: string;
    ensResolver?: string;
    arbitrumHttpProvider?: string;
    arbitrumRegistrar?: string;
    arbitrumExplorer?: string;
    indexerAPI?: string;
    gunPeers?: string[];
} = {};

try {
    json = require(process.env.NODE_ENV === 'development'
        ? '../../config.dev.json'
        : '../../config.prod.json');
} catch (e) {}

const web3HttpProvider = json.web3HttpProvider || process.env.WEB3_HTTP_PROVIDER;
const ensResolver = json.ensResolver || process.env.ENS_RESOLVER;
const arbitrumHttpProvider = json.arbitrumHttpProvider || process.env.ARB_HTTP_PROVIDER;
const arbitrumRegistrar = json.arbitrumRegistrar || process.env.ARB_REGISTRAR;
const arbitrumExplorer = json.arbitrumExplorer || process.env.ARB_EXPLORER;
const indexerAPI = json.indexerAPI || process.env.INDEXER_API || 'http://localhost:3000';
const gunPeers = json.gunPeers || process.env.GUN_PEERS?.split(' ') || [];

if (!web3HttpProvider) {
    throw new Error('WEB3_HTTP_PROVIDER is not valid');
}

if (!ensResolver) {
    throw new Error('ENS_RESOLVER is not valid');
}

if (!arbitrumHttpProvider) {
    throw new Error('ARB_HTTP_PROVIDER is not valid');
}

if (!arbitrumRegistrar) {
    throw new Error('ARB_REGISTRAR is not valid');
}

if (!arbitrumExplorer) {
    throw new Error('ARB_EXPLORER is not valid');
}

const config = {
    web3HttpProvider,
    ensResolver,
    indexerAPI,
    gunPeers,
    arbitrumHttpProvider,
    arbitrumRegistrar,
    arbitrumExplorer,
};

export default config;