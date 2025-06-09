const { expect } = require("chai");
const { ethers } = require("hardhat");



describe("OnChainAnalyzer", function () {
    let OnChainAnalyzer, onChainAnalyzer;
    let UserRegistry, userRegistry;
    let owner, user;

    beforeEach(async function () {
        [owner, user] = await ethers.getSigners();

        // Deploy UserRegistry first
        UserRegistry = await ethers.getContractFactory("UserRegistry");
        userRegistry = await UserRegistry.deploy();
        await userRegistry.deployed();

        // Deploy OnChainAnalyzer
        OnChainAnalyzer = await ethers.getContractFactory("OnChainAnalyzer");
        onChainAnalyzer = await OnChainAnalyzer.deploy(userRegistry.address);
        await onChainAnalyzer.deployed();

        // Register user
        const profileHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test profile"));
        await userRegistry.connect(user).registerUser("did:test:user", profileHash);
    });

    describe("updateOnChainMetrics", function () {
        it("should update on-chain metrics for a registered user", async function () {
            const metrics = {
                totalTransactions: 100,
                totalVolume: ethers.utils.parseEther("10"),
                averageTransactionSize: ethers.utils.parseEther("0.1"),
                liquidityProvided: ethers.utils.parseEther("5"),
                stakingAmount: ethers.utils.parseEther("1"),
                governanceParticipation: 10,
                contractInteractions: 20,
                uniqueContractsUsed: 5,
                accountAge: 365,
                lastTransactionTime: Math.floor(Date.now() / 1000)
            };

            await expect(onChainAnalyzer.updateOnChainMetrics(user.address, metrics))
                .to.emit(onChainAnalyzer, "OnChainDataUpdated");
        });
    });

    describe("calculateOnChainScore", function () {
        it("should calculate the on-chain score based on metrics", async function () {
            await userRegistry.registerUser("did:example:123", "0x1234");
            const metrics = {
                totalTransactions: 100,
                totalVolume: ethers.utils.parseEther("10"),
                averageTransactionSize: ethers.utils.parseEther("0.1"),
                liquidityProvided: ethers.utils.parseEther("5"),
                stakingAmount: ethers.utils.parseEther("1"),
                governanceParticipation: 10,
                contractInteractions: 20,
                uniqueContractsUsed: 5,
                accountAge: 365,
                lastTransactionTime: Math.floor(Date.now() / 1000),
            };

            await onChainAnalyzer.updateOnChainMetrics(user.address, metrics);
            const score = await onChainAnalyzer.calculateOnChainScore(user.address);
            expect(score).to.be.a("number");
        });
    });
});