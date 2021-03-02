/*
* @title set reserve params
* @author Mint
32. 执行PriceOracle.setEthUsdPrice(mock手动方式）
33. 执行PriceOracle.setAssetPrice (精度 1e18，相对于ETH的价格)
34. 执行LendingRateOracle.setMarketBorrowRate(精度1e27)
* */

const MintToken = artifacts.require("MintToken");
const MintBreeder = artifacts.require("MintBreeder");

module.exports = async (deployer, network, accounts) => {
    let [ower, devAddr] = accounts
    if (network == "ropsten") {
        devAddr = "0x9F7A946d935c8Efc7A8329C0d894A69bA241345A"
    }
    let blockNum = await web3.eth.getBlockNumber()
    let mintPerBlock = web3.utils.toWei("1", "ether")
    let startBlock = blockNum
    let enableClaimBlock = blockNum + 100
    let reduceIntervalBlock = blockNum + 200
    let reduceRate = "999"
    let devMiningRate = "39"
    let mintToken = await MintToken.deployed()

    let mintAddr = mintToken.address
    console.log("mintToken Address:", mintAddr)
    let params = [
        mintAddr,
        devAddr,
        mintPerBlock,
        startBlock,
        enableClaimBlock,
        reduceIntervalBlock,
        reduceRate,
        devMiningRate
    ]
    // console.log(params)
    await deployer.deploy(MintBreeder, ...params);
    let mintBreeder = await MintBreeder.deployed()
    console.log("mintBreeder", mintBreeder.address)

    // 设置 mintBreeder 为挖矿角色
    let role = web3.utils.soliditySha3("MINTER_ROLE")
    await mintToken.grantRole(role, mintBreeder.address);

    let foo1 = await mintToken.hasRole(role, mintBreeder.address)
    console.log("MINTER_ROLE", mintBreeder.address, foo1)
};
