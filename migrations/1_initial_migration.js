const PatientRegistry = artifacts.require("PatientRegistry");

module.exports = function (deployer) {
  deployer.deploy(PatientRegistry);
};
