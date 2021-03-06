pragma solidity ^0.4.10;

import "./Owned.sol";

contract AffiliateMerchant is Owned{
    struct Product {
    uint256 id;
    uint256 price;
    uint256 stock;
    bool active;
    }

    mapping(uint256 => Product) public inventory;
    uint256 inventoryLength;
    string name;

    address public owner;
    uint256 balance;

    event ProductAdded(address adder, uint256 productId, uint256 price, uint256 initialStock);
    event ProductRemoved(address adder, uint256 productId);
    event ProductReactivated(address adder, uint256 productId);
    event ProductPurchased(address purchaser, uint256 productId);
    event ProductSoldOut(uint256 productId);
    event AdminAdded(address newAdmin);
    event AdminRemoved(address removedAdmin);

    modifier isOwner() {
        require(msg.sender == owner);
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

    function AffiliateMerchant(string merchantName) {
        owner = msg.sender;
        inventoryLength = 0;
        name = merchantName;
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
    isOwner
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
    isOwner
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
    isOwner
    returns(uint) {
        assert(inventory[id].active == true);
        inventory[id].active = false;
        ProductRemoved(msg.sender, id);
        return id;
    }

    function reactivateProduct(uint256 id)
    public
    isOwner
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
}