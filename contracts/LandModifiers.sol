// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./LandStructs.sol";

abstract contract PropertyModifiers {
    mapping(address => bool) public verifiers;
    mapping(uint256 => Property) internal properties;
    
    modifier onlyVerifier() {
        require(verifiers[msg.sender], "Only verifiers can perform this action");
        _;
    }
    
    modifier onlyOwner(uint256 _propertyId) {
        Property storage property = properties[_propertyId];
        require(property.owner == msg.sender, "Only property owner can perform this action");
        _;
    }
    
    function _initializeVerifier(address _verifier) internal {
        verifiers[_verifier] = true;
    }
    
    function addVerifier(address _verifier) external onlyVerifier {
        verifiers[_verifier] = true;
    }
    
    function removeVerifier(address _verifier) external onlyVerifier {
        require(_verifier != msg.sender, "Cannot remove yourself");
        verifiers[_verifier] = false;
    }
} 