pragma solidity ^0.4.10;

/**
 * Contracts for Owned
 */
contract Owned {
    address owner;
    function Owned() {
        owner = msg.sender;
    }
    modifier isOwner() {
        require(msg.sender == owner);
        _;
    }
}