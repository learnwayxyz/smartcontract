import { LearnWayToken } from "./../typechain-types/contracts/token/LearnWayToken";
import { LearnWay } from "./../typechain-types/contracts/LearnWay";
import {
  time,
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

export async function deployLearnWay() {
  const [owner, otherAccount, user1, user2, user3, user4] =
    await ethers.getSigners();

  const LearnWayToken = await ethers.getContractFactory("LearnWayToken");
  const learnWayToken = await LearnWayToken.deploy();

  const LearnWayFaucet = await ethers.getContractFactory("LearnWayFaucet");
  const faucet = await LearnWayFaucet.deploy(learnWayToken);

  await learnWayToken.transfer(await faucet.getAddress(), BigInt(1e24));
  await learnWayToken.transfer(await user1.getAddress(), BigInt(50e18));

  await learnWayToken.transfer(await user2.getAddress(), BigInt(50e18));

  await learnWayToken.transfer(await user3.getAddress(), BigInt(50e18));
  const LearnWay = await ethers.getContractFactory("LearnWay");
  const learnWay = await LearnWay.deploy();
  //init
  learnWay.initialize(await learnWayToken.getAddress());

  return {
    learnWayToken,
    learnWay,
    owner,
    otherAccount,
    faucet,
    user1,
    user2,
    user3,
    user4,
  };
}
export enum QuizState {
  open,
  ongoing,
  closed,
  cancelled,
}

export function getQuizHash(quizName: string) {
  return ethers.encodeBytes32String(quizName);
}

describe("LearnWayFaucet", function () {
  describe("Deployment", function () {
    it("Should Deploy", async function () {
      await loadFixture(deployLearnWay);
    });
  });

  describe("Claim LearnWay", function () {
    it("Should Claim LearnWay", async function () {
      const { faucet, otherAccount } = await loadFixture(deployLearnWay);
      await expect(faucet.connect(otherAccount).claim())
        .emit(faucet, "Claimed")
        .withArgs(await otherAccount.getAddress(), await faucet.dailyClaim());

      await expect(
        faucet.connect(otherAccount).claim()
      ).revertedWithCustomError(faucet, "AlreadyClaimed");
    });
  });
});

//PoCs
describe("Audit PoCs", function () {
  it("Should Test any Participant can start quiz instead of operator", async function () {
    const { learnWayToken, learnWay, owner, user1, user2, user3, user4 } =
      await loadFixture(deployLearnWay);
    const quiz1 = "Quiz1";
    const quizHash = getQuizHash(quiz1);

    //create quiz: operator = owner.address
    await learnWayToken.approve(await learnWay.getAddress(), BigInt(50e18));
    await expect(learnWay.createQuiz(quizHash))
      .to.emit(learnWay, "QuizOpened")
      .withArgs(quizHash, QuizState.open, owner.address, BigInt(50e18));

    //join quiz
    await learnWayToken
      .connect(user1)
      .approve(await learnWay.getAddress(), BigInt(50e18));
    await expect(learnWay.connect(user1).joinQuiz(quizHash))
      .to.emit(learnWay, "PartipantJoined")
      .withArgs(quizHash, QuizState.open, user1.address);

    await learnWayToken
      .connect(user2)
      .approve(await learnWay.getAddress(), BigInt(50e18));
    await expect(learnWay.connect(user2).joinQuiz(quizHash))
      .to.emit(learnWay, "PartipantJoined")
      .withArgs(quizHash, QuizState.open, user2.address);

    //@audit user1 start quiz
    await expect(learnWay.connect(user1).startQuiz(quizHash))
      .to.emit(learnWay, "QuizStarted")
      .withArgs(quizHash, QuizState.ongoing, user1.address);
  });

  it("Should test multiple players with same high score", async function () {
    const { learnWayToken, learnWay, owner, user1, user2, user3, user4 } =
      await loadFixture(deployLearnWay);
    const quiz1 = "Quiz1";
    const quizHash = getQuizHash(quiz1);

    //create quiz
    await learnWayToken.approve(await learnWay.getAddress(), BigInt(50e18));
    await expect(learnWay.createQuiz(quizHash))
      .to.emit(learnWay, "QuizOpened")
      .withArgs(quizHash, QuizState.open, owner.address, BigInt(50e18));

    //join quiz
    await learnWayToken
      .connect(user1)
      .approve(await learnWay.getAddress(), BigInt(50e18));
    await expect(learnWay.connect(user1).joinQuiz(quizHash))
      .to.emit(learnWay, "PartipantJoined")
      .withArgs(quizHash, QuizState.open, user1.address);

    await learnWayToken
      .connect(user2)
      .approve(await learnWay.getAddress(), BigInt(50e18));
    await expect(learnWay.connect(user2).joinQuiz(quizHash))
      .to.emit(learnWay, "PartipantJoined")
      .withArgs(quizHash, QuizState.open, user2.address);

    //start quiz
    await expect(learnWay.startQuiz(quizHash))
      .to.emit(learnWay, "QuizStarted")
      .withArgs(quizHash, QuizState.ongoing, owner.address);

    //submit score
    await expect(learnWay.submitScore(quizHash, 90))
      .to.emit(learnWay, "PartipantEvaluated")
      .withArgs(quizHash, QuizState.ongoing, owner.address, 90);

    await expect(learnWay.connect(user1).submitScore(quizHash, 90))
      .to.emit(learnWay, "PartipantEvaluated")
      .withArgs(quizHash, QuizState.ongoing, user1.address, 90);

    await expect(learnWay.connect(user2).submitScore(quizHash, 80))
      .to.emit(learnWay, "PartipantEvaluated")
      .withArgs(quizHash, QuizState.ongoing, user2.address, 80);

    //auto close quiz upon all submissions
    expect((await learnWay.quizzes(quizHash)).state).to.equal(QuizState.closed);
    expect((await learnWay.quizzes(quizHash)).submissions).to.be.equal(3);
    expect((await learnWay.quizzes(quizHash)).participants).to.be.equal(3);
    expect((await learnWay.quizzes(quizHash)).topScorer).to.be.equal(
      owner.address
    );

    //user1 removed from top score list.
    expect((await learnWay.quizzes(quizHash)).topScorer).to.not.equal(
      user1.address
    );
    
    expect((await learnWay.quizzes(quizHash)).highestScore).to.be.equal(90);
  });
});
