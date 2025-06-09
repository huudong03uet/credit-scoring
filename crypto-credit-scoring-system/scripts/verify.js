const { run } = require("hardhat");

async function main() {
    const contracts = [
        "CreditScoringEngine",
        "UserRegistry",
        "CollateralManager",
        "OffChainDataManager",
        "LoanHistoryTracker",
        "OnChainAnalyzer",
        "MockOracle"
    ];

    for (const contract of contracts) {
        console.log(`Verifying ${contract}...`);
        await run("verify:verify", {
            address: (await deployments.get(contract)).address,
            constructorArguments: []
        });
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });