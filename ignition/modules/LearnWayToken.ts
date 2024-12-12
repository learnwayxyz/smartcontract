// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const LearnWayTokenModule = buildModule("LearnWayTokenModule", (m) => {
  const lwt = m.contract("LearnWayToken");

  return { lwt };
});

export default LearnWayTokenModule;
