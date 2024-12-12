// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition
import "dotenv/config";
import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const LearnWayFaucetModule = buildModule("LearnWayFaucetModule", (m) => {
  const lwf = m.contract("LearnWayFaucet", [process.env.LWT!]);

  return { lwf };
});

export default LearnWayFaucetModule;
