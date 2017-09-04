var Storefront = artifacts.require("./StoreFront.sol");

module.exports = function(deployer) {
    deployer.deploy(Storefront);
};
