const host = "http://localhost:8545"
require('@openzeppelin/test-helpers/configure')({
    provider: host,
    singletons: {
        abstraction: 'truffle',
    },
});
let Web3 = require("web3")

const web3 = new Web3(host);
const {expect} = require('chai');

const {
    BN,           // Big Number support
    constants,    // Common constants, like the zero address and largest integers
    expectEvent,  // Assertions for emitted events
    expectRevert, // Assertions for transactions that should fail
} = require('@openzeppelin/test-helpers');

const {setupLoader} = require('@openzeppelin/contract-loader');
const loader = setupLoader({
    provider: host,
    defaultGas: 8e6,
    defaultGasPrice: 20e9
}).truffle;

let accounts
const ERC20 = loader.fromArtifact('WePiggyToken');

describe('ERC20 22', async () => {
    beforeEach(async function () {
        accounts = await web3.eth.getAccounts();
        this.value = (new BN(1011)).toString();
        let wallet = web3.eth.accounts.wallet
        ERC20.setWallet(wallet)
        ERC20.defaults({
            from: accounts[0]
        })
        this.erc20 = await ERC20.new();
    });

    it('grantRole', async function () {
        const [owner, sender, receiver] = accounts;

        // Conditions that trigger a require statement can be precisely tested
        let foo = await this.erc20.name()
        console.log(foo)

        let _role = web3.utils.soliditySha3("MINTER_ROLE")
        await this.erc20.grantRole(_role, sender)

        let tx = await this.erc20.grantRole(_role, owner)
        console.log(tx.tx)
        // //
        let tx1 = await this.erc20.hasRole(_role, owner)
        console.log(tx1)

        // let foo1 = await this.erc20.hasRole(_role, owner)
        // console.log(foo1)
    });


});
