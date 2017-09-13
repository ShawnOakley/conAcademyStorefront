pragma solidity ^0.4.10;

/**
 * Contracts for Permissions
 */
contract Permissions {
    address owner;
    function Owned() {
        owner = msg.sender;
    }
    modifier isOwner() {
        require(msg.sender == owner);
        _;
    }
}