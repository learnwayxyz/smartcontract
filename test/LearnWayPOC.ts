import {
  time,
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

export async function deployLearnWayPOC() {
  const [owner, learner, scholar, ofui] = await ethers.getSigners();

  const LearnWayToken = await ethers.getContractFactory("LearnWayToken");
  const lwt = await LearnWayToken.deploy();

  const LearnWay = await ethers.getContractFactory("LearnWayPOC");
  const lw = await LearnWay.deploy(lwt);

  const amili = BigInt(1e21);

  await lwt.transfer(learner.address, amili);
  await lwt.transfer(scholar.address, amili);
  await lwt.transfer(ofui.address, amili);

  const quizHash = ethers.keccak256(ethers.toUtf8Bytes("1"));

  return { lw, lwt, owner, learner, scholar, ofui, amili, quizHash };
}

describe("LearnWayPOC", function () {
  describe("Deployment", function () {
    it("Should Deploy", async function () {
      await loadFixture(deployLearnWayPOC);
    });
  });

  describe("LearnWay POC Flow", function () {
    it("Should [start, join, submit, close] Quiz", async function () {
      const { lw, owner, learner, scholar, ofui, quizHash, lwt } =
        await loadFixture(deployLearnWayPOC);

      const now = BigInt((await time.latest()) + 2);
      const joinTime = now + (await lw.joinPeriod());
      const endTime = joinTime + (await lw.quizDuration());
      const submitTime = endTime + (await lw.submitPeriod());
      lwt.connect(learner).approve(await lw.getAddress(), await lw.entryFee());

      await expect(lw.connect(learner).startQuiz(quizHash))
        .to.emit(lw, "QuizOpened")
        .withArgs(
          quizHash,
          0,
          learner.address,
          await lw.entryFee(),
          joinTime,
          endTime,
          submitTime
        );

      await expect(
        lw.connect(learner).startQuiz(quizHash)
      ).to.revertedWithCustomError(lw, "QuizExists");

      await expect(
        lw.connect(learner).joinQuiz(quizHash)
      ).to.revertedWithCustomError(lw, "IsParticipant");

      await lwt
        .connect(scholar)
        .approve(await lw.getAddress(), (await lw.quizzes(quizHash)).entryFee);
      await expect(lw.connect(scholar).joinQuiz(quizHash))
        .to.emit(lw, "PartipantJoined")
        .withArgs(quizHash, 0, scholar.address);

      await lwt
        .connect(ofui)
        .approve(await lw.getAddress(), (await lw.quizzes(quizHash)).entryFee);
      await expect(lw.connect(ofui).joinQuiz(quizHash))
        .to.emit(lw, "PartipantJoined")
        .withArgs(quizHash, 0, ofui.address);

      await time.increaseTo(joinTime + BigInt(60));

      await lwt.approve(
        await lw.getAddress(),
        (
          await lw.quizzes(quizHash)
        ).entryFee
      );

      await expect(lw.joinQuiz(quizHash))
        .to.revertedWithCustomError(lw, "InvalidState")
        .withArgs(1);
      expect((await lw.quizzes(quizHash)).participants).to.equal(3);
      expect((await lw.quizzes(quizHash)).totalStake).to.equal(
        BigInt(3) * (await lw.quizzes(quizHash)).entryFee
      );

      await expect(lw.connect(learner).submitScore(quizHash, 50))
        .to.revertedWithCustomError(lw, "InvalidState")
        .withArgs(1);

      await time.increaseTo(endTime + BigInt(60));

      await expect(lw.connect(learner).submitScore(quizHash, 50))
        .to.emit(lw, "PartipantEvaluated")
        .withArgs(quizHash, 3, learner.address, 50);

      await expect(lw.connect(ofui).submitScore(quizHash, 1))
        .to.emit(lw, "PartipantEvaluated")
        .withArgs(quizHash, 3, ofui.address, 1);

      await expect(
        lw.connect(ofui).submitScore(quizHash, 1)
      ).to.revertedWithCustomError(lw, "ParticipantAlreadySubmitted");

      expect((await lw.quizzes(quizHash)).highestScore).to.equal(50);
      expect((await lw.quizzes(quizHash)).topScorer).to.equal(learner.address);

      await expect(lw.connect(scholar).submitScore(quizHash, 100))
        .to.emit(lw, "PartipantEvaluated")
        .withArgs(quizHash, 3, scholar.address, 100);

      expect((await lw.quizzes(quizHash)).highestScore).to.equal(100);
      expect((await lw.quizzes(quizHash)).topScorer).to.equal(scholar.address);

      await expect(lw.closeQuiz(quizHash))
        .to.revertedWithCustomError(lw, "InvalidState")
        .withArgs(3);

      await time.increaseTo(submitTime + BigInt(60));

      const totalStakes = BigInt(3) * (await lw.quizzes(quizHash)).entryFee;

      const fee = BigInt(totalStakes * BigInt(5)) / BigInt(100);

      const won = totalStakes - fee;

      await expect(lw.closeQuiz(quizHash))
        .to.emit(lw, "QuizClosed")
        .withArgs(quizHash, 2, scholar.address, won, fee)
        .to.emit(lwt, "Transfer")
        .withArgs(await lw.getAddress(), scholar.address, won);

      expect(await lw.accumulatedFee()).to.equal(fee);
    });
  });
});
