pragma solidity ^0.4.10;

import "./AffiliateMerchant.sol";

contract AffiliateMerchantHub {

    event LogAffiliateMerchantCreated(address owner, address merchant, string vendorName);
    event LogAffiliateMerchantOpened(address owner, address merchant);
    event LogAffiliateMerchantClosed(address owner, address merchant);

    address[]                public affiliateMerchants;
    mapping(address => bool) public affiliateMerchantStatus;
    address owner;
    struct Product {
        uint256 id;
        uint256 price;
        uint256 stock;
        bool active;
    }

    function AffiliateMerchantHub() {
        owner = msg.sender;
    }
    modifier isOwner() {
        require(msg.sender == owner);
        _;
    }

    function getAffiliateMerchantsCount()
    constant
    returns(uint)
    {
        return affiliateMerchants.length;
    }

    function getAffiliateMerchant(uint256 merchantIndex)
    constant
    returns(address)
    {
        return affiliateMerchants[merchantIndex];
    }


    function getAffiliateMerchantInventory(uint256 merchantIndex, uint productIndex)
    constant
    returns(uint)
    {
        AffiliateMerchant affiliateMerchant = AffiliateMerchant(affiliateMerchants[merchantIndex]);
        return affiliateMerchant.getInventoryItemStock(productIndex);
    }

    function addAffiliateMerchantProduct(uint256 merchantIndex)
    constant
    returns(bool)
    {
        AffiliateMerchant affiliateMerchant = AffiliateMerchant(affiliateMerchants[merchantIndex]);
        affiliateMerchant.addProduct(0,0,0);
        return true;
    }

    function getAffiliateMerchantInventoryLength(uint256 merchantIndex)
    constant
    returns(uint)
    {
        AffiliateMerchant affiliateMerchant = AffiliateMerchant(affiliateMerchants[merchantIndex]);
        return affiliateMerchant.getInventoryLength();
    }

    function createAffiliateMerchant(string merchantName)
    external
    returns (address shopfrontAddress)
    {
        AffiliateMerchant newMerchantAddress = new AffiliateMerchant(merchantName);
        affiliateMerchants.push(newMerchantAddress);
        affiliateMerchantStatus[newMerchantAddress] = true;
        LogAffiliateMerchantCreated(msg.sender, newMerchantAddress, merchantName);
        return newMerchantAddress;
    }

    function closeAffiliateMerchant(address affiliateMerchantAddress, uint affiliateMerchantIndex)
    isOwner
    returns (bool success)
    {
        require(affiliateMerchantStatus[affiliateMerchantAddress] == true);
        affiliateMerchantStatus[affiliateMerchantAddress] = false;
        LogAffiliateMerchantClosed(msg.sender, affiliateMerchantAddress);
        return false;
    }

    function openAffiliateMerchant(address affiliateMerchantAddress, uint affiliateMerchantIndex)
    isOwner
    returns (bool success)
    {
        require(affiliateMerchantStatus[affiliateMerchantAddress] == false);
        affiliateMerchantStatus[affiliateMerchantAddress] = true;
        LogAffiliateMerchantOpened(msg.sender, affiliateMerchantAddress);
        return true;
    }
}