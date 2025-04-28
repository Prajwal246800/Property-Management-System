// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

struct Property {
    uint256 propertyId;
    address owner;
    string propertyType;
    string propertyAddress;
    uint256 size;
    uint256 bedrooms;
    uint256 bathrooms;
    uint256 constructionYear;
    string amenities;
    uint256 valuation;
    bool isForSale;
    uint256 salePrice;
    string status;
    bool isVerified;
    address verifiedBy;
    uint256 verificationDate;
    string[] documents;
}

struct Dispute {
    uint256 propertyId;
    address complainant;
    string reason;
    bool isResolved;
    string resolution;
    address resolvedBy;
    uint256 resolutionDate;
}

struct OwnershipHistory {
    address[] previousOwners;
    uint256[] transferDates;
    uint256[] prices;
    string[] transferReasons;
} 