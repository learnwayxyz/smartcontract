// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition
import "dotenv/config";
import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const LearnWayPOCModule = buildModule("LearnWayPOCModule", (m) => {
  const lwp = m.contract("LearnWayPOC", [process.env.LWT!]);

  return { lwp };
});

export default LearnWayPOCModule;
