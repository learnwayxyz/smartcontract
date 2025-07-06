import { bigIntMin } from "./../node_modules/hardhat/node_modules/@ethereumjs/util/src/bytes";
import { zeroAddress } from "./../node_modules/ethereumjs-util/src/account";
import { bigint } from "./../node_modules/micro-packed/src/index";
import { LearnWay } from "./../typechain-types/contracts/LearnWay";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { assert, expect } from "chai";
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
export function getQuizHash(quizName: string) {
  return ethers.encodeBytes32String(quizName);
}

export enum QuizState {
  open,
  ongoing,
  closed,
  cancelled,
}

describe("LearnWay and Faucet", function () {
  describe("Deployment", function () {
    it("Should Deploy LearnWay", async function () {
      const { learnWay, learnWayToken, owner } = await loadFixture(
        deployLearnWay
      );
      expect(await learnWay.adminFeeBps()).to.equal(500);
      expect(await learnWay.entryFee()).to.equal(BigInt(50e18));
      expect(await learnWay.maxQuizDuration()).to.equal(60 * 15);
      expect(await learnWay.accumulatedFee()).to.equal(0);
      expect(await learnWay.feeAddress()).to.equal(await owner.getAddress());
      expect(await learnWay.lwt()).to.equal(await learnWayToken.getAddress());
    });
  });

  describe("Quiz", function () {
    it("Should create quiz", async function () {
      const { learnWayToken, learnWay, owner } = await loadFixture(
        deployLearnWay
      );
      const quiz1 = "Quiz1";
      const quizHash = getQuizHash(quiz1);
      console.log(quizHash);
      console.log(ethers.decodeBytes32String(quizHash));
      await learnWayToken.approve(await learnWay.getAddress(), BigInt(50e18));
      await expect(learnWay.createQuiz(quizHash))
        .to.emit(learnWay, "QuizOpened")
        .withArgs(quizHash, QuizState.open, owner.address, BigInt(50e18));
    });

    it("Should Join and Start Quiz", async function () {
      const { learnWayToken, learnWay, owner, user1, user2, user3, user4 } =
        await loadFixture(deployLearnWay);
      const quiz1 = "Quiz1";
      const quizHash = getQuizHash(quiz1);
      const newQuiz = "Quiz2";
      const newQuizHash = getQuizHash(newQuiz);
      console.log(newQuizHash);
      console.log(newQuiz);
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

      await learnWayToken
        .connect(user3)
        .approve(await learnWay.getAddress(), BigInt(50e18));
      await expect(learnWay.connect(user3).joinQuiz(quizHash))
        .to.emit(learnWay, "PartipantJoined")
        .withArgs(quizHash, QuizState.open, user3.address);

      //revert already participant
      await expect(
        learnWay.connect(user3).joinQuiz(quizHash)
      ).to.be.revertedWithCustomError(learnWay, "IsParticipant");

      //total stakes
      expect((await learnWay.quizzes(quizHash)).totalStake).to.equal(
        BigInt(200e18)
      );

      //participants playing
      expect(
        (await learnWay.participants(quizHash, await owner.getAddress()))
          .playing
      ).to.be.true;
      expect(
        (await learnWay.participants(quizHash, await user1.getAddress()))
          .playing
      ).to.be.true;
      expect(
        (await learnWay.participants(quizHash, await user2.getAddress()))
          .playing
      ).to.be.true;
      expect(
        (await learnWay.participants(quizHash, await user3.getAddress()))
          .playing
      ).to.be.true;
      expect(
        (await learnWay.participants(quizHash, await user4.getAddress()))
          .playing
      ).to.be.false;

      //revert NotParticipant
      await expect(
        learnWay.connect(user4).startQuiz(quizHash)
      ).to.be.revertedWithCustomError(learnWay, "NotParticipant");

      //start quiz
      await expect(learnWay.startQuiz(quizHash))
        .to.emit(learnWay, "QuizStarted")
        .withArgs(quizHash, QuizState.ongoing, owner.address);

      //revert not-created quiz
      await expect(
        learnWay.startQuiz(newQuizHash)
      ).to.be.revertedWithCustomError(learnWay, "QuizMissing");

      await expect(learnWay.startQuiz(quizHash)).to.be.revertedWithCustomError(
        learnWay,
        "InvalidState"
      );
    });

    it("Should submit Quiz", async function () {
      const { learnWayToken, learnWay, owner, user1, user2, user3, user4 } =
        await loadFixture(deployLearnWay);
      const quiz1 = "Quiz1";
      const quizHash = getQuizHash(quiz1);
      const newQuiz = "Quiz2";
      const newQuizHash = getQuizHash(newQuiz);
      const score = 100;
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

      await learnWayToken
        .connect(user3)
        .approve(await learnWay.getAddress(), BigInt(50e18));
      await expect(learnWay.connect(user3).joinQuiz(quizHash))
        .to.emit(learnWay, "PartipantJoined")
        .withArgs(quizHash, QuizState.open, user3.address);

      //revert quiz state on submit
      await expect(
        learnWay.submitScore(quizHash, score)
      ).to.be.revertedWithCustomError(learnWay, "InvalidState");

      //start quiz
      await expect(learnWay.startQuiz(quizHash))
        .to.emit(learnWay, "QuizStarted")
        .withArgs(quizHash, QuizState.ongoing, owner.address);

      //reverts

      await expect(
        learnWay.submitScore(newQuizHash, score)
      ).to.be.revertedWithCustomError(learnWay, "QuizMissing");

      await expect(
        learnWay.submitScore(quizHash, 0)
      ).to.be.revertedWithCustomError(learnWay, "ZeroNumber");

      await expect(
        learnWay.connect(user4).submitScore(quizHash, score)
      ).to.be.revertedWithCustomError(learnWay, "NotParticipant");

      //TODO: later change this to owner, only learnway backend can submit score
      await expect(learnWay.submitScore(quizHash, score))
        .to.emit(learnWay, "PartipantEvaluated")
        .withArgs(quizHash, QuizState.ongoing, owner.address, score);

      await expect(learnWay.connect(user1).submitScore(quizHash, 90))
        .to.emit(learnWay, "PartipantEvaluated")
        .withArgs(quizHash, QuizState.ongoing, user1.address, 90);

      await expect(learnWay.connect(user2).submitScore(quizHash, 80))
        .to.emit(learnWay, "PartipantEvaluated")
        .withArgs(quizHash, QuizState.ongoing, user2.address, 80);

      //revert already submitted
      await expect(
        learnWay.connect(user2).submitScore(quizHash, 70)
      ).to.be.revertedWithCustomError(learnWay, "ParticipantAlreadySubmitted");

      await expect(learnWay.connect(user3).submitScore(quizHash, 70))
        .to.emit(learnWay, "PartipantEvaluated")
        .withArgs(quizHash, QuizState.ongoing, user3.address, 70);

      //auto close quiz upon all submissions
      expect((await learnWay.quizzes(quizHash)).state).to.equal(
        QuizState.closed
      );
      expect((await learnWay.quizzes(quizHash)).submissions).to.be.equal(4);
      expect((await learnWay.quizzes(quizHash)).participants).to.be.equal(4);
      expect((await learnWay.quizzes(quizHash)).topScorer).to.be.equal(
        owner.address
      );
      expect((await learnWay.quizzes(quizHash)).highestScore).to.be.equal(100);
    });

    it("Should Close Quiz", async function () {
      const { learnWayToken, learnWay, owner, user1, user2, user3, user4 } =
        await loadFixture(deployLearnWay);
      const quiz1 = "Quiz1";
      const quizHash = getQuizHash(quiz1);
      const newQuiz = "Quiz2";
      const newQuizHash = getQuizHash(newQuiz);
      const score = 100;
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

      await learnWayToken
        .connect(user3)
        .approve(await learnWay.getAddress(), BigInt(50e18));
      await expect(learnWay.connect(user3).joinQuiz(quizHash))
        .to.emit(learnWay, "PartipantJoined")
        .withArgs(quizHash, QuizState.open, user3.address);

      //TODO: later change this to owner, only learnway backend can close quiz
      //revert not ongoing
      await expect(learnWay.closeQuiz(quizHash)).to.be.revertedWithCustomError(
        learnWay,
        "InvalidState"
      );

      //start quiz
      await expect(learnWay.startQuiz(quizHash))
        .to.emit(learnWay, "QuizStarted")
        .withArgs(quizHash, QuizState.ongoing, owner.address);

      //revert invalid top scorer
      await expect(learnWay.closeQuiz(quizHash)).to.be.revertedWithCustomError(
        learnWay,
        "InvalidWinner"
      );

      //submit score

      await expect(learnWay.submitScore(quizHash, score))
        .to.emit(learnWay, "PartipantEvaluated")
        .withArgs(quizHash, QuizState.ongoing, owner.address, score);

      await expect(learnWay.connect(user1).submitScore(quizHash, 90))
        .to.emit(learnWay, "PartipantEvaluated")
        .withArgs(quizHash, QuizState.ongoing, user1.address, 90);

      await expect(learnWay.connect(user2).submitScore(quizHash, 80))
        .to.emit(learnWay, "PartipantEvaluated")
        .withArgs(quizHash, QuizState.ongoing, user2.address, 80);

      const oldWinnerBalance = await learnWayToken.balanceOf(
        await owner.getAddress()
      );
      //close fee: 10e18 win: 190e18 total: 200e18
      await expect(learnWay.closeQuiz(quizHash))
        .to.emit(learnWay, "QuizClosed")
        .withArgs(
          quizHash,
          QuizState.closed,
          owner.address,
          BigInt(190e18),
          BigInt(10e18)
        );

      const newWinnerBalance = await learnWayToken.balanceOf(
        await owner.getAddress()
      );
      expect(newWinnerBalance).to.be.equal(oldWinnerBalance + BigInt(190e18));
      expect(await learnWay.accumulatedFee()).to.be.equal(BigInt(10e18));
    });

    it("Should Cancel Quiz", async function () {
      const { learnWayToken, learnWay, owner, user1 } = await loadFixture(
        deployLearnWay
      );
      const quiz1 = "Quiz1";
      const quizHash = getQuizHash(quiz1);
      const newQuiz = "Quiz2";
      const newQuizHash = getQuizHash(newQuiz);

      //create quiz
      await learnWayToken.approve(await learnWay.getAddress(), BigInt(50e18));
      await expect(learnWay.createQuiz(quizHash))
        .to.emit(learnWay, "QuizOpened")
        .withArgs(quizHash, QuizState.open, owner.address, BigInt(50e18));

      await expect(learnWay.cancelQuiz(quizHash))
        .to.emit(learnWay, "QuizCancelled")
        .withArgs(
          quizHash,
          QuizState.cancelled,
          ethers.ZeroAddress,
          BigInt(475e17),
          BigInt(25e17)
        );

      await expect(learnWay.cancelQuiz(quizHash)).to.be.revertedWithCustomError(
        learnWay,
        "InvalidState"
      );
    });

    it("Should Cancel Quiz - Reverts", async function () {
      const { learnWayToken, learnWay, owner, user1, user2, user3, user4 } =
        await loadFixture(deployLearnWay);
      const quiz1 = "Quiz1";
      const quizHash = getQuizHash(quiz1);
      const newQuiz = "Quiz2";
      const newQuizHash = getQuizHash(newQuiz);
      const score = 100;
      //create quiz
      await learnWayToken.approve(await learnWay.getAddress(), BigInt(50e18));
      await expect(learnWay.createQuiz(quizHash))
        .to.emit(learnWay, "QuizOpened")
        .withArgs(quizHash, QuizState.open, owner.address, BigInt(50e18));

      //revert MustBeOperator
      await expect(
        learnWay.connect(user1).cancelQuiz(quizHash)
      ).to.be.revertedWithCustomError(learnWay, "MustBeOperator");

      //join quiz
      await learnWayToken
        .connect(user1)
        .approve(await learnWay.getAddress(), BigInt(50e18));
      await expect(learnWay.connect(user1).joinQuiz(quizHash))
        .to.emit(learnWay, "PartipantJoined")
        .withArgs(quizHash, QuizState.open, user1.address);

      //revert participants joined
      await expect(learnWay.cancelQuiz(quizHash)).to.be.revertedWithCustomError(
        learnWay,
        "QuizHasParticipants"
      );
    });
  });
});
