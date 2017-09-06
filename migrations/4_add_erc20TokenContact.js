var ERC20TokenContract = artifacts.require("./ERC20TokenContract.sol");

module.exports = function(deployer) {
    deployer.deploy(ERC20TokenContract);
};
