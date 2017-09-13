var AffiliateMerchant = artifacts.require("./AffiliateMerchant.sol");
var AffiliateMerchantHub = artifacts.require("./AffiliateMerchantHub.sol");

module.exports = function(deployer) {
    deployer.deploy(AffiliateMerchant);
    deployer.deploy(AffiliateMerchantHub);
};
