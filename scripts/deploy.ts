import { ethers, upgrades } from "hardhat";
import "dotenv/config";

async function main() {
  const LearnWay = await ethers.getContractFactory("LearnWay");
  const learnWay = await upgrades.deployProxy(LearnWay, [process.env.LWT!]);
  await learnWay.waitForDeployment();
  console.log("LearnWay deployed to:", await learnWay.getAddress());
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
