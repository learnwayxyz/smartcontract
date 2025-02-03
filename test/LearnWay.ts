import {
  time,
  loadFixture
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

export async function deployLearnWay() {
  const [owner, learner] = await ethers.getSigners();

  const LearnWay = await ethers.getContractFactory("LearnWay");
  const learnWay = await LearnWay.deploy();

  return { learnWay, owner, learner };
}

describe("LearnWay", function () {
  describe("Deployment", function () {
    it("Should Deploy", async function () {
      await loadFixture(deployLearnWay);
    });
  });

  describe("Claim LearnWay", function () {
    it("Should Claim LearnWay", async function () {
      const { learnWay, learner } = await loadFixture(deployLearnWay);
    });
  });
});
