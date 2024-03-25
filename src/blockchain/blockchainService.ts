// src/blockchain/blockchainService.ts
import Web3 from "web3";
import fs from "fs";

// Load the contract ABI and address
const contractJson = JSON.parse(
  fs.readFileSync("./build/contracts/PatientRegistry.json", "utf8")
);
const contractAddresses = JSON.parse(
  fs.readFileSync("./src/blockchain/contractAddresses.json", "utf8")
);

const web3 = new Web3("HTTP://127.0.0.1:8545");
const contractABI = contractJson.abi;
const patientRegistry = new web3.eth.Contract(
  contractABI,
  contractAddresses.PatientRegistry
);

interface PatientBlockchainAddress {
  owner: string;
  patient_id: string;
  createdDate: number;
}

interface PatientBlockchainHistory {
  historyEntries: string[];
  txHashes: string[];
}

export const createPatientOnBlockchain = async (
  patientData: any,
  userAddress: string
) => {
  try {
    console.log("Creating patient on blockchain:", patientData);

    // Initial transaction to create patient with a placeholder txHash
    const initialTx = await patientRegistry.methods
      .createPatient(
        patientData.patient_id,
        "Patient record created",
        "placeholder_txHash"
      )
      .send({ from: userAddress, gas: "3000000", gasPrice: "20000000000" });

    console.log(
      "Patient created on blockchain. Initial transaction hash:",
      initialTx.transactionHash
    );

    // Update the transaction hash with the initial transaction hash
    const updateTx = await patientRegistry.methods
      .updateTxHash(patientData.patient_id, initialTx.transactionHash)
      .send({ from: userAddress, gas: "3000000", gasPrice: "20000000000" });

    console.log(
      "Transaction hash updated. Update transaction hash:",
      updateTx.transactionHash
    );

    return {
      initialTxHash: initialTx.transactionHash,
      updateTxHash: updateTx.transactionHash,
    };
  } catch (error) {
    console.error("Error interacting with blockchain:", error);
    throw new Error("Failed to interact with blockchain.");
  }
};

export const getPatientHistoryFromBlockchain = async (
  patientId: string
): Promise<PatientBlockchainHistory> => {
  try {
    const response = await patientRegistry.methods
      .getPatientHistory(patientId)
      .call();

    // Type assertion here
    const historyEntries: string[] = (response as any).history;
    const txHashes: string[] = (response as any).txHashes;

    console.log(`Patient history for ${patientId}:`, historyEntries, txHashes);

    return { historyEntries, txHashes };
  } catch (error) {
    console.error("Error retrieving patient history from blockchain:", error);
    throw new Error("Failed to retrieve patient history from blockchain.");
  }
};

export const getPatientAddressFromBlockchain = async (
  patientId: string
): Promise<PatientBlockchainAddress> => {
  try {
    const patientData = await patientRegistry.methods
      .patients(patientId)
      .call();

    // Type assertion here
    const owner: string = (patientData as any).owner;
    const patient_id: string = (patientData as any).patient_id;
    const createdDate: number = parseInt((patientData as any).createdDate);

    console.log("Patient data from blockchain:", patientData);

    return { owner, patient_id, createdDate };
  } catch (error) {
    console.error("Error getting patient address from blockchain:", error);
    throw new Error("Failed to get patient address from blockchain.");
  }
};
