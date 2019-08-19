const fs = require('fs')
const path = require('path')
const Web3 = require('web3')
const logger = require('./logger')('checkWorker')
const { decodeBridgeMode } = require('./utils/bridgeMode')
const getBalances = require('./getBalances')
const getShortEventStats = require('./getShortEventStats')
const validators = require('./validators')
const { createDatabase } = require('./influx/connection');
const validatorsInflux = require('./influx/validators');
const contractsInflux = require('./influx/contracts');
const contractsStatusInflux = require('./influx/contracts_status');
const { HOME_BRIDGE_ADDRESS, HOME_RPC_URL, INFLUX_ENABLE } = process.env
const homeProvider = new Web3.providers.HttpProvider(HOME_RPC_URL)
const web3Home = new Web3(homeProvider)

const HOME_ERC_TO_ERC_ABI = require('./abis/HomeBridgeErcToErc.abi')

async function checkWorker() {
  try {
    const homeBridge = new web3Home.eth.Contract(HOME_ERC_TO_ERC_ABI, HOME_BRIDGE_ADDRESS)
    const bridgeModeHash = await homeBridge.methods.getBridgeMode().call()
    const bridgeMode = decodeBridgeMode(bridgeModeHash)
    logger.debug('Bridge mode:', bridgeMode)
    logger.debug('calling getBalances()')
    const balances = await getBalances(bridgeMode)
    logger.debug('calling getShortEventStats()')
    const events = await getShortEventStats(bridgeMode)
    const home = Object.assign({}, balances.home, events.home)
    const foreign = Object.assign({}, balances.foreign, events.foreign)
    const status = Object.assign({}, balances, events, { home }, { foreign })
    if (!status) throw new Error('status is empty: ' + JSON.stringify(status))
    fs.writeFileSync(
      path.join(__dirname, '/responses/getBalances.json'),
      JSON.stringify(status, null, 4)
    )

    logger.debug('calling validators()')
    const vBalances = await validators(bridgeMode)
    if (!vBalances) throw new Error('vBalances is empty: ' + JSON.stringify(vBalances))
    fs.writeFileSync(
      path.join(__dirname, '/responses/validators.json'),
      JSON.stringify(vBalances, null, 4)
    )

    if (INFLUX_ENABLE == 'true') {
      logger.debug('Save data to Influxdb')
      await createDatabase();
      const chains = ['home', 'foreign'];
      // Validators
      chains.forEach(function (chain) {
        let val = vBalances[chain]['validators'];
        for (let key in val) {
          validatorsInflux.writeValidator({
            address: key,
            chain,
            ...val[key]
          });
        }
      });
      validatorsInflux.writeHomeReqSig(vBalances['home']['requiredSignatures']);
      validatorsInflux.writeForeignReqSig(vBalances['foreign']['requiredSignatures']);

      // Contracts
      contractsInflux.writeContracts({
        home: status['home'],
        foreign: status['foreign'],
      });

      // Contracts status
      contractsStatusInflux.writeStatus({
        balanceDiff: balances.balanceDiff,
        depositsDiff: events.depositsDiff,
        withdrawalDiff: events.withdrawalDiff,
        requiredSignaturesMatch: vBalances.requiredSignaturesMatch,
        validatorsMatch: vBalances.validatorsMatch
      })
    }

    logger.debug('Done')
    return status
  } catch (e) {
    logger.error(e)
    throw e
  }
}
checkWorker()
