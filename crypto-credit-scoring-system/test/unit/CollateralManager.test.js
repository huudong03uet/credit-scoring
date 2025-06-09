const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CollateralManager", function () {
    let CollateralManager, collateralManager;
    let MockOracle, mockOracle;
    let UserRegistry, userRegistry;
    let owner, user;
    let token;

    beforeEach(async function () {
        [owner, user] = await ethers.getSigners();

        // Deploy UserRegistry first
        UserRegistry = await ethers.getContractFactory("UserRegistry");
        userRegistry = await UserRegistry.deploy();
        await userRegistry.deployed();

        // Deploy Mock Oracle
        MockOracle = await ethers.getContractFactory("MockOracle");
        mockOracle = await MockOracle.deploy();
        await mockOracle.deployed();

        // Deploy Collateral Manager
        CollateralManager = await ethers.getContractFactory("CollateralManager");
        collateralManager = await CollateralManager.deploy(userRegistry.address, mockOracle.address);
        await collateralManager.deployed();

        // Fix: Use MockERC20 instead of ERC20Mock
        const Token = await ethers.getContractFactory("MockERC20");
        token = await Token.deploy("Test Token", "TT", 18);
        await token.deployed();

        // Register and verify user first
        const profileHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test"));
        await userRegistry.connect(user).registerUser("did:test:user", profileHash);
        
        // Add the token to the Collateral Manager
        await collateralManager.addSupportedToken(token.address, 1500);
        
        // Transfer some tokens to user for testing
        await token.transfer(user.address, ethers.utils.parseUnits("1000", 18));
    });

    describe("Deposit Collateral", function () {
        it("should allow a user to deposit collateral", async function () {
            await token.connect(user).approve(collateralManager.address, ethers.utils.parseUnits("100", 18));
            await collateralManager.connect(user).depositCollateral(token.address, ethers.utils.parseUnits("100", 18));

            const userCollaterals = await collateralManager.getUserCollaterals(user.address);
            expect(userCollaterals.length).to.equal(1);
            expect(userCollaterals[0].amount).to.equal(ethers.utils.parseUnits("100", 18));
        });

        it("should emit CollateralDeposited event", async function () {
            await token.connect(user).approve(collateralManager.address, ethers.utils.parseUnits("100", 18));
            await expect(collateralManager.connect(user).depositCollateral(token.address, ethers.utils.parseUnits("100", 18)))
                .to.emit(collateralManager, "CollateralDeposited")
                .withArgs(user.address, token.address, ethers.utils.parseUnits("100", 18), ethers.utils.parseUnits("100", 18));
        });

        it("should revert if the token is not supported", async function () {
            const unsupportedToken = ethers.Wallet.createRandom().address;
            await expect(collateralManager.connect(user).depositCollateral(unsupportedToken, ethers.utils.parseUnits("100", 18)))
                .to.be.revertedWith("Token not supported");
        });
    });

    describe("Withdraw Collateral", function () {
        beforeEach(async function () {
            await token.connect(user).approve(collateralManager.address, ethers.utils.parseUnits("100", 18));
            await collateralManager.connect(user).depositCollateral(token.address, ethers.utils.parseUnits("100", 18));
        });

        it("should allow a user to withdraw collateral", async function () {
            const userCollateralsBefore = await collateralManager.getUserCollaterals(user.address);
            expect(userCollateralsBefore.length).to.equal(1);

            await collateralManager.connect(user).withdrawCollateral(0);

            const userCollateralsAfter = await collateralManager.getUserCollaterals(user.address);
            expect(userCollateralsAfter.length).to.equal(0);
        });

        it("should emit CollateralWithdrawn event", async function () {
            await expect(collateralManager.connect(user).withdrawCollateral(0))
                .to.emit(collateralManager, "CollateralWithdrawn")
                .withArgs(user.address, token.address, ethers.utils.parseUnits("100", 18));
        });

        it("should revert if the collateral is not active", async function () {
            await collateralManager.connect(user).withdrawCollateral(0); // Withdraw first
            await expect(collateralManager.connect(user).withdrawCollateral(0)).to.be.revertedWith("Collateral not active");
        });
    });

    describe("Calculate Collateral Score", function () {
        it("should calculate collateral score based on total value", async function () {
            await token.connect(user).approve(collateralManager.address, ethers.utils.parseUnits("100", 18));
            await collateralManager.connect(user).depositCollateral(token.address, ethers.utils.parseUnits("100", 18));

            const score = await collateralManager.calculateCollateralScore(user.address);
            expect(score).to.equal(50); // Assuming the total value is $1k+
        });
    });
});