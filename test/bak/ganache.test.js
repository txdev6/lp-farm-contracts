const host = "http://127.0.0.1:8545"
require('@openzeppelin/test-helpers/configure')({
    provider: host,
    singletons: {
        abstraction: 'truffle',
    },
});

let Web3 = require("web3")
// const {accounts, defaultSender} = require('@openzeppelin/test-environment');

// let provider = new Web3.providers.HttpProvider(host)

const web3 = new Web3(host);


// const [owner] = accounts;
// console.debug(contract)

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
//
const WePiggyToken = loader.fromArtifact('WePiggyToken');
const PiggyBreeder = loader.fromArtifact('PiggyBreeder');
const AToken = loader.fromArtifact('AToken');

(async () => {

    let accounts = await web3.eth.getAccounts()
    let [ower, send] = accounts

    // console.log(accounts)

    let wallet = web3.eth.accounts.wallet
    // WePiggyToken.setWallet(wallet)
    // WePiggyToken.defaults({
    //     from: ower
    // })
    // let piggy = await WePiggyToken.new();
    // let name = await piggy.name()
    // console.log(piggy.address,name)

    // let piggyAddr = "0xeea2Fc1D255Fd28aA15c6c2324Ad40B03267f9c5"
    PiggyBreeder.setWallet(wallet)
    PiggyBreeder.defaults({
        from: ower
    })
    // let breeder = await PiggyBreeder.new(piggyAddr,ower,1,1,1,1,10,1);
    let breeder = await PiggyBreeder.at("0xe97DbD7116D168190F8A6E7beB1092c103c53a12")
    //
    //
    let bPiggyAddr = await breeder.piggy()
    console.log(bPiggyAddr, "breeder Addr", breeder.address)

    let startBlock = await breeder.startBlock()
    console.log(startBlock.toString())

    let _allocPoint = 1;
    let _lpToken = "0x35266EA1A26e880163a678db7C3E4dDc06d4A8Ab"
    // let tx = await breeder.add(_allocPoint, _lpToken, _lpToken, false);

    let poolLenght = await breeder.poolLength();

    // let poolInfo = await breeder.poolInfo()

    let devMiningRate =await breeder.devMiningRate()
    console.log(devMiningRate.toString())


    console.log(poolLenght.toString())

})()
