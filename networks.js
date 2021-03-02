const {projectId, adminKey} = require('../secrets.json');
const HDWalletProvider = require('@truffle/hdwallet-provider');
module.exports = {
    networks: {
        development: {
            protocol: 'http',
            host: 'localhost',
            port: 8545,
            gas: 5000000,
            gasPrice: 5e9,
            networkId: '*',
        },
        rinkeby: {
            provider: () => new HDWalletProvider(
                adminKey, `https://rinkeby.infura.io/v3/${projectId}`
            ),
            networkId: 4,
            gasPrice: 10e9
        },
        ropsten: {
            provider: () => new HDWalletProvider(
                adminKey, `https://ropsten.infura.io/v3/${projectId}`
            ),
            networkId: 3,
            gasPrice: 10e9
        }
    },
};
