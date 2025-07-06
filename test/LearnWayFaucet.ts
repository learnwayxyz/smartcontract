import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
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

    it("Should set daily claim", async function () {
      const { faucet, otherAccount } = await loadFixture(deployLearnWayFaucet);

      await expect(faucet.setDailyClaim(BigInt(100e18))).to.not.be.reverted;
      expect(await faucet.dailyClaim()).to.be.equal(BigInt(100e18));

      await expect(
        faucet.connect(otherAccount).setDailyClaim(BigInt(100e18))
      ).to.be.revertedWithCustomError(faucet, "OwnableUnauthorizedAccount");
    });

    it("Should drain", async function () {
      const { faucet, otherAccount, learnWay } = await loadFixture(
        deployLearnWayFaucet
      );

      const balanceBefore = await learnWay.balanceOf(await faucet.getAddress());

      await expect(
        faucet.connect(otherAccount).drain()
      ).to.be.revertedWithCustomError(faucet, "OwnableUnauthorizedAccount");

      await expect(faucet.drain()).to.not.be.reverted;

      const balanceAfter = await learnWay.balanceOf(await faucet.getAddress());
      expect(balanceAfter).to.be.lessThan(balanceBefore);
      expect(balanceAfter).to.be.equal(0);
    });
  });
});
