const host = "http://localhost:8545"
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

const PiggyBreeder = loader.fromArtifact('PiggyBreeder');
const WePiggyToken = loader.fromArtifact('WePiggyToken');
// const AToken = loader.fromArtifact('AToken');
const ERC20 = loader.fromArtifact("ERC20")


module.exports = {
    async getArttifact() {
        const web3 = new Web3(host);
        const accounts = await web3.eth.getAccounts();
        let [owner] = accounts


        let wallet = web3.eth.accounts.wallet
        PiggyBreeder.setWallet(wallet)
        PiggyBreeder.defaults({
            from: owner
        })

        // AToken.setWallet(wallet)
        // AToken.defaults({
        //     from: owner
        // })

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


