import {
  time,
  loadFixture
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

export async function deployLearnWayFaucet() {
  const [owner, otherAccount] = await ethers.getSigners();

  const LearnWay = await ethers.getContractFactory("LearnWayToken");
  const learnWay = await LearnWay.deploy();

  const LearnWayFaucet = await ethers.getContractFactory("LearnWayFaucet");
  const faucet = await LearnWayFaucet.deploy(learnWay);

  await learnWay.transfer(await faucet.getAddress(), BigInt(1e24));
  return { learnWay, owner, otherAccount, faucet };
}

describe("LearnWayFaucet", function () {
  describe("Deployment", function () {
    it("Should Deploy", async function () {
      await loadFixture(deployLearnWayFaucet);
    });
  });

  describe("Claim LearnWay", function () {
    it("Should Claim LearnWay", async function () {
      const { faucet, otherAccount } = await loadFixture(deployLearnWayFaucet);
      await expect(faucet.connect(otherAccount).claim())
        .emit(faucet, "Claimed")
        .withArgs(await otherAccount.getAddress(), await faucet.dailyClaim());

      await expect(
        faucet.connect(otherAccount).claim()
      ).revertedWithCustomError(faucet, "AlreadyClaimed");
    });
  });
});
