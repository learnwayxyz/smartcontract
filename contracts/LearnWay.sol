// contracts/GLDToken.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "@openzeppelin/contracts/utils/math/Math.sol";

contract LearnWay is Ownable {
    enum QuizState {
        open,
        closed,
        ongoing,
        timeout,
        cancelled
    }

    struct Quiz {
        uint256 startTime;
        uint256 minStartTime;
        uint256 duration;
        uint256 entryFee;
        uint256 maxParticipants;
        uint256 maxScore;
        address operator;
        bool whitelist;
        QuizState state;
        bytes offchianHash;
    }

    struct Participant {
        bool playing;
        uint256 score;
        uint256 won;
    }

    uint256 public adminFeeBps = 500;
    address public feeAddress;
    address public quizMaster;
    IERC20 public lwt;

    mapping(bytes => Quiz) quizzes;
    mapping(bytes => mapping(address => Participant)) internal participants;
    mapping(bytes => mapping(address => Participant)) internal whitelists;

    constructor(
        address _lwtAddress,
        address _feeAddress,
        address _quizMaster,
        uint256 _adminFeeBps
    ) Ownable(msg.sender) {
        lwt = IERC20(_lwtAddress);
        feeAddress = _feeAddress;
        quizMaster = _quizMaster;
        adminFeeBps = _adminFeeBps;
    }

    event QuizOpened(bytes indexed _quizHash);
    event QuizClosed(bytes indexed _quizHash);
    event QuizCancelled(bytes indexed _quizHash);
    event QuizUpdated(bytes indexed _quizHash);
    event PartipantEvaluated(
        bytes indexed _quizHash,
        address indexed _participant,
        uint256 _score,
        uint256 _won
    );

    error ProtocolInvariantCheckFailed();
    error InvalidChallenge();
    error InvalidState(QuizState _state);
    error ZeroAddress();
    error ZeroNumber();
    error QuizExists();
    error QuizMissing();
    error InvalidPermission(string _msg);

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

    modifier onlyQuizMaster() {
        if (msg.sender != quizMaster) {
            revert InvalidPermission("onlyQuizMaster");
        }
        _;
    }

    modifier existingQuiz(bytes calldata _quizHash) {
        if (quizzes[_quizHash].minStartTime == 0) {
            revert QuizMissing();
        }
        _;
    }

    modifier newQuiz(bytes calldata _quizHash) {
        if (quizzes[_quizHash].minStartTime > 0) {
            revert QuizExists();
        }
        _;
    }

    modifier onlyOperator(bytes calldata _quizHash) {
        if (quizzes[_quizHash].operator != msg.sender) {
            revert InvalidPermission("onlyOperator");
        }
        _;
    }

    modifier quizInState(bytes calldata _quizHash, QuizState _state) {
        if (_quizState(_quizHash) != _state) {
            revert InvalidState(_quizState(_quizHash));
        }
        _;
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

    function _quizState(
        bytes calldata _quizHash
    ) internal view returns (QuizState _state) {
        if (quizzes[_quizHash].state == QuizState.ongoing) {
            if (
                block.timestamp <
                quizzes[_quizHash].startTime + quizzes[_quizHash].duration
            ) {
                return QuizState.ongoing;
            } else {
                return QuizState.timeout;
            }
        } else {
            return quizzes[_quizHash].state;
        }
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
            revert ProtocolInvariantCheckFailed();
        }
    }

    function _withdraw(uint256 _amt) internal {
        uint256 balanceBefore = IERC20(lwt).balanceOf(address(this));
        SafeERC20.safeTransfer(IERC20(lwt), msg.sender, _amt);
        uint256 balanceAfter = IERC20(lwt).balanceOf(address(this));
        if ((balanceBefore - balanceAfter) != _amt) {
            revert ProtocolInvariantCheckFailed();
        }
    }

    function setupQuiz(
        bytes calldata _quizHash,
        uint256 _minStartTime,
        uint256 _duration,
        uint256 _entryFee,
        uint256 _maxScore,
        uint256 _maxParticipants,
        bool _whitelist,
        address _operator
    ) external newQuiz(_quizHash) {}

    function updateQuiz(
        bytes calldata _quizHash,
        uint256 _minStartTime,
        uint256 _duration,
        uint256 _entryFee,
        uint256 _maxScore,
        uint256 _maxParticipants,
        bool _whitelist,
        address _operator
    )
        external
        onlyOperator(_quizHash)
        existingQuiz(_quizHash)
        nonZero(_minStartTime)
        nonZero(_duration)
        nonZero(_entryFee)
        nonZero(_maxScore)
        nonZero(_maxParticipants)
    {}

    function joinQuiz(
        bytes calldata _quizHash
    ) external existingQuiz(_quizHash) {}

    function cancelQuiz(
        bytes calldata _quizHash
    ) external onlyOperator(_quizHash) existingQuiz(_quizHash) {}

    // @dev _evaluation = (address,uint256,uint256)
    function evaluateQuiz(
        bytes calldata _quizHash,
        bytes[] calldata _evaluation
    ) external onlyQuizMaster existingQuiz(_quizHash) {
        for (uint i = 0; i < _evaluation.length; i++) {
            (address player, uint256 score, uint256 won) = abi.decode(
                _evaluation[i],
                (address, uint256, uint256)
            );
            if (participants[_quizHash][player].playing) {
                participants[_quizHash][player] = Participant(true, score, won);
                emit PartipantEvaluated(_quizHash, player, score, won);
            }
        }
    }

    function setWhitelist(
        bytes calldata _quizHash
    ) external onlyOperator(_quizHash) existingQuiz(_quizHash) {}

    function overrideOperator(
        bytes calldata _quizHash
    ) external onlyQuizMaster existingQuiz(_quizHash) {
        quizzes[_quizHash].operator = quizMaster;
    }

    function setFeeAddress(
        address _feeAddress
    ) external onlyOwner nonZeroAddress(_feeAddress) {
        feeAddress = _feeAddress;
    }

    function setQuizMaster(
        address _quizMaster
    ) external onlyOwner nonZeroAddress(_quizMaster) {
        quizMaster = _quizMaster;
    }

    function setAdminFeeBps(
        uint256 _adminFeeBps
    ) external onlyOwner nonZero(_adminFeeBps) {
        adminFeeBps = _adminFeeBps;
    }
}
