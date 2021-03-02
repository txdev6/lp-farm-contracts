const provider = require("./base/infura.provider")

describe('Mint Atokn starking', async () => {
    let owner, sender
    let mintAddr = "0xD99501cEC2D253B918a6af1928Fa1272a9f231fE"
    let aDaiAddr = "0xF8dAcF50a51722C7b37F600D924B14Af9382EFC1"
    before(async function () {
        const {PiggyBreeder, WePiggyToken, ERC20, accounts, web3, BN, constants} = await provider.getArttifact();
        [owner, sender] = accounts;
        this.web3 = web3
        console.log("owner", owner)
        console.log("sender", sender)

        this.piggyBreeder = await PiggyBreeder.at(mintAddr)
        this.aDaiToken = await ERC20.at(aDaiAddr)

    });


    it('stake ', async function () {
        let ownerBalance = await this.aDaiToken.balanceOf(owner)
        let obalance = this.web3.utils.fromWei(ownerBalance.toString(), "ether")
        console.log("owner Balance", obalance)
        let senderBalance = await this.aDaiToken.balanceOf(sender)
        let sbalance = this.web3.utils.fromWei(senderBalance.toString(), "ether")
        console.log("sender Balance", sbalance)

        let approveAmount = this.web3.utils.toWei("10", "ether")
        let stakeAmount = this.web3.utils.toWei("2", "ether")
        await this.aDaiToken.approve(mintAddr, approveAmount, {from: sender})
        let tx = await this.piggyBreeder.stake(0, stakeAmount, {from: sender})
        console.log(tx.tx)
    })

});
