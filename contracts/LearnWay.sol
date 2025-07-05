// contracts/GLDToken.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "@openzeppelin/contracts/utils/math/Math.sol";

import "@openzeppelin/contracts/proxy/utils/Initializable.sol";

/**
 * @author  .
 * @title   Learn Way Contract
 * @dev     Only meant to used in proof of concept and to speed up frontend integration
 * @notice  Little security considerations made and lots of concepts stripped off for simplicity
 */

contract LearnWay is Initializable {
    enum QuizState {
        open,
        ongoing,
        closed,
        cancelled
    }

    struct Quiz {
        uint256 participants;
        uint256 highestScore;
        uint256 totalStake;
        uint256 entryFee;
        address topScorer;
        address operator;
        QuizState state;
        bytes32 offchianHash;
        uint256 submissions;
    }

    struct Participant {
        bool playing;
        uint256 score;
    }

    uint256 public adminFeeBps;
    uint256 public entryFee;
    uint256 public maxQuizDuration;
    uint256 public accumulatedFee;
    address public feeAddress;
    IERC20 public lwt;

    mapping(bytes32 => Quiz) public quizzes;
    mapping(bytes32 => mapping(address => Participant)) public participants;

    function initialize(address _lwtAddress) public initializer {
        adminFeeBps = 500;
        entryFee = 50e18;
        maxQuizDuration = 15 minutes;
        accumulatedFee = 0;
        lwt = IERC20(_lwtAddress);
        feeAddress = msg.sender;
    }

    event QuizOpened(
        bytes32 quizHash,
        QuizState state,
        address operator,
        uint256 entryFee
    );
    event QuizStarted(bytes32 quizHash, QuizState state, address starter);
    event QuizClosed(
        bytes32 quizHash,
        QuizState state,
        address winner,
        uint256 won,
        uint256 fee
    );
    event QuizCancelled(
        bytes32 quizHash,
        QuizState state,
        address winner,
        uint256 won,
        uint256 fee
    );
    event PartipantJoined(
        bytes32 quizHash,
        QuizState state,
        address participant
    );
    event PartipantEvaluated(
        bytes32 quizHash,
        QuizState state,
        address participant,
        uint256 score
    );

    error InvariantCheckFailed();
    error InvalidState(QuizState _state);
    error ZeroAddress();
    error ZeroNumber();
    error QuizExists();
    error QuizMissing();
    error NotParticipant();
    error IsParticipant();
    error ParticipantAlreadySubmitted();
    error InvalidWinner();
    error InvalidTotalStake();
    error MustBeOperator();
    error QuizHasParticipants();

    modifier nonZero(uint256 num) {
        if (num == 0) {
            revert ZeroNumber();
        }
        _;
    }

    modifier nonZeroAddress(address addr) {
        if (address(0) == addr) {
            revert ZeroAddress();
        }
        _;
    }

    modifier existingQuiz(bytes32 _quizHash) {
        if (quizzes[_quizHash].participants == 0) {
            revert QuizMissing();
        }
        _;
    }

    modifier newQuiz(bytes32 _quizHash) {
        if (quizzes[_quizHash].participants > 0) {
            revert QuizExists();
        }
        _;
    }

    modifier quizInState(bytes32 _quizHash, QuizState _state) {
        if (_quizState(_quizHash) != _state) {
            revert InvalidState(_quizState(_quizHash));
        }
        _;
    }

    modifier notParticipant(bytes32 _quizHash, address addr) {
        if (participants[_quizHash][addr].playing) {
            revert IsParticipant();
        }
        _;
    }

    modifier isParticipant(bytes32 _quizHash, address addr) {
        if (!participants[_quizHash][addr].playing) {
            revert NotParticipant();
        }
        _;
    }

    /**
     * @notice  .
     * @dev     create a new quiz, will deduct entry fee
     * @param   _quizHash  .
     */
    function createQuiz(bytes32 _quizHash) external newQuiz(_quizHash) {
        quizzes[_quizHash] = Quiz(
            1,
            0,
            entryFee,
            entryFee,
            address(0),
            msg.sender,
            QuizState.open,
            _quizHash,
            0
        );
        participants[_quizHash][msg.sender] = Participant(true, 0);
        _deposit(entryFee);
        emit QuizOpened(
            _quizHash,
            _quizState(_quizHash),
            quizzes[_quizHash].operator,
            quizzes[_quizHash].entryFee
        );
    }

    /**
     * @notice  .
     * @dev     start quiz after people have joined.
     * @param   _quizHash  .
     */
    function startQuiz(
        bytes32 _quizHash
    )
        external
        existingQuiz(_quizHash)
        quizInState(_quizHash, QuizState.open)
        isParticipant(_quizHash, msg.sender)
        //@audit Operator or any participant can startQuiz?
   {
        quizzes[_quizHash].state = QuizState.ongoing;
        emit QuizStarted(_quizHash, quizzes[_quizHash].state, msg.sender);
    }

    /**
     * @notice  .
     * @dev     join quiz after invited, will deduct entry fee
     * @param   _quizHash  .
     */
    function joinQuiz(
        bytes32 _quizHash
    )
        external
        existingQuiz(_quizHash)
        quizInState(_quizHash, QuizState.open)
        notParticipant(_quizHash, msg.sender)
    {
        quizzes[_quizHash].participants += 1;
        quizzes[_quizHash].totalStake += quizzes[_quizHash].entryFee;
        participants[_quizHash][msg.sender] = Participant(true, 0);
        _deposit(quizzes[_quizHash].entryFee);
        emit PartipantJoined(_quizHash, _quizState(_quizHash), msg.sender);
    }

    /**
     * @notice  .
     * @dev     .
     * @param   _quizHash  .
     * @param   _score  .
     * TODO: later change this to owner, only learnway backend can submit score
     */
    function submitScore(
        bytes32 _quizHash,
        uint256 _score
    )
        external
        existingQuiz(_quizHash)
        nonZero(_score)
        quizInState(_quizHash, QuizState.ongoing)
        isParticipant(_quizHash, msg.sender)
    {
        if (participants[_quizHash][msg.sender].score > 0) {
            revert ParticipantAlreadySubmitted();
        }
        quizzes[_quizHash].submissions += 1;
        participants[_quizHash][msg.sender].score = _score;
        if (_score > quizzes[_quizHash].highestScore) {
            quizzes[_quizHash].highestScore = _score;
            quizzes[_quizHash].topScorer = msg.sender;
        }
        emit PartipantEvaluated(
            _quizHash,
            _quizState(_quizHash),
            msg.sender,
            _score
        );
        if (quizzes[_quizHash].submissions == quizzes[_quizHash].participants) {
            closeQuiz(_quizHash);
        }
    }

    /**
     * @notice  .
     * @dev     close the quiz.
     * @param   _quizHash  .
     * TODO: later change this to owner, only learnway backend can close quiz
     */
    function closeQuiz(
        bytes32 _quizHash
    ) public quizInState(_quizHash, QuizState.ongoing) {
        quizzes[_quizHash].state = QuizState.closed;
        if (quizzes[_quizHash].topScorer == address(0)) {
            revert InvalidWinner();
        }
        if (quizzes[_quizHash].totalStake == 0) {
            revert InvalidTotalStake();
        }
        (uint256 fee, uint256 won) = _deductFee(quizzes[_quizHash].totalStake);
        _withdraw(won, quizzes[_quizHash].topScorer);
        emit QuizClosed(
            _quizHash,
            _quizState(_quizHash),
            quizzes[_quizHash].topScorer,
            won,
            fee
        );
    }

    /**
     * @notice  .
     * @dev     cancel the quiz, if no one joins.
     * @param   _quizHash  .
     * TODO: later change this to owner, only learnway backend can close quiz
     */
    function cancelQuiz(
        bytes32 _quizHash
    ) external quizInState(_quizHash, QuizState.open) {
        quizzes[_quizHash].state = QuizState.cancelled;
        if (quizzes[_quizHash].participants > 1) {
            revert QuizHasParticipants();
        }
        if (quizzes[_quizHash].operator != msg.sender) {
            revert MustBeOperator();
        }
        if (quizzes[_quizHash].totalStake == 0) {
            revert InvalidTotalStake();
        }
        (uint256 fee, uint256 won) = _deductFee(quizzes[_quizHash].totalStake);
        _withdraw(won, quizzes[_quizHash].operator);
        emit QuizCancelled(
            _quizHash,
            _quizState(_quizHash),
            quizzes[_quizHash].topScorer,
            won,
            fee
        );
    }

    function _deductFee(
        uint256 _amount
    ) internal returns (uint256 fee, uint256 remainder) {
        fee = _basisPoint(_amount, adminFeeBps);
        accumulatedFee += fee;
        remainder = _amount - fee;
    }

    function _quizState(
        bytes32 _quizHash
    ) internal view returns (QuizState _state) {
        return quizzes[_quizHash].state;
    }

    function _deposit(uint256 _amt) internal {
        uint256 balanceBefore = IERC20(lwt).balanceOf(address(this));
        SafeERC20.safeTransferFrom(
            IERC20(lwt),
            msg.sender,
            address(this),
            _amt
        );
        uint256 balanceAfter = IERC20(lwt).balanceOf(address(this));
        if ((balanceAfter - balanceBefore) != _amt) {
            revert InvariantCheckFailed();
        }
    }

    function _withdraw(uint256 _amt, address _to) internal {
        uint256 balanceBefore = IERC20(lwt).balanceOf(address(this));
        SafeERC20.safeTransfer(IERC20(lwt), _to, _amt);
        uint256 balanceAfter = IERC20(lwt).balanceOf(address(this));
        if ((balanceBefore - balanceAfter) != _amt) {
            revert InvariantCheckFailed();
        }
    }

    // @dev computes fraction of [value] in [bps]
    // 100 bps is equivalent to 1%
    function _basisPoint(
        uint256 value,
        uint256 bps
    ) internal pure returns (uint256) {
        require((value * bps) >= 10_000);
        return Math.mulDiv(value, bps, 10_000);
    }
}
