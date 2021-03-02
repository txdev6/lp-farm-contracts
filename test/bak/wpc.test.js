const {accounts, defaultSender, contract, web3, provider, config} = require('@openzeppelin/test-environment');
const [owner] = accounts;
// console.debug(contract)

const {
    BN,           // Big Number support
    constants,    // Common constants, like the zero address and largest integers
    expectEvent,  // Assertions for emitted events
    expectRevert, // Assertions for transactions that should fail
} = require('@openzeppelin/test-helpers');

const {setupLoader} = require('@openzeppelin/contract-loader');
//defaultGas, defaultGasPrice, artifactsDir
const loader = setupLoader({
    provider: provider,
    defaultSender: owner,
    defaultGas: contract.defaultGas,
    defaultGasPrice: contract.defaultGasPrice
}).truffle;

const ERC20 = loader.fromArtifact('WePiggyToken');
// console.log(ERC20)


describe('ERC20', async () => {
    const [sender, receiver] = accounts;


    beforeEach(async function () {
        // The bundled BN library is the same one web3 uses under the hood
        this.value = (new BN(1011)).toString();

        this.erc20 = await ERC20.new();

    });

    it('reverts when transferring tokens to the zero address', async function () {
        // Conditions that trigger a require statement can be precisely tested
        this.erc20.transfer(constants.ZERO_ADDRESS, this.value, {from: sender})
    });

    it('reverts tokens to the zero address', async function () {
        // Conditions that trigger a require statement can be precisely tested
        this.erc20.transfer(receiver, this.value, {from: sender})
    });

    it('mint ', async function () {
        console.log(defaultSender, owner, sender)

        let _role = web3.utils.soliditySha3("MINTER_ROLE")
        await this.erc20.grantRole(_role, sender, {from: owner})

        let foo1 = await this.erc20.hasRole(_role, owner)
        console.log(foo1)

        let foo = await this.erc20.getRoleMemberCount(_role)

        console.log(foo.toString())

        await this.erc20.mint(owner, this.value, {from: owner})

        let ss = await this.erc20.balanceOf(owner)
        console.log(ss.toString())

        // Conditions that trigger a require statement can be precisely tested
        // await expectRevert(
        //     this.erc20.mint(receiver, this.value, {from: owner}),
        //     'mint: transfer to the zero address',
        // );

    });

    // it('emits a Transfer event on successful transfers', async function () {
    //     const receipt = await this.erc20.transfer(
    //         receiver, this.value, {from: sender}
    //     );
    //
    //     console.log(receipt.from)
    //
    //     // Event assertions can verify that the arguments are the expected ones
    //     // expectEvent(receipt, 'Transfer', {
    //     //     from: sender,
    //     //     to: receiver,
    //     //     value: this.value,
    //     // });
    // });
    //
    it('updates balances on successful transfers', async function () {
        // this.erc20.transfer(receiver, this.value, {from: sender});

        // BN assertions are automatically available via chai-bn (if using Chai)
        let ss = await this.erc20.balanceOf(owner)
        console.log(ss.toString())
    });
});
