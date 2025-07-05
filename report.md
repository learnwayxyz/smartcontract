# Report

# Table of Contents

- [Report](#report)
- [Table of Contents](#table-of-contents)
- [Summary](#summary)
	- [Files Summary](#files-summary)
	- [Files Details](#files-details)
	- [Issue Summary](#issue-summary)
- [Low Issues](#low-issues)
	- [L-1: Centralization Risk for trusted owners](#l-1-centralization-risk-for-trusted-owners)
	- [L-2: Solidity pragma should be specific, not wide](#l-2-solidity-pragma-should-be-specific-not-wide)
	- [L-3: Missing checks for `address(0)` when assigning values to address state variables](#l-3-missing-checks-for-address0-when-assigning-values-to-address-state-variables)
	- [L-4: `public` functions not used internally could be marked `external`](#l-4-public-functions-not-used-internally-could-be-marked-external)
	- [L-5: Define and use `constant` variables instead of using literals](#l-5-define-and-use-constant-variables-instead-of-using-literals)
	- [L-6: Event is missing `indexed` fields](#l-6-event-is-missing-indexed-fields)
	- [L-7: Empty `require()` / `revert()` statements](#l-7-empty-require--revert-statements)
	- [L-8: PUSH0 is not supported by all chains](#l-8-push0-is-not-supported-by-all-chains)
	- [L-9: Modifiers invoked only once can be shoe-horned into the function](#l-9-modifiers-invoked-only-once-can-be-shoe-horned-into-the-function)
	- [L-10: Large literal values multiples of 10000 can be replaced with scientific notation](#l-10-large-literal-values-multiples-of-10000-can-be-replaced-with-scientific-notation)
	- [L-11: Contract still has TODOs](#l-11-contract-still-has-todos)
	- [L-12: State variable could be declared constant](#l-12-state-variable-could-be-declared-constant)
	- [L-13: State variable changes but no event is emitted.](#l-13-state-variable-changes-but-no-event-is-emitted)
	- [L-14: State variable could be declared immutable](#l-14-state-variable-could-be-declared-immutable)


# Summary

## Files Summary

| Key | Value |
| --- | --- |
| .sol Files | 3 |
| Total nSLOC | 326 |


## Files Details

| Filepath | nSLOC |
| --- | --- |
| contracts/LearnWay.sol | 289 |
| contracts/token/LearnWayFaucet.sol | 29 |
| contracts/token/LearnWayToken.sol | 8 |
| **Total** | **326** |


## Issue Summary

| Category | No. of Issues |
| --- | --- |
| High | 0 |
| Low | 14 |


# Low Issues

## L-1: Centralization Risk for trusted owners

Contracts have owners with privileged rights to perform admin tasks and need to be trusted to not perform malicious updates or drain funds.

<details><summary>3 Found Instances</summary>


- Found in contracts/token/LearnWayFaucet.sol [Line: 9](contracts/token/LearnWayFaucet.sol#L9)

	```solidity
	contract LearnWayFaucet is Ownable {
	```

- Found in contracts/token/LearnWayFaucet.sol [Line: 34](contracts/token/LearnWayFaucet.sol#L34)

	```solidity
	    function setDailyClaim(uint256 _amt) external onlyOwner {
	```

- Found in contracts/token/LearnWayFaucet.sol [Line: 38](contracts/token/LearnWayFaucet.sol#L38)

	```solidity
	    function drain() external onlyOwner {
	```

</details>



## L-2: Solidity pragma should be specific, not wide

Consider using a specific version of Solidity in your contracts instead of a wide version. For example, instead of `pragma solidity ^0.8.0;`, use `pragma solidity 0.8.0;`

<details><summary>3 Found Instances</summary>


- Found in contracts/LearnWay.sol [Line: 3](contracts/LearnWay.sol#L3)

	```solidity
	pragma solidity ^0.8.28;
	```

- Found in contracts/token/LearnWayFaucet.sol [Line: 3](contracts/token/LearnWayFaucet.sol#L3)

	```solidity
	pragma solidity ^0.8.28;
	```

- Found in contracts/token/LearnWayToken.sol [Line: 3](contracts/token/LearnWayToken.sol#L3)

	```solidity
	pragma solidity ^0.8.28;
	```

</details>



## L-3: Missing checks for `address(0)` when assigning values to address state variables

Check for `address(0)` when assigning values to address state variables.

<details><summary>2 Found Instances</summary>


- Found in contracts/LearnWay.sol [Line: 59](contracts/LearnWay.sol#L59)

	```solidity
	        lwt = IERC20(_lwtAddress);
	```

- Found in contracts/token/LearnWayFaucet.sol [Line: 18](contracts/token/LearnWayFaucet.sol#L18)

	```solidity
	        lwt = IERC20(_lwtAddress);
	```

</details>



## L-4: `public` functions not used internally could be marked `external`

Instead of marking a function as `public`, consider marking it as `external` if it is not used internally.

<details><summary>1 Found Instances</summary>


- Found in contracts/LearnWay.sol [Line: 54](contracts/LearnWay.sol#L54)

	```solidity
	    function initialize(address _lwtAddress) public initializer {
	```

</details>



## L-5: Define and use `constant` variables instead of using literals

If the same constant literal value is used multiple times, create a constant state variable and reference it throughout the contract.

<details><summary>2 Found Instances</summary>


- Found in contracts/LearnWay.sol [Line: 360](contracts/LearnWay.sol#L360)

	```solidity
	        require((value * bps) >= 10_000);
	```

- Found in contracts/LearnWay.sol [Line: 361](contracts/LearnWay.sol#L361)

	```solidity
	        return Math.mulDiv(value, bps, 10_000);
	```

</details>



## L-6: Event is missing `indexed` fields

Index event fields make the field more quickly accessible to off-chain tools that parse events. However, note that each index field costs extra gas during emission, so it's not necessarily best to index the maximum allowed per event (three fields). Each event should use three indexed fields if there are three or more fields, and gas usage is not particularly of concern for the events in question. If there are fewer than three fields, all of the fields should be indexed.

<details><summary>7 Found Instances</summary>


- Found in contracts/LearnWay.sol [Line: 63](contracts/LearnWay.sol#L63)

	```solidity
	    event QuizOpened(
	```

- Found in contracts/LearnWay.sol [Line: 69](contracts/LearnWay.sol#L69)

	```solidity
	    event QuizStarted(bytes32 quizHash, QuizState state, address starter);
	```

- Found in contracts/LearnWay.sol [Line: 70](contracts/LearnWay.sol#L70)

	```solidity
	    event QuizClosed(
	```

- Found in contracts/LearnWay.sol [Line: 77](contracts/LearnWay.sol#L77)

	```solidity
	    event QuizCancelled(
	```

- Found in contracts/LearnWay.sol [Line: 84](contracts/LearnWay.sol#L84)

	```solidity
	    event PartipantJoined(
	```

- Found in contracts/LearnWay.sol [Line: 89](contracts/LearnWay.sol#L89)

	```solidity
	    event PartipantEvaluated(
	```

- Found in contracts/token/LearnWayFaucet.sol [Line: 23](contracts/token/LearnWayFaucet.sol#L23)

	```solidity
	    event Claimed(address _cliamer, uint256 _amount);
	```

</details>



## L-7: Empty `require()` / `revert()` statements

Use descriptive reason strings or custom errors for revert paths.

<details><summary>1 Found Instances</summary>


- Found in contracts/LearnWay.sol [Line: 360](contracts/LearnWay.sol#L360)

	```solidity
	        require((value * bps) >= 10_000);
	```

</details>



## L-8: PUSH0 is not supported by all chains

Solc compiler version 0.8.20 switches the default target EVM version to Shanghai, which means that the generated bytecode will include PUSH0 opcodes. Be sure to select the appropriate EVM version in case you intend to deploy on a chain other than mainnet like L2 chains that may not support PUSH0, otherwise deployment of your contracts will fail.

<details><summary>3 Found Instances</summary>


- Found in contracts/LearnWay.sol [Line: 3](contracts/LearnWay.sol#L3)

	```solidity
	pragma solidity ^0.8.28;
	```

- Found in contracts/token/LearnWayFaucet.sol [Line: 3](contracts/token/LearnWayFaucet.sol#L3)

	```solidity
	pragma solidity ^0.8.28;
	```

- Found in contracts/token/LearnWayToken.sol [Line: 3](contracts/token/LearnWayToken.sol#L3)

	```solidity
	pragma solidity ^0.8.28;
	```

</details>



## L-9: Modifiers invoked only once can be shoe-horned into the function



<details><summary>3 Found Instances</summary>


- Found in contracts/LearnWay.sol [Line: 110](contracts/LearnWay.sol#L110)

	```solidity
	    modifier nonZero(uint256 num) {
	```

- Found in contracts/LearnWay.sol [Line: 131](contracts/LearnWay.sol#L131)

	```solidity
	    modifier newQuiz(bytes32 _quizHash) {
	```

- Found in contracts/LearnWay.sol [Line: 145](contracts/LearnWay.sol#L145)

	```solidity
	    modifier notParticipant(bytes32 _quizHash, address addr) {
	```

</details>



## L-10: Large literal values multiples of 10000 can be replaced with scientific notation

Use `e` notation, for example: `1e18`, instead of its full numeric value.

<details><summary>3 Found Instances</summary>


- Found in contracts/LearnWay.sol [Line: 360](contracts/LearnWay.sol#L360)

	```solidity
	        require((value * bps) >= 10_000);
	```

- Found in contracts/LearnWay.sol [Line: 361](contracts/LearnWay.sol#L361)

	```solidity
	        return Math.mulDiv(value, bps, 10_000);
	```

- Found in contracts/token/LearnWayToken.sol [Line: 10](contracts/token/LearnWayToken.sol#L10)

	```solidity
	        _mint(_msgSender(), 10_000_000_000 * 1e18);
	```

</details>



## L-11: Contract still has TODOs

Contract contains comments with TODOS

<details><summary>1 Found Instances</summary>


- Found in contracts/LearnWay.sol [Line: 19](contracts/LearnWay.sol#L19)

	```solidity
	contract LearnWay is Initializable {
	```

</details>



## L-12: State variable could be declared constant

State variables that are not updated following deployment should be declared constant to save gas. Add the `constant` attribute to state variables that never change.

<details><summary>1 Found Instances</summary>


- Found in contracts/token/LearnWayFaucet.sol [Line: 12](contracts/token/LearnWayFaucet.sol#L12)

	```solidity
	    uint256 public claimInterval = 365 days;
	```

</details>



## L-13: State variable changes but no event is emitted.

State variable changes in this function but no event is emitted.

<details><summary>2 Found Instances</summary>


- Found in contracts/LearnWay.sol [Line: 54](contracts/LearnWay.sol#L54)

	```solidity
	    function initialize(address _lwtAddress) public initializer {
	```

- Found in contracts/token/LearnWayFaucet.sol [Line: 34](contracts/token/LearnWayFaucet.sol#L34)

	```solidity
	    function setDailyClaim(uint256 _amt) external onlyOwner {
	```

</details>



## L-14: State variable could be declared immutable

State variables that are should be declared immutable to save gas. Add the `immutable` attribute to state variables that are only changed in the constructor

<details><summary>1 Found Instances</summary>


- Found in contracts/token/LearnWayFaucet.sol [Line: 16](contracts/token/LearnWayFaucet.sol#L16)

	```solidity
	    IERC20 public lwt;
	```

</details>



