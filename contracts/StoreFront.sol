pragma solidity ^0.4.10;

contract StoreFront {
    struct Product {
        uint256 id;
        uint256 price;
        uint256 stock;
        bool active;
    }

    mapping(uint256 => Product) public inventory;
    uint256 inventoryLength;

    mapping(address => bool) public adminPrivileges;

    address public owner;

    event ProductAdded(address adder, uint256 productId, uint256 price, uint256 initialStock);
    event ProductPurchased(address purchaser, uint256 productId);
    event ProductSoldOut(uint256 productId);
    event AdminAdded(address newAdmin);
    event AdminRemoved(address removedAdmin);

    modifier isOwner() {
        require(msg.sender == owner);
        _;
    }

    modifier isAdmin() {
        require(adminPrivileges[msg.sender] != false);
        _;
    }

    modifier canAfford(uint256 productId) {
        require(inventory[productId].price <= msg.value);
        _;
    }

    modifier isAvailable(uint256 productId) {
        require(inventory[productId].stock > 0);
        _;
    }

    function Storefront() {
        owner = msg.sender;
        adminPrivileges[owner] = true;
        inventoryLength = 0;
    }

    function setOwner(address newOwner)
        public
        returns (bool) {
        owner = newOwner;
        return true;
    }

    function addAdmin(address newAdmin)
        returns (bool) {
        adminPrivileges[newAdmin] = true;
        AdminAdded(newAdmin);
        return true;
    }

    function removeAdmin(address adminAddress)
        returns (bool) {
        adminPrivileges[adminAddress] = false;
        AdminRemoved(adminAddress);
        return true;
    }

    function getAdminStatus(address adminAddress)
        public
        constant
        returns (bool) {
        return adminPrivileges[adminAddress];
    }

    function getOwnerStatus(address adminAddress)
    public
    constant
    returns (bool) {
        return owner == adminAddress;
    }

    function getInventoryItemStock(uint256 inventoryId)
        constant
        returns(uint256) {
        return inventory[inventoryId].stock;
    }

    function getInventoryItemPrice(uint256 inventoryId)
        constant
        returns(uint256) {
        return inventory[inventoryId].price;
    }

    function getInventoryLength()
        constant
        returns(uint256) {
        return inventoryLength;
    }

    function addProduct(uint256 id, uint256 price, uint256 initialStock)
        public
        isAdmin
        returns(bool) {
        assert(inventory[id].active == false);
        inventory[id] = Product(id, price, initialStock, true);
        if (id >= inventoryLength) {
            inventoryLength += 1;
        }
        ProductAdded(msg.sender, id, price, initialStock);
        return true;
    }

    function removeProduct(uint256 id)
        public
        isAdmin
        returns(bool) {
        assert(inventory[id].active == true);
        inventory[id].active = false;
        return true;
    }

    function buyProduct(uint256 productId)
        payable
        external
        canAfford(productId)
        isAvailable(productId)
    {
        bool completeBool = true;
        if (msg.value > inventory[productId].price) {
            uint256 remainder = msg.value - inventory[productId].price;
            completeBool = msg.sender.send(remainder);
        }
        if (completeBool) {
            Product storage product = inventory[productId];
            product.stock -= 1;
        } else {
            revert();
        }
        ProductPurchased(msg.sender, productId);
        if (product.stock == 0) {
            removeProduct(productId);
            ProductSoldOut(productId);
        }
    }
}