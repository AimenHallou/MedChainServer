// src/blockchain/blockchainService.ts
import Web3 from "web3";

import fs from "fs";
const contractJson = JSON.parse(
  fs.readFileSync("./build/contracts/PatientRegistry.json", "utf8")
);
// import PatientRegistryContract from "../../build/contracts/PatientRegistry.json";

const web3 = new Web3("HTTP://127.0.0.1:8545");
const contractAddress = "0x70b728B4F120dFe55BFd7af179d2e330F5490f95";
const contractABI = contractJson.abi;
const patientRegistry = new web3.eth.Contract(contractABI, contractAddress);

export const createPatientOnBlockchain = async (
  patientData: any,
  userAddress: string
) => {
  console.log(
    "Attempting to create patient on blockchain with data:",
    patientData
  );

  try {
    console.log("User address:", userAddress);
    const accounts = await web3.eth.getAccounts();
    console.log("Accounts fetched:", accounts);

    // Check if the user address is in the accounts array
    const accountMatch = accounts
      .map((acc) => acc.toLowerCase())
      .includes(userAddress.toLowerCase());
    if (!accountMatch) {
      console.error("User address not found in available accounts");
      return null;
    }

    const historyEntry = "Patient record created";
    const txHash = "";

    console.log(`Sending transaction from account: ${userAddress}`);
    const result = await patientRegistry.methods
    .createPatient(patientData.patient_id, historyEntry, txHash)
    .send({
      from: userAddress,
      gas: "3000000",
      gasPrice: "20000000000",
    });

    return result;
  } catch (error) {
    console.error("Error creating patient on blockchain:", error);
    throw error;
  }
};

export const getPatientHistoryFromBlockchain = async (patientId: string) => {
  const history = await patientRegistry.methods
    .getPatientHistory(patientId)
    .call();
  return history;
};