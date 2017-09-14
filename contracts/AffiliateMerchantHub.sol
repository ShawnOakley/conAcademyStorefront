pragma solidity ^0.4.10;

import "./AffiliateMerchant.sol";
import "./Owned.sol";

contract AffiliateMerchantHub is Owned {

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

    modifier isOwner() {
        require(msg.sender == owner);
        _;
    }
}