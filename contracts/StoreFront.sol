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
    uint256 balance;

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

    function StoreFront() {
        owner = msg.sender;
        adminPrivileges[owner] = true;
        inventory[0].id = 0;
        inventory[0].price = 2;
        inventory[0].stock = 2;
        inventory[0].active = true;
        inventory[1].id = 1;
        inventory[1].price = 3;
        inventory[1].stock = 3;
        inventory[1].active = true;
        inventoryLength = 2;
    }

    function addAdmin(address newAdmin)
        public
        isOwner
        returns (bool) {
        adminPrivileges[newAdmin] = true;
        AdminAdded(newAdmin);
        return true;
    }

    function removeAdmin(address adminAddress)
        public
        isOwner
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

    function getBalance()
    constant
    returns(uint256) {
        return this.balance;
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

    function withdraw()
        public
        isOwner
        returns(uint) {
        msg.sender.transfer(this.balance);
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
            balance += inventory[productId].price;
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