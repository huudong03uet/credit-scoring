// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title UserRegistry
 * @dev Manages user registration and verification
 */
contract UserRegistry is AccessControl {
    using Counters for Counters.Counter;

    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");

    Counters.Counter private _userIdCounter;

    struct UserProfile {
        address userAddress;
        string did; // Decentralized Identity
        bool isVerified;
        bool isActive;
        uint256 registrationTime;
        uint256 lastUpdateTime;
        bytes32 profileHash;
    }

    mapping(address => UserProfile) public userProfiles;
    mapping(address => bool) public registeredUsers;
    mapping(string => address) public didToAddress;
    mapping(address => uint256) public userIds;

    event UserRegistered(address indexed user, string did, uint256 userId);
    event UserVerified(address indexed user, address verifier);
    event ProfileUpdated(address indexed user, bytes32 newHash);

    modifier onlyRegistered(address user) {
        require(registeredUsers[user], "User not registered");
        _;
    }

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(VERIFIER_ROLE, msg.sender);
    }

    function registerUser(string calldata did, bytes32 profileHash) external {
        require(!registeredUsers[msg.sender], "User already registered");
        require(didToAddress[did] == address(0), "DID already used");

        _userIdCounter.increment();
        uint256 userId = _userIdCounter.current();

        userProfiles[msg.sender] = UserProfile({
            userAddress: msg.sender,
            did: did,
            isVerified: false,
            isActive: true,
            registrationTime: block.timestamp,
            lastUpdateTime: block.timestamp,
            profileHash: profileHash
        });

        registeredUsers[msg.sender] = true;
        didToAddress[did] = msg.sender;
        userIds[msg.sender] = userId;

        emit UserRegistered(msg.sender, did, userId);
    }

    function verifyUser(address user) external onlyRole(VERIFIER_ROLE) onlyRegistered(user) {
        userProfiles[user].isVerified = true;
        userProfiles[user].lastUpdateTime = block.timestamp;

        emit UserVerified(user, msg.sender);
    }

    function updateProfile(bytes32 newProfileHash) external onlyRegistered(msg.sender) {
        userProfiles[msg.sender].profileHash = newProfileHash;
        userProfiles[msg.sender].lastUpdateTime = block.timestamp;

        emit ProfileUpdated(msg.sender, newProfileHash);
    }

    function getUserProfile(address user) external view returns (UserProfile memory) {
        return userProfiles[user];
    }

    function isUserVerified(address user) external view returns (bool) {
        return userProfiles[user].isVerified;
    }
}