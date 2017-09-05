pragma solidity ^0.4.10;

import "truffle/Assert.sol";
import "truffle/DeployedAddresses.sol";
import "../../contracts/StoreFront.sol";

contract TestStoreFront {
    function testInitialBalanceUsingDeployedContract() {
        StoreFront store = StoreFront(DeployedAddresses.StoreFront());
        Assert.equal(store.getInventoryLength(), 0, "Contract should have 0 inventory length");
    }
}
