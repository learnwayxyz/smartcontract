# LearnWay Contracts

## Lisktestnet Deployments

|Contract|Url|.env name|deploy cmd|verify cmd|
|--------|---|---------|----------|----------|
|LearnWayToken|[0x8D6Eb13387fef993414378d8304754B93B2B9857](https://sepolia-blockscout.lisk.com/address/0x8D6Eb13387fef993414378d8304754B93B2B9857)|LWT|`npx hardhat ignition deploy ignition/modules/LearnWayToken.ts --network liskTestnet`|`npx hardhat ignition deploy ignition/modules/LearnWayToken.ts --network liskTestnet --verify`|
|LearnWayFaucet|[0x982F51c0f430F3592A5E039F7c76Db16F9FeC970](https://sepolia-blockscout.lisk.com/address/0x982F51c0f430F3592A5E039F7c76Db16F9FeC970)|LWT_FAUCET|`npx hardhat ignition deploy ignition/modules/LearnWayFaucet.ts --network liskTestnet`|`npx hardhat ignition deploy ignition/modules/LearnWayFaucet.ts --network liskTestnet --verify`|
