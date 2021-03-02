const provider = require("./base/provider")

describe('Atokn starking', async () => {


    let owner, dev, sender, constants
    before(async function () {
        const {PiggyBreeder, WePiggyToken, ERC20, accounts, web3, BN, constants} = await provider.getArttifact();
        [owner, dev, sender] = accounts;
        this.value = (new BN(1011)).toString();
        let _wpc = await WePiggyToken.new();
        this.wePiggyTokenInstance = _wpc
        this.web3 = web3

        let _role = web3.utils.soliditySha3("MINTER_ROLE")
        await _wpc.grantRole(_role, owner, {from: owner})


        // let _breeder = await PiggyBreeder.new(
        //     _wpc.address, // WePiggyToken _piggy,
        //     dev, //     address _devAddr,
        //     1, //     uint256 _piggyPerBlock,
        //     1, //     uint256 _startBlock,
        //     1,  //     uint256 _enableClaimBlock,
        //     1,  //     uint256 _reduceIntervalBlock,
        //     10, //     uint256 _reduceRate,
        //     2, //     uint256 _devMiningRate
        // )
        // console.log("_breeder address", _breeder.address)

        let _breeder = await PiggyBreeder.at("0x7a9A10fb0243c875285A37962c090dC9EfdF07C8")

        let poolLength = await _breeder.poolLength()
        console.log("poolLength", poolLength.toString())

        this.piggyBreederInstance = _breeder


        this.aToken = await ERC20.at("0x4904643BA7a13cC4cDE86508300C905F83379F8C")
        let balance = await this.aToken.transfer(sender, "2")
        let sendBalance = await this.aToken.balanceOf(sender)
        // console.log(balance.tx)
        // console.log("sendBalance", sendBalance.toString())

        await this.aToken.approve(_breeder.address, "10000000000")
        await this.aToken.approve(_breeder.address, "10000000000", {from: sender})


        //增加挖矿池
        // let tx = await _breeder.add("10", this.aToken.address, this.aToken.address, false) //constants.ZERO_ADDRESS
        // console.log(tx.tx)

    });

    async function timeTravel(seconds) {
        await this.web3.currentProvider.send({id: 0, jsonrpc: '2.0', method: 'evm_increaseTime', params: [seconds]});
        await this.web3.currentProvider.send({id: 0, jsonrpc: '2.0', method: 'evm_mine', params: []});
    }

    it('add pool', async function () {

        // function add(uint256 _allocPoint, IERC20 _lpToken, IMigrator _migrator, bool _withUpdate)
        let tx = await this.piggyBreederInstance.add("1", this.aToken.address, constants.ZERO_ADDRESS, false)
        console.log(tx.tx)

    })

    it("pendingPiggy", async function () {
        let foo = await this.piggyBreederInstance.allPendingPiggy(this.piggyBreederInstance.address)
        console.log(foo.toString())
    })

    it("allPendingPiggy", async function () {
        let foo = await this.piggyBreederInstance.pendingPiggy(0, sender)
        console.log(foo.toString())
    })


    it('stake ', async function () {
        let tx = await this.piggyBreederInstance.stake(0, "20")
        let _role = this.web3.utils.soliditySha3("MINTER_ROLE")

        await this.wePiggyTokenInstance.grantRole(_role, sender, {from: owner})
        let foo1 = await this.wePiggyTokenInstance.hasRole(_role, sender)
        let foo2 = await this.wePiggyTokenInstance.hasRole(_role, this.piggyBreederInstance.address)
        console.log(foo1, foo2)

        console.log(owner, sender, this.piggyBreederInstance.address)
        let tx1 = await this.piggyBreederInstance.stake(0, "2000", {from: sender})
        console.log(tx1.tx)

        let foo3 = await this.piggyBreederInstance.pendingPiggy(0, this.piggyBreederInstance.address)
        console.log(foo3.toString())

        let foo = await this.piggyBreederInstance.allPendingPiggy(owner)
        console.log(foo.toString())
    })

    it('mint ', async function () {
        let _role = this.web3.utils.soliditySha3("MINTER_ROLE")
        let foo1 = await this.wePiggyTokenInstance.hasRole(_role, owner)
        console.log(foo1)
        await this.wePiggyTokenInstance.mint(sender, 20)

        let totalSupply = await this.wePiggyTokenInstance.totalSupply()
        console.log(totalSupply.toString())
        let _balance = await this.wePiggyTokenInstance.balanceOf(owner)
        console.log(_balance.toString())
    })


    it("userInfo", async function () {
        let usersLength = await this.piggyBreederInstance.usersLength(0)
        console.log(usersLength.toString())

        // let userInfo = await this.piggyBreederInstance.userInfo(0, sender)
        console.log(owner, sender)
        // console.log("amount", userInfo.amount.toString())
        // console.log("rewardDebt", userInfo.rewardDebt.toString())
        // console.log("pendingReward", userInfo.pendingReward.toString())
        // console.log("unStakeBeforeEnableClaim", userInfo.unStakeBeforeEnableClaim)

        for (let index = 0; index < usersLength.toNumber(); index++) {
            let userAddresses0 = await this.piggyBreederInstance.userAddresses(0, index)
            console.log("0", index, userAddresses0)

            // let userInfo = await this.piggyBreederInstance.userInfo(0, sender)

            // console.log("amount", userInfo.amount.toString())
            // console.log("rewardDebt", userInfo.rewardDebt.toString())
            // console.log("pendingReward", userInfo.pendingReward.toString())
            // console.log("unStakeBeforeEnableClaim", userInfo.unStakeBeforeEnableClaim)
        }


    })

    it('poolInfo ', async function () {
        // let reduceRate = await this.piggyBreederInstance.reduceRate()
        // console.log(reduceRate.toString())
        let poolLength = await this.piggyBreederInstance.poolLength()
        console.log("poolLength",poolLength.toString())

        for (let index = 0; index < poolLength.toNumber(); index++) {
            let poolInfo = await this.piggyBreederInstance.poolInfo(index)
            console.log("lpToken",poolInfo.lpToken)
            console.log("allocPoint",poolInfo.allocPoint.toString())
            console.log("allocPoint",poolInfo.lastRewardBlock.toString())
            console.log("accPiggyPerShare",poolInfo.accPiggyPerShare.toString())
            console.log("totalDeposit",poolInfo.totalDeposit.toString())
            console.log("migrator",poolInfo.migrator,"\n")
        }


    })


});
