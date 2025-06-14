import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // Địa chỉ vừa deploy

  const CreditScore = await ethers.getContractAt("CreditScore", contractAddress);

  // Cập nhật điểm cho một user
//   const tx = await CreditScore.updateScore(deployer.address, 800);
//   await tx.wait();

  // Lấy điểm
  const score = await CreditScore.getScore(deployer.address);
  console.log("Score:", score.toString());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});