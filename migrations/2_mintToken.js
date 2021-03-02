/*
* @title set reserve params
* @author Mint
32. 执行PriceOracle.setEthUsdPrice(mock手动方式）
33. 执行PriceOracle.setAssetPrice (精度 1e18，相对于ETH的价格)
34. 执行LendingRateOracle.setMarketBorrowRate(精度1e27)
* */

const MintToken = artifacts.require("MintToken");

module.exports = async (deployer, network, accounts) => {
    await deployer.deploy(MintToken);
};
