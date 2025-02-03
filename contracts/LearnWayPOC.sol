// contracts/GLDToken.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "@openzeppelin/contracts/utils/math/Math.sol";

/**
 * @author  .
 * @title   Learn Way POC Contract
 * @dev     Only meant to used in proof of concept and to speed up frontend integration
 * @notice  Little security considerations made and lots of concepts stripped off for simplicity
 */

contract LearnWayPOC is Ownable {
    enum QuizState {
        open,
        ongoing,
        closed,
        submit,
        timeout
    }

    struct Quiz {
        uint256 participants;
        uint256 highestScore;
        uint256 totalStake;
        uint256 entryFee;
        address topScorer;
        address operator;
        uint256 joinTime;
        uint256 endTime;
        uint256 submitTime;
        QuizState state;
        bytes32 offchianHash;
    }

    struct Participant {
        bool playing;
        uint256 score;
    }

    uint256 public adminFeeBps = 500;
    uint256 public entryFee = 50e18;
    uint256 public joinPeriod = 5 minutes;
    uint256 public quizDuration = 15 minutes;
    uint256 public submitPeriod = 10 minutes;
    uint256 public accumulatedFee = 0;
    address public feeAddress;
    IERC20 public lwt;

    mapping(bytes32 => Quiz) public quizzes;
    mapping(bytes32 => mapping(address => Participant)) public participants;

    constructor(address _lwtAddress) Ownable(msg.sender) {
        lwt = IERC20(_lwtAddress);
        feeAddress = msg.sender;
    }

    event QuizOpened(
        bytes32 quizHash,
        QuizState state,
        address operator,
        uint256 entryFee,
        uint256 joinTime,
        uint256 endTime,
        uint256 submitTime
    );
    event QuizClosed(
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

    function startQuiz(bytes32 _quizHash) external newQuiz(_quizHash) {
        quizzes[_quizHash] = Quiz(
            1,
            0,
            entryFee,
            entryFee,
            address(0),
            msg.sender,
            block.timestamp + joinPeriod,
            block.timestamp + joinPeriod + quizDuration,
            block.timestamp + joinPeriod + quizDuration + submitPeriod,
            QuizState.open,
            _quizHash
        );
        participants[_quizHash][msg.sender] = Participant(true, 0);
        _deposit(entryFee);
        emit QuizOpened(
            _quizHash,
            _quizState(_quizHash),
            quizzes[_quizHash].operator,
            quizzes[_quizHash].entryFee,
            quizzes[_quizHash].joinTime,
            quizzes[_quizHash].endTime,
            quizzes[_quizHash].submitTime
        );
    }

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

    function submitScore(
        bytes32 _quizHash,
        uint256 _score
    )
        external
        existingQuiz(_quizHash)
        nonZero(_score)
        quizInState(_quizHash, QuizState.submit)
        isParticipant(_quizHash, msg.sender)
    {
        if (participants[_quizHash][msg.sender].score > 0) {
            revert ParticipantAlreadySubmitted();
        }
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
    }

    function closeQuiz(
        bytes32 _quizHash
    ) external quizInState(_quizHash, QuizState.timeout) {
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
        if (quizzes[_quizHash].state == QuizState.open) {
            if (block.timestamp > quizzes[_quizHash].joinTime) {
                if (block.timestamp < quizzes[_quizHash].endTime) {
                    return QuizState.ongoing;
                }
                if (block.timestamp < quizzes[_quizHash].submitTime) {
                    return QuizState.submit;
                }
                return QuizState.timeout;
            }
        }
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
