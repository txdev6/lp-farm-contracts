let network = "ropsten" //   rinkeby
let {projectId, privateKeys} = require("/Users/liyu/github/defi/secrets")

let host = `https://${network}.infura.io/v3/${projectId}`


require('@openzeppelin/test-helpers/configure')({
    provider: host,
    singletons: {
        abstraction: 'truffle',
    },
});
let Web3 = require("web3")

const {
    BN,           // Big Number support
    constants,
    expectEvent,  // Assertions for emitted events
    expectRevert, // Assertions for transactions that should fail
} = require('@openzeppelin/test-helpers');

const {setupLoader} = require('@openzeppelin/contract-loader');
const loader = setupLoader({
    provider: host,
    defaultGas: 8e6,
    defaultGasPrice: 20e9
}).truffle;

const PiggyBreeder = loader.fromArtifact('MintBreeder');
const WePiggyToken = loader.fromArtifact('MintToken');
// const AToken = loader.fromArtifact('AToken');
const ERC20 = loader.fromArtifact("ERC20")

module.exports = {
    async getArttifact() {
        const web3 = new Web3(host)

        // web3Provider = new Web3.providers.HttpProvider(host); //web3.providers.HttpProvider //

        let accounts = []
        privateKeys.map(val => {
            let account = web3.eth.accounts.wallet.add(val)
            accounts.push(account.address)
        })
        let wallet = web3.eth.accounts.wallet

        let [owner] = accounts


        PiggyBreeder.setWallet(wallet)

        // PiggyBreeder.setProvider(web3Provider);
        PiggyBreeder.defaults({
            from: owner
        })

        ERC20.setWallet(wallet)
        ERC20.defaults({
            from: owner
        })

        WePiggyToken.setWallet(wallet)
        WePiggyToken.defaults({
            from: owner
        })

        return {
            BN,
            web3,
            constants,
            accounts,
            ERC20,
            PiggyBreeder,
            WePiggyToken
        }
    }
}
