var StoreFront = artifacts.require("./StoreFront.sol");

contract('StoreFront', function(accounts) {
    let deployedStorefront;
    beforeEach(()=>{
        deployedStorefront = StoreFront.deployed();
    });

    it("should initialize a storefront with the default owner, admin status, and inventory length", function() {
        let instance;
        return deployedStorefront.then(function(_instance) {
            instance = _instance;
            return instance.owner();
        }).then(function(owner) {
            assert.equal(owner, accounts[0], "Owner was not initialized as the msg.sender");
            return instance.getAdminStatus(accounts[0]);
        }).then(function(adminStatus) {
            assert.equal(adminStatus, true, "Admin status was false");
            return instance.getInventoryLength();
        }).then(function(inventoryLength) {
            assert.equal(inventoryLength, 0, "Inventory Length was not zero");
        });
    });

    it("should add an admin and remove an admin", function() {
        let instance;
        return deployedStorefront.then(function(_instance) {
            instance = _instance;
            return instance.addAdmin([accounts[1]]);
        }).then(function(_trx) {
            return instance.getAdminStatus(accounts[1]);
        }).then(function(adminStatus) {
            assert.equal(adminStatus, true, "Admin status was false");
            return instance.removeAdmin([accounts[1]]);
        }).then(function(_trx) {
            return instance.getAdminStatus(accounts[1]);
        }).then(function(adminStatus) {
            assert.equal(adminStatus, false, "Admin status was true");
        });
    });

    it("should add and remove a product and get price, stock, and active Status by id, and increment inventoryLength",
    function() {
        let instance;
        return deployedStorefront.then(function(_instance) {
            instance = _instance;
            return instance.addProduct(0, 10, 20);
        }).then(function(_trx) {
            return instance.getInventoryItemStock(0);
        }).then(function(_itemStock) {
            assert.equal(_itemStock, 20, "Item stock val was wrong");
            return instance.getInventoryItemPrice(0);
        }).then(function(_itemPrice) {
            assert.equal(_itemPrice, 10, "Item price val was wrong");
            return instance.getInventoryLength();
        }).then(function(_inventoryLength) {
            assert.equal(_inventoryLength, 1, "Inventory Length was not incremented");
            return instance.getInventoryStatus(0);
        }).then(function(_inventoryStatus) {
            assert.equal(_inventoryStatus, true, "Inventory item was not active");
            return instance.removeProduct(0);
        }).then(function(_trx) {
            return instance.getInventoryStatus(0);
        }).then(function(_inventoryStatus) {
            assert.equal(_inventoryStatus, false, "Inventory item was active");
        });
    });

    it("should allow for buying a product and set active false when inventory reaches zero, and allows for withdrawal",
    function() {
        let instance;

        return deployedStorefront.then(function(_instance) {
            instance = _instance;
            return instance.addProduct(0, 10, 1);
        }).then(function(_trx) {
            return instance.buyProduct(0, {
                value: 10,
                gas: 100000,
                from: accounts[0]
            });
        }).then(function(_trx) {
            return instance.getInventoryStatus(0);
        }).then(function(_inventoryStatus) {
            assert.equal(_inventoryStatus, false, "Item was still active");
            return instance.getBalance();
        }).then(function(_balance) {
            assert.equal(parseInt(_balance.toString()), 10, "Proper amount was not in balance");
            return instance.withdraw();
        }).then(function(_trx) {
            return instance.getBalance();
        }).then(function(_balance) {
            assert.equal(parseInt(_balance.toString()), 0, "Proper amount was not in balance");
        });
    });
});
