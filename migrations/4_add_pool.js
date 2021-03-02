/*
* @title set reserve params
* @author Mint
32. 执行PriceOracle.setEthUsdPrice(mock手动方式）
33. 执行PriceOracle.setAssetPrice (精度 1e18，相对于ETH的价格)
34. 执行LendingRateOracle.setMarketBorrowRate(精度1e27)
* */

const MockErc20 = artifacts.require('MockErc20');
const MintBreeder = artifacts.require("MintBreeder");

module.exports = async (deployer, network, accounts) => {
    let mintBreeder = await MintBreeder.deployed()
    let allocPoint = "100"
    let migrator = '0x0000000000000000000000000000000000000000'
    let withUpdate = true

    let [alice, bob, carol, dev, minter] = accounts;
    if (network == "ropsten") {
        let aDaiToken = "0xF8dAcF50a51722C7b37F600D924B14Af9382EFC1"
        let aUSDTToken = '0x5e5Fbc55b93e77a60BfFA9c50A6524ACDe1496a8'
        await mintBreeder.add(allocPoint, aDaiToken, migrator, withUpdate)
        await mintBreeder.add(allocPoint, aUSDTToken, migrator, withUpdate)
    } else {
        await deployer.deploy(MockErc20, 'LPToken', 'LP', '10000000000', {from: minter});
        let lp = await MockErc20.deployed()
        await mintBreeder.add(allocPoint, lp.address, migrator, withUpdate)
    }

    // await mintBreeder.add(allocPoint, "0xcB1Fe6F440c49E9290c3eb7f158534c2dC374201", migrator, withUpdate)

};
