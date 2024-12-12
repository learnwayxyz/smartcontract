// contracts/GLDToken.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract LearnWayFaucet is Ownable {
    uint256 public dailyClaim = 550 * 1e18;

    uint256 public claimInterval = 365 days;

    mapping(address => uint256) public lastClaimed;

    IERC20 public lwt;
    constructor(address _lwtAddress) Ownable(msg.sender) {
        lwt = IERC20(_lwtAddress);
    }

    error AlreadyClaimed();

    event Claimed(address _cliamer, uint256 _amount);

    function claim() external {
        if ((block.timestamp - lastClaimed[msg.sender]) < claimInterval) {
            revert AlreadyClaimed();
        }
        lastClaimed[msg.sender] = block.timestamp;
        SafeERC20.safeTransfer(lwt, msg.sender, dailyClaim);
        emit Claimed(msg.sender, dailyClaim);
    }

    function setDailyClaim(uint256 _amt) external onlyOwner {
        dailyClaim = _amt;
    }

    function drain() external onlyOwner {
        SafeERC20.safeTransfer(lwt, owner(), lwt.balanceOf(address(this)));
    }
}
