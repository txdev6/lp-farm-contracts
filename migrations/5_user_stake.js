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
    let aDaiToken = '0x0000000000000000000000000000000000000000'

    let [alice, bob, carol, dev, minter] = accounts;
    if (network == "ropsten") {
        aDaiToken = "0xcB1Fe6F440c49E9290c3eb7f158534c2dC374201"
    } else {
        this.lp = await MockErc20.deployed()
        await this.lp.transfer(alice, '1000', {from: minter});
        await this.lp.transfer(bob, '1000', {from: minter});
        await this.lp.transfer(carol, '1000', {from: minter});
        // let foo = await this.lp.balanceOf(alice)
        // console.log(foo.toString())
        // let boo = await this.lp.balanceOf(minter)
        // console.log(boo.toString())


        await this.lp.approve(mintBreeder.address, '1000', {from: bob});
        await mintBreeder.stake(0, "10", {from: bob})

        await this.lp.approve(mintBreeder.address, '1000', {from: alice});
        await mintBreeder.stake(0, "20", {from: alice})

        await mintBreeder.stake(0, "30", {from: bob})

        let usersLength = await mintBreeder.usersLength(0)
        console.log("usersLength", usersLength.toString())

        for (let index = 0; index < usersLength.toNumber(); index++) {
            let userAddr = await mintBreeder.userAddresses(0, index)
            console.log(index, userAddr)
            let userInfo = await mintBreeder.userInfo(0, userAddr)
            console.log("amount", userInfo.amount.toString())
            console.log("rewardDebt", userInfo.rewardDebt.toString())
            console.log("pendingReward", userInfo.pendingReward.toString())
            console.log("unStakeBeforeEnableClaim", userInfo.unStakeBeforeEnableClaim, "\n")
        }
    }

    let poolLength = await mintBreeder.poolLength()
    console.log("poolLength", poolLength.toString())

    for (let index = 0; index < poolLength.toNumber(); index++) {
        let poolInfo = await mintBreeder.poolInfo(index)
        console.log("lpToken", poolInfo.lpToken)
        console.log("allocPoint", poolInfo.allocPoint.toString())
        console.log("lastRewardBlock", poolInfo.lastRewardBlock.toString())
        // console.log("accPiggyPerShare",poolInfo.accPiggyPerShare.toString())
        console.log("totalDeposit", poolInfo.totalDeposit.toString())
        console.log("migrator", poolInfo.migrator, "\n")
    }


};
