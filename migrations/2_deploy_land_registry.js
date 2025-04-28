const PropertyRegistry = artifacts.require("PropertyRegistry");
const PropertyModifiers = artifacts.require("PropertyModifiers");

module.exports = async function (deployer) {
  await deployer.deploy(PropertyRegistry);
  const registry = await PropertyRegistry.deployed();
  console.log("PropertyRegistry deployed at:", registry.address);
};