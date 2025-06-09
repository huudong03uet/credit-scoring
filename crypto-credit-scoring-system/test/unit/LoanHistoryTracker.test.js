const { expect } = require("chai");
const { ethers } = require("hardhat");



describe("LoanHistoryTracker", function () {
    let LoanHistoryTracker, loanHistoryTracker;
    let owner, user;

    beforeEach(async function () {
        [owner, user] = await ethers.getSigners();

        LoanHistoryTracker = await ethers.getContractFactory("LoanHistoryTracker");
        loanHistoryTracker = await LoanHistoryTracker.deploy();
        await loanHistoryTracker.deployed();
    });

    it("should allow repayment of a loan", async function () {
        // Record loan first
        const tx = await loanHistoryTracker.recordLoan(
            user.address,
            ethers.utils.parseEther("1"),
            500, // 5% interest rate
            30 * 24 * 60 * 60 // 30 days duration
        );
        
        // Wait for transaction and get loanId from event
        const receipt = await tx.wait();
        const loanRecordedEvent = receipt.events.find(e => e.event === 'LoanRecorded');
        const loanId = loanRecordedEvent.args.loanId;

        // Now test repayment with proper loanId
        await expect(loanHistoryTracker.recordRepayment(
            user.address,
            loanId, // Use the actual loanId from event
            ethers.utils.parseEther("1.05") // repaid amount
        )).to.emit(loanHistoryTracker, "LoanRepaid");
    });

    it("should record a defaulted loan", async function () {
        // Record loan
        const tx = await loanHistoryTracker.recordLoan(
            user.address,
            ethers.utils.parseEther("1"),
            500,
            1 // 1 second duration for quick testing
        );
        
        const receipt = await tx.wait();
        const loanId = receipt.events.find(e => e.event === 'LoanRecorded').args.loanId;

        // Fast forward time past loan duration
        await ethers.provider.send("evm_increaseTime", [2]); // 2 seconds
        await ethers.provider.send("evm_mine"); // Mine a block

        // Record default
        await expect(loanHistoryTracker.recordDefault(user.address, loanId))
            .to.emit(loanHistoryTracker, "LoanDefaulted");
    });
});