// SPDX-License-Identifier: MIT
import "@nomiclabs/buidler/console.sol";
pragma solidity >=0.4.25 <0.7.0;

contract Migrations {
  address public owner;
  uint public last_completed_migration;

  modifier restricted() {
    if (msg.sender == owner) _;
  }

  constructor() public {
    console.log("Deploying a Migrations constructor:", msg.sender);
    owner = msg.sender;
  }

  function setCompleted(uint completed) public restricted {
    console.log("Deploying a Migrations with setCompleted:", completed);
    last_completed_migration = completed;
  }
}
