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
const PiggyBreeder = loader.fromArtifact('PiggyBreeder');
const AToken = loader.fromArtifact('AToken');
const ERC20 = loader.fromArtifact("ERC20")

// Decimals = 6
// USDT 0x5b9b42d6e4B2e4Bf8d42Eba32D46918e10899B66 aToken 0x35266EA1A26e880163a678db7C3E4dDc06d4A8Ab

describe('ERC20 22', async () => {
    beforeEach(async function () {
        accounts = await web3.eth.getAccounts();
        this.value = (new BN(1011)).toString();
        let wallet = web3.eth.accounts.wallet
        PiggyBreeder.setWallet(wallet)
        PiggyBreeder.defaults({
            from: accounts[0]
        })
        this.breeder = await PiggyBreeder.at("0xb376Fe7C7E4d646A9462494461313Ff7928A55AD")

        ERC20.setWallet(wallet)
        ERC20.defaults({
            from: accounts[0]
        })

        AToken.setWallet(wallet)
        AToken.defaults({
            from: accounts[0]
        })

        this.token = await ERC20.at("0xE45fF4A0A8D0E9734C73874c034E03594E15ba28")
        this.aToken = await AToken.at("0x4904643BA7a13cC4cDE86508300C905F83379F8C")

        let isApprove = await this.aToken.approve(this.breeder.address, "1000000000")
        console.log("isApprove",isApprove.tx)

    });

    it('balance', async function () {
        const [owner, sender, receiver] = accounts;
        let balance = await this.token.balanceOf(sender)
        let aBalance = await this.aToken.balanceOf(owner)
        console.log(balance.toString(), aBalance.toString())
    });

    it('add', async function () {
        const [owner, sender, receiver] = accounts;
        let foo = await this.aToken.name()
        console.log(foo)
        let symbol = await this.aToken.symbol()
        console.log(this.aToken.address, symbol)
        let _role = web3.utils.soliditySha3("MINTER_ROLE")
        // function add(uint256 _allocPoint, IERC20 _lpToken, IMigrator _migrator, bool _withUpdate)
        let tx = await this.breeder.add("1", this.aToken.address, this.aToken.address, false)
        console.log(tx.tx)

    });


    it('stake', async function () {
        const [owner, sender, receiver] = accounts;
        let poolLength = await this.breeder.poolLength()
        console.log("poolLength",poolLength.toString())
        // stake(uint256 _pid, uint256 _amount)
        let tx = await this.breeder.stake(1,"10")
        console.log(tx.tx)

    });




});
