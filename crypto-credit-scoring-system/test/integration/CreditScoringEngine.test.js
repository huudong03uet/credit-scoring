const { expect } = require("chai");
const { ethers } = require("hardhat");



describe("CreditScoringEngine Integration Tests", function () {
    let creditScoringEngine;
    let userRegistry;
    let collateralManager;
    let offChainDataManager;
    let loanHistoryTracker;
    let onChainAnalyzer;
    let mockOracle;

    let owner, user;

    before(async function () {
        [owner, user] = await ethers.getSigners();

        // Deploy UserRegistry first
        const UserRegistry = await ethers.getContractFactory("UserRegistry");
        userRegistry = await UserRegistry.deploy();
        await userRegistry.deployed();

        // Deploy MockOracle
        const MockOracle = await ethers.getContractFactory("MockOracle");
        mockOracle = await MockOracle.deploy();
        await mockOracle.deployed();

        // Deploy other contracts
        const CollateralManager = await ethers.getContractFactory("CollateralManager");
        collateralManager = await CollateralManager.deploy(userRegistry.address, mockOracle.address);

        const OffChainDataManager = await ethers.getContractFactory("OffChainDataManager");
        offChainDataManager = await OffChainDataManager.deploy(userRegistry.address, mockOracle.address);

        const LoanHistoryTracker = await ethers.getContractFactory("LoanHistoryTracker");
        loanHistoryTracker = await LoanHistoryTracker.deploy();

        const OnChainAnalyzer = await ethers.getContractFactory("OnChainAnalyzer");
        onChainAnalyzer = await OnChainAnalyzer.deploy(userRegistry.address);

        // Deploy CreditScoringEngine with ALL 5 required arguments
        const CreditScoringEngine = await ethers.getContractFactory("CreditScoringEngine");
        creditScoringEngine = await CreditScoringEngine.deploy(
            userRegistry.address,
            collateralManager.address,
            offChainDataManager.address,
            loanHistoryTracker.address,
            onChainAnalyzer.address  // <- This was missing!
        );
        await creditScoringEngine.deployed();
    });

    it("should register a user and verify their identity", async function () {
        // Proper bytes32 hash (32 bytes = 64 hex chars)
        const profileHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test profile"));
        
        await userRegistry.connect(user).registerUser("did:example:123", profileHash);
        await userRegistry.connect(owner).verifyUser(user.address);
        
        const profile = await userRegistry.getUserProfile(user.address);
        expect(profile.isVerified).to.be.true;
    });

    it("should allow collateral deposit and calculate collateral score", async function () {
        const [owner] = await ethers.getSigners();
        const tokenAddress = "0xTokenAddress"; // Replace with actual token address
        const amount = ethers.utils.parseUnits("100", 18);

        await collateralManager.addSupportedToken(tokenAddress, 1500); // 15% liquidation threshold
        await collateralManager.depositCollateral(tokenAddress, amount);

        const collateralScore = await collateralManager.calculateCollateralScore(owner.address);
        expect(collateralScore).to.be.greaterThan(0);
    });

    it("should update off-chain data and calculate off-chain score", async function () {
        const [owner] = await ethers.getSigners();
        const offChainData = {
            socialScore: 80,
            kycScore: 90,
            educationScore: 70,
            employmentScore: 85,
            incomeScore: 75,
            debtToIncomeRatio: 20,
            ipfsHash: "QmExampleHash",
            dataTimestamp: Math.floor(Date.now() / 1000),
        };

        await offChainDataManager.updateOffChainData(owner.address, offChainData);
        const offChainScore = await offChainDataManager.calculateOffChainScore(owner.address);
        expect(offChainScore).to.be.greaterThan(0);
    });

    it("should record a loan and track repayment", async function () {
        const [owner] = await ethers.getSigners();
        const loanAmount = ethers.utils.parseUnits("50", 18);
        const interestRate = 500; // 5%
        const duration = 30 * 24 * 60 * 60; // 30 days

        const loanId = await loanHistoryTracker.recordLoan(owner.address, loanAmount, interestRate, duration);
        const loan = await loanHistoryTracker.loans(loanId);

        expect(loan.amount).to.equal(loanAmount);
        expect(loan.isRepaid).to.be.false;

        await loanHistoryTracker.recordRepayment(owner.address, loanId, loanAmount);
        const updatedLoan = await loanHistoryTracker.loans(loanId);
        expect(updatedLoan.isRepaid).to.be.true;
    });
});