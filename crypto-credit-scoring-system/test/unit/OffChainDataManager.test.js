const { expect } = require("chai");
const { ethers } = require("hardhat");



describe("OffChainDataManager", function () {
    let offChainDataManager;
    let userRegistry;
    let mockOracle;
    let owner;
    let user;

    beforeEach(async function () {
        [owner, user] = await ethers.getSigners();

        const MockOracle = await ethers.getContractFactory("MockOracle");
        mockOracle = await MockOracle.deploy();
        await mockOracle.deployed();

        const UserRegistry = await ethers.getContractFactory("UserRegistry");
        userRegistry = await UserRegistry.deploy();
        await userRegistry.deployed();

        const OffChainDataManager = await ethers.getContractFactory("OffChainDataManager");
        offChainDataManager = await OffChainDataManager.deploy(userRegistry.address, mockOracle.address);
        await offChainDataManager.deployed();
    });

    describe("updateOffChainData", function () {
        it("should update off-chain data for a verified user", async function () {
            const did = "did:example:123";
            const profileHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("profileHash"));

            await userRegistry.registerUser(did, profileHash);
            await userRegistry.verifyUser(user.address);

            const offChainMetrics = {
                socialScore: 80,
                kycScore: 90,
                educationScore: 70,
                employmentScore: 85,
                incomeScore: 75,
                debtToIncomeRatio: 20,
                ipfsHash: "QmExampleHash",
                dataTimestamp: Math.floor(Date.now() / 1000),
            };

            await offChainDataManager.updateOffChainData(user.address, offChainMetrics);

            const updatedData = await offChainDataManager.getOffChainMetrics(user.address);
            expect(updatedData.socialScore).to.equal(offChainMetrics.socialScore);
            expect(updatedData.kycScore).to.equal(offChainMetrics.kycScore);
        });

        it("should revert if user is not verified", async function () {
            const offChainMetrics = {
                socialScore: 80,
                kycScore: 90,
                educationScore: 70,
                employmentScore: 85,
                incomeScore: 75,
                debtToIncomeRatio: 20,
                ipfsHash: "QmExampleHash",
                dataTimestamp: Math.floor(Date.now() / 1000),
            };

            await expect(offChainDataManager.updateOffChainData(user.address, offChainMetrics)).to.be.revertedWith("User not verified");
        });
    });

    describe("calculateOffChainScore", function () {
        it("should calculate off-chain score correctly", async function () {
            const did = "did:example:123";
            const profileHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("profileHash"));

            await userRegistry.registerUser(did, profileHash);
            await userRegistry.verifyUser(user.address);

            const offChainMetrics = {
                socialScore: 80,
                kycScore: 90,
                educationScore: 70,
                employmentScore: 85,
                incomeScore: 75,
                debtToIncomeRatio: 20,
                ipfsHash: "QmExampleHash",
                dataTimestamp: Math.floor(Date.now() / 1000),
            };

            await offChainDataManager.updateOffChainData(user.address, offChainMetrics);
            const score = await offChainDataManager.calculateOffChainScore(user.address);

            expect(score).to.be.greaterThan(0);
            expect(score).to.be.lessThan(100);
        });
    });
});