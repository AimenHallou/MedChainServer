// migrations/1_initial_migration.js
const fs = require('fs');
const PatientRegistry = artifacts.require("PatientRegistry");

module.exports = async function (deployer) {
  await deployer.deploy(PatientRegistry);
  const deployedContract = await PatientRegistry.deployed();
  
  const addresses = {
    PatientRegistry: deployedContract.address
  };

  fs.writeFileSync('./src/blockchain/contractAddresses.json', JSON.stringify(addresses, null, 2), 'utf-8');
};