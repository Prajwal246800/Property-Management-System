// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./LandStructs.sol";
import "./LandModifiers.sol";

contract PropertyRegistry is PropertyModifiers {
    uint256 public propertyCounter;
    mapping(uint256 => OwnershipHistory) internal propertyHistory;
    mapping(uint256 => Dispute[]) internal propertyDisputes;
    mapping(address => uint256[]) public ownerToProperties;

    event PropertyRegistered(uint256 indexed propertyId, address indexed owner, string propertyType, string propertyAddress);
    event OwnershipTransferred(uint256 indexed propertyId, address indexed from, address indexed to, uint256 price);
    event PropertyValuationUpdated(uint256 indexed propertyId, uint256 newValuation);
    event PropertyStatusChanged(uint256 indexed propertyId, string newStatus);
    event DocumentAdded(uint256 indexed propertyId, string documentHash);
    event PropertyVerified(uint256 indexed propertyId, address indexed verifier);
    event DisputeRaised(uint256 indexed propertyId, address indexed complainant);
    event DisputeResolved(uint256 indexed propertyId, address indexed resolver);
    event DocumentRemoved(uint256 indexed propertyId, string documentHash);
    event SaleStatusReverted(uint256 indexed propertyId);
    event PropertySetForSale(uint256 indexed propertyId, uint256 price);

    constructor() {
        _initializeVerifier(msg.sender);
    }

    function registerProperty(
        string memory _propertyType,
        string memory _propertyAddress,
        uint256 _size,
        uint256 _bedrooms,
        uint256 _bathrooms,
        uint256 _constructionYear,
        string memory _amenities
    ) public {
        require(bytes(_propertyType).length > 0, "Property type cannot be empty");
        require(bytes(_propertyAddress).length > 0, "Property address cannot be empty");
        require(_size > 0, "Size must be greater than 0");
        require(_constructionYear > 0, "Construction year must be valid");

        propertyCounter++;
        Property memory newProperty = Property({
            propertyId: propertyCounter,
            owner: msg.sender,
            propertyType: _propertyType,
            propertyAddress: _propertyAddress,
            size: _size,
            bedrooms: _bedrooms,
            bathrooms: _bathrooms,
            constructionYear: _constructionYear,
            amenities: _amenities,
            valuation: 0,
            isForSale: false,
            salePrice: 0,
            status: "Registered",
            isVerified: false,
            verifiedBy: address(0),
            verificationDate: 0,
            documents: new string[](0)
        });

        properties[propertyCounter] = newProperty;
        ownerToProperties[msg.sender].push(propertyCounter);
        
        OwnershipHistory memory history = OwnershipHistory({
            previousOwners: new address[](0),
            transferDates: new uint256[](0),
            prices: new uint256[](0),
            transferReasons: new string[](0)
        });
        
        propertyHistory[propertyCounter] = history;
        
        emit PropertyRegistered(propertyCounter, msg.sender, _propertyType, _propertyAddress);
    }

    function transferProperty(uint256 _propertyId, address _to) external {
        require(_to != address(0), "Invalid address");
        Property storage property = properties[_propertyId];
        require(msg.sender == property.owner, "Only owner can transfer property");
        
        address previousOwner = property.owner;
        property.owner = _to;

        // Update history
        OwnershipHistory storage history = propertyHistory[_propertyId];
        history.previousOwners.push(previousOwner);
        history.transferDates.push(block.timestamp);
        history.prices.push(property.salePrice);
        history.transferReasons.push("");

        // Update owner mapping
        ownerToProperties[_to].push(_propertyId);
        
        // Remove from old owner's list
        uint256[] storage fromProperties = ownerToProperties[msg.sender];
        for (uint256 i = 0; i < fromProperties.length; i++) {
            if (fromProperties[i] == _propertyId) {
                fromProperties[i] = fromProperties[fromProperties.length - 1];
                fromProperties.pop();
                break;
            }
        }

        // Reset sale status after transfer
        property.isForSale = false;
        property.salePrice = 0;
        property.status = "Registered";

        emit OwnershipTransferred(_propertyId, msg.sender, _to, property.salePrice);
        emit PropertyStatusChanged(_propertyId, "Registered");
    }

    function updateValuation(uint256 _propertyId, uint256 _newValuation) external onlyOwner(_propertyId) {
        properties[_propertyId].valuation = _newValuation;
        emit PropertyValuationUpdated(_propertyId, _newValuation);
    }

    function setForSale(uint256 _propertyId, uint256 _price) external onlyOwner(_propertyId) {
        Property storage property = properties[_propertyId];
        property.isForSale = true;
        property.salePrice = _price;
        property.status = "For Sale";
        emit PropertySetForSale(_propertyId, _price);
        emit PropertyStatusChanged(_propertyId, "For Sale");
    }

    function addDocument(uint256 _propertyId, string memory _documentHash) external onlyOwner(_propertyId) {
        require(bytes(_documentHash).length > 0, "Document hash cannot be empty");
        properties[_propertyId].documents.push(_documentHash);
        emit DocumentAdded(_propertyId, _documentHash);
    }

    function verifyProperty(uint256 _propertyId) external onlyVerifier {
        Property storage property = properties[_propertyId];
        require(!property.isVerified, "Property already verified");
        
        property.isVerified = true;
        property.verifiedBy = msg.sender;
        property.verificationDate = block.timestamp;
        property.status = "Verified";
        
        emit PropertyVerified(_propertyId, msg.sender);
        emit PropertyStatusChanged(_propertyId, "Verified");
    }

    function raiseDispute(uint256 _propertyId, string memory _reason) external {
        require(_propertyId <= propertyCounter, "Property does not exist");
        require(bytes(_reason).length > 0, "Reason cannot be empty");
        
        propertyDisputes[_propertyId].push(Dispute({
            propertyId: _propertyId,
            complainant: msg.sender,
            reason: _reason,
            isResolved: false,
            resolution: "",
            resolvedBy: address(0),
            resolutionDate: 0
        }));
        
        emit DisputeRaised(_propertyId, msg.sender);
    }

    function resolveDispute(uint256 _propertyId, uint256 _disputeIndex, string memory _resolution) external onlyVerifier {
        require(_propertyId <= propertyCounter, "Property does not exist");
        require(_disputeIndex < propertyDisputes[_propertyId].length, "Invalid dispute index");
        require(bytes(_resolution).length > 0, "Resolution cannot be empty");
        
        Dispute storage dispute = propertyDisputes[_propertyId][_disputeIndex];
        require(!dispute.isResolved, "Dispute already resolved");
        
        dispute.isResolved = true;
        dispute.resolution = _resolution;
        dispute.resolvedBy = msg.sender;
        dispute.resolutionDate = block.timestamp;
        
        emit DisputeResolved(_propertyId, msg.sender);
    }

    function getMyProperties() external view returns (uint256[] memory) {
        return ownerToProperties[msg.sender];
    }

    function getPropertyDetails(uint256 _propertyId) external view returns (
        uint256 propertyId,
        address owner,
        string memory propertyType,
        string memory propertyAddress,
        uint256 size,
        uint256 bedrooms,
        uint256 bathrooms,
        uint256 constructionYear,
        string memory amenities,
        uint256 valuation,
        bool isForSale,
        uint256 salePrice,
        string memory status,
        bool isVerified,
        address verifiedBy,
        uint256 verificationDate,
        string[] memory documents
    ) {
        Property memory property = properties[_propertyId];
        return (
            property.propertyId,
            property.owner,
            property.propertyType,
            property.propertyAddress,
            property.size,
            property.bedrooms,
            property.bathrooms,
            property.constructionYear,
            property.amenities,
            property.valuation,
            property.isForSale,
            property.salePrice,
            property.status,
            property.isVerified,
            property.verifiedBy,
            property.verificationDate,
            property.documents
        );
    }

    function getPropertyHistory(uint256 _propertyId) external view returns (
        address[] memory previousOwners,
        uint256[] memory transferDates,
        uint256[] memory prices,
        string[] memory transferReasons
    ) {
        require(_propertyId <= propertyCounter, "Property does not exist");
        OwnershipHistory storage history = propertyHistory[_propertyId];
        return (history.previousOwners, history.transferDates, history.prices, history.transferReasons);
    }

    function getPropertyDisputes(uint256 _propertyId) external view returns (Dispute[] memory) {
        require(_propertyId <= propertyCounter, "Property does not exist");
        return propertyDisputes[_propertyId];
    }

    function removeDocument(uint256 _propertyId, string memory _documentHash) external onlyOwner(_propertyId) {
        require(bytes(_documentHash).length > 0, "Document hash cannot be empty");
        Property storage property = properties[_propertyId];
        
        // Find and remove the document
        string[] storage documents = property.documents;
        bool found = false;
        uint256 indexToRemove;
        
        for(uint256 i = 0; i < documents.length; i++) {
            if(keccak256(bytes(documents[i])) == keccak256(bytes(_documentHash))) {
                found = true;
                indexToRemove = i;
                break;
            }
        }
        
        require(found, "Document not found");
        
        // Remove the document by shifting elements
        for(uint256 i = indexToRemove; i < documents.length - 1; i++) {
            documents[i] = documents[i + 1];
        }
        documents.pop();
        
        emit DocumentRemoved(_propertyId, _documentHash);
    }

    function revertSaleStatus(uint256 _propertyId) external onlyOwner(_propertyId) {
        Property storage property = properties[_propertyId];
        require(property.isForSale, "Property is not for sale");
        
        property.isForSale = false;
        property.salePrice = 0;
        property.status = "Registered";
        
        emit SaleStatusReverted(_propertyId);
        emit PropertyStatusChanged(_propertyId, "Registered");
    }

    function getPropertiesByOwner(address _owner) external view returns (uint256[] memory) {
        return ownerToProperties[_owner];
    }
} 