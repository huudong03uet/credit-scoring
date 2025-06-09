const { expect } = require("chai");
const { ethers } = require("hardhat");



describe("UserRegistry", function () {
    let UserRegistry, userRegistry;
    let owner, user;

    beforeEach(async function () {
        [owner, user] = await ethers.getSigners();

        UserRegistry = await ethers.getContractFactory("UserRegistry");
        userRegistry = await UserRegistry.deploy();
        await userRegistry.deployed();
    });

    describe("Registration", function () {
        it("should register a user", async function () {
            const did = "did:example:123";
            const profileHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test profile"));

            await userRegistry.connect(user).registerUser(did, profileHash);

            // Check registered status
            expect(await userRegistry.registeredUsers(user.address)).to.be.true;
            
            // Check DID mapping
            expect(await userRegistry.didToAddress(did)).to.equal(user.address);
            
            // Check profile details
            const profile = await userRegistry.getUserProfile(user.address);
            expect(profile.userAddress).to.equal(user.address);
            expect(profile.did).to.equal(did);
            expect(profile.profileHash).to.equal(profileHash);
        });
    });

    describe("Verification", function () {
        beforeEach(async function () {
            // Register user first
            const profileHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test"));
            await userRegistry.connect(user).registerUser("did:test:user", profileHash);
        });

        it("should verify a user", async function () {
            await userRegistry.connect(owner).verifyUser(user.address);
            
            const profile = await userRegistry.getUserProfile(user.address);
            expect(profile.isVerified).to.be.true;
        });
    });

    describe("Profile Update", function () {
        beforeEach(async function () {
            const profileHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test"));
            await userRegistry.connect(user).registerUser("did:test:user", profileHash);
        });

        it("should update user profile", async function () {
            const newProfileHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("updated profile"));
            
            await userRegistry.connect(user).updateProfile(newProfileHash);
            
            const profile = await userRegistry.getUserProfile(user.address);
            expect(profile.profileHash).to.equal(newProfileHash);
        });
    });
});