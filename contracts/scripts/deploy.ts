import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  // Truyền địa chỉ owner vào constructor
  const CreditScore = await ethers.getContractFactory("CreditScore");
  const creditScore = await CreditScore.deploy(deployer.address);

  await creditScore.waitForDeployment();

  console.log("CreditScore deployed to:", await creditScore.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});