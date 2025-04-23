// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract LandRegistry {
    struct Land {
        uint256 id;
        string location;
        uint256 area; // in square feet
        address owner;
        bool isRegistered;
    }

    uint256 public landCounter;
    mapping(uint256 => Land) public lands;
    mapping(address => uint256[]) public ownerToLands;

    event LandRegistered(uint256 indexed landId, address indexed owner);
    event OwnershipTransferred(uint256 indexed landId, address indexed from, address indexed to);

    modifier onlyOwner(uint256 _landId) {
        require(lands[_landId].owner == msg.sender, "Not land owner");
        _;
    }

    function registerLand(string memory _location, uint256 _area) external {
        landCounter++;
        lands[landCounter] = Land(landCounter, _location, _area, msg.sender, true);
        ownerToLands[msg.sender].push(landCounter);
        emit LandRegistered(landCounter, msg.sender);
    }

    function transferLand(uint256 _landId, address _to) external onlyOwner(_landId) {
        require(lands[_landId].isRegistered, "Land not registered");
        address previousOwner = lands[_landId].owner;

        // Update owner mapping
        lands[_landId].owner = _to;
        ownerToLands[_to].push(_landId);

        // Remove from old owner's list (simplified, may need optimization)
        uint256[] storage fromLands = ownerToLands[previousOwner];
        for (uint256 i = 0; i < fromLands.length; i++) {
            if (fromLands[i] == _landId) {
                fromLands[i] = fromLands[fromLands.length - 1];
                fromLands.pop();
                break;
            }
        }

        emit OwnershipTransferred(_landId, previousOwner, _to);
    }

    function getMyLands() external view returns (uint256[] memory) {
        return ownerToLands[msg.sender];
    }

    function getLandDetails(uint256 _landId) external view returns (Land memory) {
        return lands[_landId];
    }
}