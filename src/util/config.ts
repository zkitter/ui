let json: {
    web3HttpProvider?: string;
    ensResolver?: string;
    indexerAPI?: string;
} = {};

try {
    json = require('../../config.json');
} catch (e) {}

const web3HttpProvider = json.web3HttpProvider || process.env.WEB3_HTTP_PROVIDER;
const ensResolver = json.ensResolver || process.env.ENS_RESOLVER;
const indexerAPI = json.indexerAPI || process.env.INDEXER_API || 'http://localhost:3000';

if (!web3HttpProvider) {
    throw new Error('WEB3_HTTP_PROVIDER is not valid');
}

if (!ensResolver) {
    throw new Error('ENS_RESOLVER is not valid');
}

const config = {
    web3HttpProvider,
    ensResolver,
    indexerAPI,
};

export default config;