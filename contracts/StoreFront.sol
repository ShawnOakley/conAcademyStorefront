pragma solidity ^0.4.10;
import "./Owned.sol";
import "./SafeMath.sol";

contract StoreFront is Owned {
    struct Product {
        uint256 id;
        uint256 price;
        uint256 stock;
        bool active;
    }

    uint256 public testCoinConversionRate;

    mapping(uint256 => Product) public inventory;
    uint256 inventoryLength;

    mapping(address => bool) public adminPrivileges;

    uint256 balance;

    bool allowed;

    event ProductAdded(address adder, uint256 productId, uint256 price, uint256 initialStock);
    event ProductRemoved(address adder, uint256 productId);
    event ProductReactivated(address adder, uint256 productId);
    event ProductPurchased(address purchaser, uint256 productId);
    event ProductSoldOut(uint256 productId);
    event AdminAdded(address newAdmin);
    event AdminRemoved(address removedAdmin);

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

    modifier groupCanAfford(uint256 productId, uint256 groupSize) {
        require(SafeMath.div(inventory[productId].price,groupSize) <= msg.value);
        _;
    }

    function StoreFront() {
        adminPrivileges[owner] = true;
        inventoryLength = 0;
        allowed=false;
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


    function adjustProductInventory(uint256 inventoryId, uint256 amount)
    public
    isAdmin
    returns (uint256) {
        inventory[inventoryId].stock += amount;
        if (inventory[inventoryId].stock == 0) {
            removeProduct(inventoryId);
            ProductSoldOut(inventoryId);
        }
        return inventory[inventoryId].stock;
    }


    function getInventoryStatus(uint256 inventoryId)
    constant
    returns(bool) {
        return inventory[inventoryId].active;
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
        returns(uint) {
        assert(inventory[id].active == true);
        inventory[id].active = false;
        ProductRemoved(msg.sender, id);
        return id;
    }

    function reactivateProduct(uint256 id)
    public
    isAdmin
    returns(uint) {
        assert(inventory[id].active == false);
        inventory[id].active = true;
        ProductReactivated(msg.sender, id);
        return id;
    }

    function withdraw()
        public
        isOwner
        returns(uint) {
        msg.sender.transfer(this.balance);
    }

    function buyProduct(uint256 inventoryId)
        payable
        external
        isAvailable(inventoryId)
        canAfford(inventoryId)
    {
        bool completeBool = true;
        if (msg.value > inventory[inventoryId].price) {
            uint256 remainder = msg.value - inventory[inventoryId].price;
            balance += inventory[inventoryId].price;
            completeBool = msg.sender.send(remainder);
        }
        if (completeBool) {
            inventory[inventoryId].stock -= 1;
        } else {
            revert();
        }
        ProductPurchased(msg.sender, inventoryId);
        if (inventory[inventoryId].stock == 0) {
            removeProduct(inventoryId);
            ProductSoldOut(inventoryId);
        }
    }

    function groupBuyProduct(uint256 inventoryId, uint256 groupNumber)
    payable
    external
    isAvailable(inventoryId)
    groupCanAfford(inventoryId, groupNumber)
    {
        bool completeBool = true;
        uint256 remainder = msg.value - SafeMath.div(inventory[inventoryId].price,groupNumber);
        completeBool = msg.sender.send(remainder);
        if (!completeBool) {
            revert();
        }
        // remember to call adjust product inventory in client on success
        ProductPurchased(msg.sender, inventoryId);
    }
}