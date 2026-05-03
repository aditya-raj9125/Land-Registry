// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

/**
 * @title ReentrancyGuardUpgradeable
 * @notice Upgrade-safe reentrancy guard for UUPS contracts (OZ v5 compatible)
 * @dev OZ v5 removed the built-in upgradeable version. This uses a private
 *      uint256 storage slot with the standard lock pattern.
 */
abstract contract ReentrancyGuardUpgradeable is Initializable {
    uint256 private _reentrancyStatus;

    uint256 private constant NOT_ENTERED = 1;
    uint256 private constant ENTERED = 2;

    // solhint-disable-next-line func-name-mixedcase
    function __ReentrancyGuard_init() internal onlyInitializing {
        _reentrancyStatus = NOT_ENTERED;
    }

    modifier nonReentrant() {
        require(_reentrancyStatus != ENTERED, "ReentrancyGuard: reentrant call");
        _reentrancyStatus = ENTERED;
        _;
        _reentrancyStatus = NOT_ENTERED;
    }
}
