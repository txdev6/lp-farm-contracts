const {accounts, contract, web3} = require('@openzeppelin/test-environment');
const {
    BN,          // Big Number support
    ether,
    constants,    // Common constants, like the zero address and largest integers
    expectEvent,  // Assertions for emitted events
    expectRevert, // Assertions for transactions that should fail
    time,
} = require('@openzeppelin/test-helpers');

const {expect} = require('chai');

const MintToken = contract.fromArtifact('MintToken'); // Loads a compiled contract
const MintBreeder = contract.fromArtifact('MintBreeder');
const MockErc20 = contract.fromArtifact('MockErc20');

describe('MintBreeder', function () {
    const [alice, bob, carol, dev, minter] = accounts;
    // this.value = new BN(1000);
    this.timeout(15000);

    beforeEach(async () => {
        this.mintToken = await MintToken.new();
        // this.mintToken.initialize();
        this.zeroAddress = constants.ZERO_ADDRESS
        this.role = web3.utils.soliditySha3("MINTER_ROLE")
        this.mintPerBlock = ether("1").toString()

    });


    it('should set correct state variables', async () => {

        this.mintBreeder = await MintBreeder.new(this.mintToken.address, dev, this.mintPerBlock, '0', '1000', '5760', '999', '39');

        expect(await this.mintBreeder.mint()).to.equal(this.mintToken.address);
        expect(await this.mintBreeder.devAddr()).to.equal(dev);
        expect(await this.mintBreeder.mintPerBlock()).to.be.bignumber.equal(this.mintPerBlock);
        expect(await this.mintBreeder.enableClaimBlock()).to.be.bignumber.equal('1000');
        expect(await this.mintBreeder.reduceIntervalBlock()).to.be.bignumber.equal('5760');
        expect(await this.mintBreeder.devMiningRate()).to.be.bignumber.equal('39');
        expect(await this.mintBreeder.reduceRate()).to.be.bignumber.equal('999');
    });

    context('During the first decay period, ERC/LP tokens are added to the field', () => {
        let _mintPerBlock = '1000000000000000000'
        beforeEach(async () => {
            this.lp = await MockErc20.new('LPToken', 'LP', '10000000000', {from: minter});
            // this.lp.initialize('LPToken', 'LP', minter, '10000000000');
            await this.lp.transfer(alice, '1000', {from: minter});
            await this.lp.transfer(bob, '1000', {from: minter});
            await this.lp.transfer(carol, '1000', {from: minter});

            this.lp2 = await MockErc20.new('LPToken', 'LP', '10000000000', {from: minter});
            // this.lp2.initialize('LPToken', 'LP', '10000000000',{from: minter});
            await this.lp2.transfer(alice, '1000', {from: minter});
            await this.lp2.transfer(bob, '1000', {from: minter});
            await this.lp2.transfer(carol, '1000', {from: minter});
        });


        it('should allow emergency withdraw', async () => {

            this.mintBreeder = await MintBreeder.new(this.mintToken.address, dev, _mintPerBlock, '0', '1000', '5760', '999', '39');
            await this.mintBreeder.add('100', this.lp.address, this.zeroAddress, true);

            await this.lp.approve(this.mintBreeder.address, '1000', {from: bob});
            let tx = await this.mintBreeder.stake(0, '100', {from: bob});
            console.log(tx.tx)
            expect(await this.lp.balanceOf(bob)).to.be.bignumber.equal('900');

            await this.mintBreeder.emergencyWithdraw(0, {from: bob});
            expect(await this.lp.balanceOf(bob)).to.be.bignumber.equal('1000');
        });

        it('should give out MintTokens only after mint time', async () => {

            this.mintBreeder = await MintBreeder.new(this.mintToken.address, dev, _mintPerBlock, '200', '1000', '5760', '999', '39');
            await this.mintToken.grantRole(this.role, this.mintBreeder.address);
            // let _allocPoint =
            await this.mintBreeder.add('100', this.lp.address, this.zeroAddress, true);

            await this.lp.approve(this.mintBreeder.address, '1000', {from: bob});
            // 抵押对应的pool id
            await this.mintBreeder.stake(0, '100', {from: bob});

            await time.advanceBlockTo('189');
            expect(await this.mintBreeder.pendingMint(0, bob)).to.be.bignumber.equal('0')
            await expectRevert(this.mintBreeder.claim(0, {from: bob}), 'too early to claim'); // block 189
            expect(await this.mintToken.balanceOf(bob)).to.be.bignumber.equal('0');
            expect(await this.mintToken.balanceOf(dev)).to.be.bignumber.equal('0');

            await time.advanceBlockTo('199');
            expect(await this.mintBreeder.pendingMint(0, bob)).to.be.bignumber.equal('0')
            await expectRevert(this.mintBreeder.claim(0, {from: bob}), 'too early to claim'); // block 199
            expect(await this.mintToken.balanceOf(bob)).to.be.bignumber.equal('0');
            expect(await this.mintToken.balanceOf(dev)).to.be.bignumber.equal('0');

            await time.advanceBlockTo('200');
            expect(await this.mintBreeder.pendingMint(0, bob)).to.be.bignumber.equal('0')
            await expectRevert(this.mintBreeder.claim(0, {from: bob}), 'too early to claim'); // block 200
            expect(await this.mintToken.balanceOf(bob)).to.be.bignumber.equal('0');
            expect(await this.mintToken.balanceOf(dev)).to.be.bignumber.equal('0');
        });

        it('should can not claim MintTokens only after enableClaimBlock time and calculate pending Tokens', async () => {

            this.mintBreeder = await MintBreeder.new(this.mintToken.address, dev, '1000000000000000000', '220', '1000', '5760', '999', '39');
            await this.mintToken.grantRole(this.role, this.mintBreeder.address);
            await this.mintBreeder.add('100', this.lp.address, this.zeroAddress, true);

            await this.lp.approve(this.mintBreeder.address, '1000', {from: bob});

            await this.mintBreeder.stake(0, '100', {from: bob});

            await time.advanceBlockTo('220');
            expect(await this.mintBreeder.pendingMint(0, bob)).to.be.bignumber.equal('0')
            // block 120
            expect(await this.mintToken.balanceOf(bob)).to.be.bignumber.equal('0');
            expect(await this.mintToken.balanceOf(dev)).to.be.bignumber.equal('0');
            expect(await this.mintToken.totalSupply()).to.be.bignumber.equal('0');
            expect(await this.mintBreeder.allPendingMint(bob)).to.be.bignumber.equal('0');
            expect(await this.mintBreeder.allPendingMint(dev)).to.be.bignumber.equal('0');


            await time.advanceBlockTo('221');
            expect(await this.mintBreeder.pendingMint(0, bob)).to.be.bignumber.equal('1000000000000000000')
            // block 120
            await expectRevert(this.mintBreeder.claim(0, {from: bob}), 'too early to claim');//Claim
            expect(await this.mintToken.balanceOf(bob)).to.be.bignumber.equal('0');
            expect(await this.mintToken.balanceOf(dev)).to.be.bignumber.equal('0');
            expect(await this.mintToken.totalSupply()).to.be.bignumber.equal('0');
            expect(await this.mintBreeder.pendingMint(0, bob)).to.be.bignumber.equal('2000000000000000000')
            expect(await this.mintBreeder.allPendingMint(bob)).to.be.bignumber.equal('2000000000000000000');
            expect(await this.mintBreeder.allPendingMint(dev)).to.be.bignumber.equal('0');

            await time.advanceBlockTo('223');
            expect(await this.mintBreeder.pendingMint(0, bob)).to.be.bignumber.equal('3000000000000000000')
            // block 120
            await expectRevert(this.mintBreeder.claim(0, {from: bob}), 'too early to claim');//Claim
            expect(await this.mintToken.balanceOf(bob)).to.be.bignumber.equal('0');
            expect(await this.mintToken.balanceOf(dev)).to.be.bignumber.equal('0');
            expect(await this.mintToken.totalSupply()).to.be.bignumber.equal('0');
            expect(await this.mintBreeder.pendingMint(0, bob)).to.be.bignumber.equal('4000000000000000000')
            expect(await this.mintBreeder.allPendingMint(bob)).to.be.bignumber.equal('4000000000000000000');
            expect(await this.mintBreeder.allPendingMint(dev)).to.be.bignumber.equal('0');

        });

        it('should not distribute MintTokens if no one stake before enableClaimBlock', async () => {
            this.mintBreeder = await MintBreeder.new(this.mintToken.address, dev, '1000000000000000000', '240', '1000', '5760', '999', '39');
            await this.mintToken.grantRole(this.role, this.mintBreeder.address);
            await this.mintBreeder.add('100', this.lp.address, this.zeroAddress, true);

            await this.lp.approve(this.mintBreeder.address, '1000', {from: bob});

            await time.advanceBlockTo('250');
            expect(await this.mintToken.totalSupply()).to.be.bignumber.equal('0');

            await time.advanceBlockTo('255');
            expect(await this.mintToken.totalSupply()).to.be.bignumber.equal('0');

            await time.advanceBlockTo('260');
            await this.mintBreeder.stake(0, '10', {from: bob}); // block 261
            expect(await this.lp.balanceOf(bob)).to.be.bignumber.equal('990');
            expect(await this.lp.balanceOf(this.mintBreeder.address)).to.be.bignumber.equal('10');
            expect(await this.mintToken.totalSupply()).to.be.bignumber.equal('0');
            expect(await this.mintToken.balanceOf(bob)).to.be.bignumber.equal('0');
            expect(await this.mintToken.balanceOf(dev)).to.be.bignumber.equal('0');
            expect(await this.mintBreeder.pendingMint(0, bob)).to.be.bignumber.equal('0')
            expect(await this.mintBreeder.allPendingMint(bob)).to.be.bignumber.equal('0');
            expect(await this.mintBreeder.allPendingMint(dev)).to.be.bignumber.equal('0');

            await time.advanceBlockTo('270');//block 270
            expect(await this.lp.balanceOf(bob)).to.be.bignumber.equal('990');
            expect(await this.lp.balanceOf(this.mintBreeder.address)).to.be.bignumber.equal('10');
            expect(await this.mintToken.totalSupply()).to.be.bignumber.equal('0');
            expect(await this.mintToken.balanceOf(bob)).to.be.bignumber.equal('0');
            expect(await this.mintToken.balanceOf(dev)).to.be.bignumber.equal('0');
            expect(await this.mintBreeder.pendingMint(0, bob)).to.be.bignumber.equal('9000000000000000000')
            expect(await this.mintBreeder.allPendingMint(bob)).to.be.bignumber.equal('9000000000000000000');
            expect(await this.mintBreeder.allPendingMint(dev)).to.be.bignumber.equal('0');

            await time.advanceBlockTo('275');
            expect(await this.mintBreeder.pendingMint(0, bob)).to.be.bignumber.equal('14000000000000000000')
            expect(await this.mintBreeder.allPendingMint(bob)).to.be.bignumber.equal('14000000000000000000');
            expect(await this.mintBreeder.allPendingMint(dev)).to.be.bignumber.equal('0');

            await this.mintBreeder.stake(0, '10', {from: bob}); //stake
            expect(await this.mintBreeder.pendingMint(0, bob)).to.be.bignumber.equal('15000000000000000000')
            expect(await this.mintBreeder.allPendingMint(bob)).to.be.bignumber.equal('15000000000000000000');
            expect(await this.mintToken.balanceOf(bob)).to.be.bignumber.equal('0');

            // dev mintToken balance
            expect(await this.mintToken.balanceOf(dev)).to.be.bignumber.equal('5850000000000000000');

            expect(await this.mintBreeder.allPendingMint(dev)).to.be.bignumber.equal('0');
            expect(await this.mintToken.totalSupply()).to.be.bignumber.equal('20850000000000000000');
            expect(await this.lp.balanceOf(bob)).to.be.bignumber.equal('980');
            expect(await this.lp.balanceOf(this.mintBreeder.address)).to.be.bignumber.equal('20');

            await time.advanceBlockTo('280');
            // unStake
            await this.mintBreeder.unStake(0, '20', {from: bob});
            expect(await this.mintBreeder.pendingMint(0, bob)).to.be.bignumber.equal('20000000000000000000')
            expect(await this.mintBreeder.allPendingMint(bob)).to.be.bignumber.equal('20000000000000000000');
            expect(await this.mintToken.balanceOf(bob)).to.be.bignumber.equal('0');
            expect(await this.mintToken.balanceOf(dev)).to.be.bignumber.equal('7800000000000000000');
            expect(await this.mintBreeder.allPendingMint(dev)).to.be.bignumber.equal('0');
            expect(await this.mintToken.totalSupply()).to.be.bignumber.equal('27800000000000000000');
            expect(await this.lp.balanceOf(bob)).to.be.bignumber.equal('1000');
            expect(await this.lp.balanceOf(this.mintBreeder.address)).to.be.bignumber.equal('0');


            await time.advanceBlockTo('290');
            expect(await this.mintBreeder.pendingMint(0, bob)).to.be.bignumber.equal('20000000000000000000')
            expect(await this.mintBreeder.allPendingMint(bob)).to.be.bignumber.equal('20000000000000000000');
            // bob mintToken balance 0
            expect(await this.mintToken.balanceOf(bob)).to.be.bignumber.equal('0');
            expect(await this.mintToken.balanceOf(dev)).to.be.bignumber.equal('7800000000000000000');
            expect(await this.mintBreeder.allPendingMint(dev)).to.be.bignumber.equal('0');
            expect(await this.mintToken.totalSupply()).to.be.bignumber.equal('27800000000000000000');
            expect(await this.lp.balanceOf(bob)).to.be.bignumber.equal('1000');
            expect(await this.lp.balanceOf(this.mintBreeder.address)).to.be.bignumber.equal('0');


        });


        it('should distribute MintTokens properly for each staker before enableClaimBlock', async () => {
            this.mintBreeder = await MintBreeder.new(this.mintToken.address, dev, '1000000000000000000', '120', '1000', '5760', '999', '39');
            await this.mintToken.grantRole(this.role, this.mintBreeder.address);
            await this.mintBreeder.add('100', this.lp.address, this.zeroAddress, true);
            await this.lp.approve(this.mintBreeder.address, '1000', {from: alice});
            await this.lp.approve(this.mintBreeder.address, '1000', {from: bob});
            await this.lp.approve(this.mintBreeder.address, '1000', {from: carol});


            // Alice stake 10 LPs at block 310
            await time.advanceBlockTo('310');
            await this.mintBreeder.stake(0, '10', {from: alice});
            expect(await this.mintBreeder.pendingMint(0, alice)).to.be.bignumber.equal('0')
            expect(await this.mintBreeder.allPendingMint(alice)).to.be.bignumber.equal('0');
            expect(await this.mintToken.balanceOf(alice)).to.be.bignumber.equal('0');
            expect(await this.mintToken.balanceOf(dev)).to.be.bignumber.equal('0');
            expect(await this.mintBreeder.allPendingMint(dev)).to.be.bignumber.equal('0');
            expect(await this.mintToken.totalSupply()).to.be.bignumber.equal('0');
            expect(await this.mintToken.balanceOf(this.mintBreeder.address)).to.be.bignumber.equal('0');


            // Bob stake 20 LPs at block 313
            //alice pending tokens = 3*1e18
            // dev = alice *0.39
            // blockNumber 313 :Token totalSupply = dev + alice
            await time.advanceBlockTo('313');
            await this.mintBreeder.stake(0, '20', {from: bob});
            expect(await this.mintBreeder.pendingMint(0, alice)).to.be.bignumber.equal('3000000000000000000')
            expect(await this.mintBreeder.allPendingMint(alice)).to.be.bignumber.equal('3000000000000000000');
            expect(await this.mintToken.balanceOf(alice)).to.be.bignumber.equal('0');
            expect(await this.mintBreeder.pendingMint(0, bob)).to.be.bignumber.equal('0')
            expect(await this.mintBreeder.allPendingMint(bob)).to.be.bignumber.equal('0');
            expect(await this.mintToken.balanceOf(bob)).to.be.bignumber.equal('0');
            expect(await this.mintToken.balanceOf(dev)).to.be.bignumber.equal('1170000000000000000');
            expect(await this.mintBreeder.allPendingMint(dev)).to.be.bignumber.equal('0');
            expect(await this.mintToken.totalSupply()).to.be.bignumber.equal('4170000000000000000');
            expect(await this.mintToken.balanceOf(this.mintBreeder.address)).to.be.bignumber.equal('3000000000000000000');

            //Carol stake 30 LPs at block 317
            //alice current pending tokens = 3*1e18+10/(10+20)*1e18*4
            //bob  current pending tokens 20/(10+20)*1e18*4
            //dev = (bob+alice) *0.39
            // blockNumber 317 :Token totalSupply = dev + alice + bob
            await time.advanceBlockTo('317');
            await this.mintBreeder.stake(0, '30', {from: carol});
            expect(await this.mintBreeder.pendingMint(0, alice)).to.be.bignumber.equal('4333333333333333333')
            expect(await this.mintBreeder.allPendingMint(alice)).to.be.bignumber.equal('4333333333333333333');
            expect(await this.mintToken.balanceOf(alice)).to.be.bignumber.equal('0');
            expect(await this.mintBreeder.pendingMint(0, bob)).to.be.bignumber.equal('2666666666666666666')
            expect(await this.mintBreeder.allPendingMint(bob)).to.be.bignumber.equal('2666666666666666666');
            expect(await this.mintToken.balanceOf(bob)).to.be.bignumber.equal('0');
            expect(await this.mintBreeder.pendingMint(0, carol)).to.be.bignumber.equal('0')
            expect(await this.mintBreeder.allPendingMint(carol)).to.be.bignumber.equal('0');
            expect(await this.mintToken.balanceOf(carol)).to.be.bignumber.equal('0');
            expect(await this.mintToken.balanceOf(dev)).to.be.bignumber.equal('2730000000000000000');
            expect(await this.mintBreeder.allPendingMint(dev)).to.be.bignumber.equal('0');
            expect(await this.mintToken.totalSupply()).to.be.bignumber.equal('9730000000000000000');
            expect(await this.mintToken.balanceOf(this.mintBreeder.address)).to.be.bignumber.equal('7000000000000000000');

            // Alice stake 10 more LPs at block 319. At this point:
            // alice = 10/(10+20+30)*1e18*2
            // carol = 30/(10+20+30)*1e18*2
            // bob = 20/(10+20)*1e18*4 + 20/(10+20+30)*1e18*2
            // dev = (alice + bob + carol)*0.39
            // blockNumber 319 :Token totalSupply = dev + alice + bob + carol
            await time.advanceBlockTo('319')
            await this.mintBreeder.stake(0, '10', {from: alice});
            expect(await this.mintBreeder.pendingMint(0, alice)).to.be.bignumber.equal('4666666666666666666')
            expect(await this.mintBreeder.allPendingMint(alice)).to.be.bignumber.equal('4666666666666666666');
            expect(await this.mintToken.balanceOf(alice)).to.be.bignumber.equal('0');
            expect(await this.mintBreeder.pendingMint(0, bob)).to.be.bignumber.equal('3333333333333333333')
            expect(await this.mintBreeder.allPendingMint(bob)).to.be.bignumber.equal('3333333333333333333');
            expect(await this.mintToken.balanceOf(bob)).to.be.bignumber.equal('0');
            expect(await this.mintBreeder.pendingMint(0, carol)).to.be.bignumber.equal('1000000000000000000')
            expect(await this.mintBreeder.allPendingMint(carol)).to.be.bignumber.equal('1000000000000000000');
            expect(await this.mintToken.balanceOf(carol)).to.be.bignumber.equal('0');
            expect(await this.mintToken.balanceOf(dev)).to.be.bignumber.equal('3510000000000000000');
            expect(await this.mintBreeder.allPendingMint(dev)).to.be.bignumber.equal('0');
            expect(await this.mintToken.totalSupply()).to.be.bignumber.equal('12510000000000000000');
            expect(await this.mintToken.balanceOf(this.mintBreeder.address)).to.be.bignumber.equal('9000000000000000000');

            // Bob unStake 5 LPs at block 329. At this point:
            // alice  = 10/(10+20+30)*1e18*2 + (10+10)/(10+10+20+30)*1e18*10
            // bob =   20/(10+20)*1e18*4 + 20/(10+20+30)*1e18*2 + (20)/(10+10+20+30)*1e18*10
            await time.advanceBlockTo('329')
            await this.mintBreeder.unStake(0, '5', {from: bob});
            expect(await this.mintBreeder.pendingMint(0, alice)).to.be.bignumber.equal('7523809523809523809')
            expect(await this.mintBreeder.pendingMint(0, bob)).to.be.bignumber.equal('6190476190476190476')
            expect(await this.mintBreeder.pendingMint(0, carol)).to.be.bignumber.equal('5285714285714285715')
            expect(await this.mintToken.balanceOf(dev)).to.be.bignumber.equal('7410000000000000000');
            expect(await this.mintToken.totalSupply()).to.be.bignumber.equal('26410000000000000000');
            expect(await this.mintToken.balanceOf(alice)).to.be.bignumber.equal('0');
            expect(await this.mintToken.balanceOf(bob)).to.be.bignumber.equal('0');
            expect(await this.mintToken.balanceOf(carol)).to.be.bignumber.equal('0');
            expect(await this.mintToken.balanceOf(this.mintBreeder.address)).to.be.bignumber.equal('19000000000000000000');

            // Alice unStake 20 LPs at block 339.
            // Bob unStake 15 LPs at block 349.
            // Carol unStake 30 LPs at block 359.
            await time.advanceBlockTo('339')
            await this.mintBreeder.unStake(0, '20', {from: alice});

            await time.advanceBlockTo('349')
            await this.mintBreeder.unStake(0, '15', {from: bob});
            await time.advanceBlockTo('359')
            await this.mintBreeder.unStake(0, '30', {from: carol});


            expect(await this.mintBreeder.pendingMint(0, alice)).to.be.bignumber.equal('10600732600732600732')
            expect(await this.mintBreeder.pendingMint(0, bob)).to.be.bignumber.equal('11831501831501831501')
            expect(await this.mintBreeder.pendingMint(0, carol)).to.be.bignumber.equal('26567765567765567766')

            expect(await this.mintToken.totalSupply()).to.be.bignumber.equal('68110000000000000000');
            expect(await this.mintToken.balanceOf(dev)).to.be.bignumber.equal('19110000000000000000');
            expect(await this.lp.balanceOf(alice)).to.be.bignumber.equal('1000');
            expect(await this.lp.balanceOf(bob)).to.be.bignumber.equal('1000');
            expect(await this.lp.balanceOf(carol)).to.be.bignumber.equal('1000');
            expect(await this.lp.balanceOf(this.mintBreeder.address)).to.be.bignumber.equal('0');
            expect(await this.mintToken.balanceOf(this.mintBreeder.address)).to.be.bignumber.equal('49000000000000000000');


        });


        it('should give proper MintTokens allocation to each pool', async () => {

            this.mintBreeder = await MintBreeder.new(this.mintToken.address, dev, '1000000000000000000', '120', '1000', '5760', '999', '39');
            await this.mintToken.grantRole(this.role, this.mintBreeder.address);
            await this.lp.approve(this.mintBreeder.address, '1000', {from: alice});
            await this.lp2.approve(this.mintBreeder.address, '1000', {from: bob});

            // 增加 lp 矿池
            await this.mintBreeder.add('1000', this.lp.address, this.zeroAddress, true);

            // Alice deposits 10 LPs at block 400
            await time.advanceBlockTo('400');
            await this.mintBreeder.stake(0, '10', {from: alice});

            // Add LP2 to the pool with allocation 2 at block 420
            await time.advanceBlockTo('410');
            expect(await this.mintBreeder.pendingMint(0, alice)).to.be.bignumber.equal('9000000000000000000')
            // 增加 lp2 矿池
            await this.mintBreeder.add('1000', this.lp2.address, this.zeroAddress, true);//add pool
            expect(await this.mintBreeder.pendingMint(0, alice)).to.be.bignumber.equal('10000000000000000000')

            await time.advanceBlockTo('413');
            expect(await this.mintBreeder.pendingMint(0, alice)).to.be.bignumber.equal('11000000000000000000')


            // Bob stake 5 LP2s at block 424
            await time.advanceBlockTo('424');
            await this.mintBreeder.stake(1, '5', {from: bob});

            expect(await this.mintBreeder.pendingMint(0, alice)).to.be.bignumber.equal('17000000000000000000');

            await time.advanceBlockTo('430');
            expect(await this.mintBreeder.pendingMint(0, alice)).to.be.bignumber.equal('19500000000000000000');
            expect(await this.mintBreeder.pendingMint(1, bob)).to.be.bignumber.equal('2500000000000000000');

        });


        it('should can claim MintTokens after enableClaimBlock time (including calculate pending Tokens)', async () => {

            this.mintBreeder = await MintBreeder.new(this.mintToken.address, dev, this.mintPerBlock, '444', '465', '10', '999', '39');
            await this.mintToken.grantRole(this.role, this.mintBreeder.address);
            await this.mintBreeder.add('100', this.lp.address, this.zeroAddress, true);

            await this.lp.approve(this.mintBreeder.address, '1000', {from: bob});

            await this.mintBreeder.stake(0, '100', {from: bob});

            await time.advanceBlockTo('445');
            expect(await this.mintBreeder.pendingMint(0, bob)).to.be.bignumber.equal('1000000000000000000')
            //
            expect(await this.mintToken.balanceOf(bob)).to.be.bignumber.equal('0');
            expect(await this.mintToken.balanceOf(dev)).to.be.bignumber.equal('0');
            expect(await this.mintToken.totalSupply()).to.be.bignumber.equal('0');
            expect(await this.mintBreeder.allPendingMint(bob)).to.be.bignumber.equal('1000000000000000000');
            expect(await this.mintBreeder.allPendingMint(dev)).to.be.bignumber.equal('0');


            await time.advanceBlockTo('450');
            //
            let enableClaimBlock =  await this.mintBreeder.enableClaimBlock();//Claim
            console.log("enableClaimBlock",enableClaimBlock.toString())
            await expectRevert(this.mintBreeder.claim(0, {from: bob}), 'too early to claim');//Claim
            expect(await this.mintToken.balanceOf(bob)).to.be.bignumber.equal('0');
            expect(await this.mintToken.balanceOf(dev)).to.be.bignumber.equal('0');
            expect(await this.mintToken.totalSupply()).to.be.bignumber.equal('0');
            expect(await this.mintBreeder.pendingMint(0, bob)).to.be.bignumber.equal('7000000000000000000')
            expect(await this.mintBreeder.allPendingMint(bob)).to.be.bignumber.equal('7000000000000000000');
            expect(await this.mintBreeder.allPendingMint(dev)).to.be.bignumber.equal('0');

            await time.advanceBlockTo('465');
            expect(await this.mintBreeder.pendingMint(0, bob)).to.be.bignumber.equal('19988001000000000000')
            // block 365
            await this.mintBreeder.claim(0, {from: bob});//Claim
            expect(await this.mintToken.balanceOf(bob)).to.be.bignumber.equal('21956022000000000000');
            expect(await this.mintToken.balanceOf(dev)).to.be.bignumber.equal('8562848580000000000');
            expect(await this.mintToken.totalSupply()).to.be.bignumber.equal('30518870580000000000');
            expect(await this.mintBreeder.pendingMint(0, bob)).to.be.bignumber.equal('0')
            expect(await this.mintBreeder.allPendingMint(bob)).to.be.bignumber.equal('0');
            expect(await this.mintBreeder.allPendingMint(dev)).to.be.bignumber.equal('0');


            await time.advanceBlockTo('470');
            expect(await this.mintBreeder.pendingMint(0, bob)).to.be.bignumber.equal('3992004000000000000')
            // block 120
            await this.mintBreeder.claim(0, {from: bob})//Claim
            expect(await this.mintToken.balanceOf(bob)).to.be.bignumber.equal('26946027000000000000');
            expect(await this.mintToken.balanceOf(dev)).to.be.bignumber.equal('10508950530000000000');
            expect(await this.mintToken.totalSupply()).to.be.bignumber.equal('37454977530000000000');
            expect(await this.mintBreeder.pendingMint(0, bob)).to.be.bignumber.equal('0')
            expect(await this.mintBreeder.allPendingMint(bob)).to.be.bignumber.equal('0');
            expect(await this.mintBreeder.allPendingMint(dev)).to.be.bignumber.equal('0');

        });


        it('should give proper MintTokens allocation to each pool after enableClaimBlock', async () => {

            this.mintBreeder = await MintBreeder.new(this.mintToken.address, dev, this.mintPerBlock, '480', '510', '10', '999', '39');
            await this.mintToken.grantRole(this.role, this.mintBreeder.address);
            await this.lp.approve(this.mintBreeder.address, '1000', {from: alice});
            await this.lp2.approve(this.mintBreeder.address, '1000', {from: bob});

            // pool 1
            await this.mintBreeder.add('100', this.lp.address, this.zeroAddress, true);

            // Alice deposits 10 LPs at block 489
            await time.advanceBlockTo('489');
            await this.mintBreeder.stake(0, '10', {from: alice});

            await time.advanceBlockTo('491');
            //超过了递减的块间隔
            expect(await this.mintBreeder.pendingMint(0, alice)).to.be.bignumber.equal('999000000000000000')

            // pool 2
            await this.mintBreeder.add('100', this.lp2.address, this.zeroAddress, true);//add pool
            expect(await this.mintBreeder.pendingMint(0, alice)).to.be.bignumber.equal('1998000000000000000')

            await time.advanceBlockTo('513');
            expect(await this.mintBreeder.pendingMint(0, alice)).to.be.bignumber.equal('11980009498500000000')
            expect(await this.mintToken.balanceOf(alice)).to.be.bignumber.equal('0');
            expect(await this.mintToken.balanceOf(dev)).to.be.bignumber.equal('779220000000000000');
            expect(await this.mintToken.totalSupply()).to.be.bignumber.equal('2777220000000000000');

            await this.mintBreeder.claim(0, {from: alice})//Claim

            expect(await this.mintBreeder.pendingMint(0, alice)).to.be.bignumber.equal('0')
            expect(await this.mintToken.balanceOf(alice)).to.be.bignumber.equal('12965032989000000000');
            expect(await this.mintToken.balanceOf(dev)).to.be.bignumber.equal('5056362865710000000');
            expect(await this.mintToken.totalSupply()).to.be.bignumber.equal('18021395854710000000');


            await time.advanceBlockTo('516');
            expect(await this.mintBreeder.pendingMint(0, alice)).to.be.bignumber.equal('997002999000000000')
            await this.mintBreeder.stake(1, '5', {from: bob});
            expect(await this.mintBreeder.pendingMint(0, alice)).to.be.bignumber.equal('1495504498500000000')
            expect(await this.mintToken.balanceOf(bob)).to.be.bignumber.equal('0');
            expect(await this.mintToken.balanceOf(alice)).to.be.bignumber.equal('12965032989000000000');
            expect(await this.mintToken.balanceOf(dev)).to.be.bignumber.equal('5056362865710000000');
            expect(await this.mintToken.totalSupply()).to.be.bignumber.equal('18021395854710000000');

            // Bob stake 5 LP2s at block 520
            await time.advanceBlockTo('520');
            expect(await this.mintBreeder.pendingMint(0, alice)).to.be.bignumber.equal('2492507497500000000');
            expect(await this.mintBreeder.pendingMint(1, bob)).to.be.bignumber.equal('997002999000000000');
            await this.mintBreeder.stake(1, '10', {from: bob});
            await this.mintBreeder.unStake(0, '5', {from: alice});

            await time.advanceBlockTo('522');
            expect(await this.mintBreeder.pendingMint(0, alice)).to.be.bignumber.equal('0');
            expect(await this.mintBreeder.pendingMint(1, bob)).to.be.bignumber.equal('498002998000500000');
            expect(await this.mintToken.balanceOf(bob)).to.be.bignumber.equal('1992011992002000000');
            expect(await this.mintToken.balanceOf(alice)).to.be.bignumber.equal('16949056973004000000');
            expect(await this.mintToken.balanceOf(dev)).to.be.bignumber.equal('7387016896352340000');
            expect(await this.mintToken.totalSupply()).to.be.bignumber.equal('26328085861358340000');
            await expectRevert(this.mintBreeder.unStake(0, '35', {from: bob}), 'not good');


        });


    });

    context('During the decay period, ERC/LP tokens are added to the field', () => {

        beforeEach(async () => {
            this.lp = await MockErc20.new('LPToken', 'LP', '10000000000', {from: minter});
            await this.lp.transfer(alice, '1000', {from: minter});
            await this.lp.transfer(bob, '1000', {from: minter});
            await this.lp.transfer(carol, '1000', {from: minter});

            this.lp2 = await MockErc20.new('LPToken', 'LP', '10000000000', {from: minter});
            await this.lp2.transfer(alice, '1000', {from: minter});
            await this.lp2.transfer(bob, '1000', {from: minter});
            await this.lp2.transfer(carol, '1000', {from: minter});
        });

        it('Different amount of farm during the attenuation period', async () => {
            this.mintBreeder = await MintBreeder.new(this.mintToken.address, dev, '1000000000000000000', '600', '620', '10', '999', '39');
            await this.mintToken.grantRole(this.role, this.mintBreeder.address);

            await this.lp.approve(this.mintBreeder.address, '1000', {from: alice});
            await this.lp.approve(this.mintBreeder.address, '1000', {from: bob});
            await this.lp.approve(this.mintBreeder.address, '1000', {from: carol});

            await this.mintBreeder.add('100', this.lp.address, '0x0000000000000000000000000000000000000000', true);

            await time.advanceBlockTo('600');
            await this.mintBreeder.stake(0, '10', {from: alice});

            await time.advanceBlockTo('602');
            expect(await this.mintBreeder.pendingMint(0, alice)).to.be.bignumber.equal('1000000000000000000');

            await time.advanceBlockTo('610');
            expect(await this.mintBreeder.pendingMint(0, alice)).to.be.bignumber.equal('8000000000000000000');


            await time.advanceBlockTo('611');
            expect(await this.mintBreeder.pendingMint(0, alice)).to.be.bignumber.equal('8999000000000000000');


            await time.advanceBlockTo('612');
            expect(await this.mintBreeder.pendingMint(0, alice)).to.be.bignumber.equal('9998000000000000000');

            await time.advanceBlockTo('620');
            expect(await this.mintBreeder.pendingMint(0, alice)).to.be.bignumber.equal('17990000000000000000');


            await time.advanceBlockTo('621');
            expect(await this.mintBreeder.pendingMint(0, alice)).to.be.bignumber.equal('18988001000000000000');

            await time.advanceBlockTo('630');
            expect(await this.mintBreeder.pendingMint(0, alice)).to.be.bignumber.equal('27970010000000000000');

            await time.advanceBlockTo('631');
            expect(await this.mintBreeder.pendingMint(0, alice)).to.be.bignumber.equal('28967012999000000000');


        });


    });

});
