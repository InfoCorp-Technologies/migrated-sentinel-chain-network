const fs = require('fs');

const deploy = require('./src/home');
const deployForeign = require('./src/foreign');

async function main() {
  const homeBridge = await deployHome()
  const {foreignBridge, sencToken} = await deployForeign();
  console.log("\nDeployment has been completed.\n\n")
  console.log(`[   Home  ] HomeBridge: ${homeBridge.address} at block ${homeBridge.deployedBlockNumber}`)
  console.log(`[ Foreign ] ForeignBridge: ${foreignBridge.address} at block ${foreignBridge.deployedBlockNumber}`)
  console.log(`[ Foreign ] SENC: ${sencToken.address}`)
  fs.writeFileSync('./bridgeDeploymentResults.json', JSON.stringify({
    homeBridge: {
      ...homeBridge,
    },
    foreignBridge: {
      ...foreignBridge,
    },sencToken
  },null,4));
  console.log('Contracts Deployment have been saved to `bridgeDeploymentResults.json`')
}
main()