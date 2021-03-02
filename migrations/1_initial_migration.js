const MockErc20 =  artifacts.require('MockErc20');
const Migrations = artifacts.require("Migrations");

module.exports = async (deployer, network, accounts) => {

    await deployer.deploy(Migrations);

};
