const assert = require('assert')
const Web3Utils = require('web3-utils')
const env = require('../loadEnv')

const { deployContract, privateKeyToAddress, sendRawTxHome } = require('../deploymentUtils')
const { web3Home, deploymentPrivateKey, HOME_RPC_URL } = require('../web3')

const EternalStorageProxy = require('../../../../build/contracts/EternalStorageProxy.json')
const BridgeValidators = require('../../../../build/contracts/BridgeValidators.json')
const HomeBridge = require('../../../../build/contracts/HomeBridgeErcToErc.json')
const SeniToken = require('../../../../build/contracts/SeniToken.json')
const TollBox = require('../../../../build/contracts/TollBox.json')

const VALIDATORS = env.VALIDATORS.split(' ')

const {
  DEPLOYMENT_ACCOUNT_PRIVATE_KEY,
  REQUIRED_NUMBER_OF_VALIDATORS,
  HOME_BRIDGE_OWNER,
  HOME_VALIDATORS_OWNER,
  HOME_UPGRADEABLE_ADMIN,
  HOME_DAILY_LIMIT,
  HOME_MAX_AMOUNT_PER_TX,
  HOME_MIN_AMOUNT_PER_TX,
  HOME_REQUIRED_BLOCK_CONFIRMATIONS,
  HOME_GAS_PRICE,
  FOREIGN_DAILY_LIMIT,
  FOREIGN_MAX_AMOUNT_PER_TX,
  HOME_WHITELIST_ADDRESS,
  HOME_TOLL_BOX_OWNER,
  HOME_TOLL_BOX_RATE,
  HOME_TOLL_FEE
} = env

const DEPLOYMENT_ACCOUNT_ADDRESS = privateKeyToAddress(DEPLOYMENT_ACCOUNT_PRIVATE_KEY)

async function deployHome() {
  let homeNonce = await web3Home.eth.getTransactionCount(DEPLOYMENT_ACCOUNT_ADDRESS)
  console.log('deploying storage for home validators')
  const storageValidatorsHome = await deployContract(EternalStorageProxy, [], {
    from: DEPLOYMENT_ACCOUNT_ADDRESS,
    nonce: homeNonce
  })
  console.log('[Home] BridgeValidators Storage: ', storageValidatorsHome.options.address)
  homeNonce++

  console.log('\ndeploying implementation for home validators')
  const bridgeValidatorsHome = await deployContract(BridgeValidators, [], {
    from: DEPLOYMENT_ACCOUNT_ADDRESS,
    nonce: homeNonce
  })
  console.log('[Home] BridgeValidators Implementation: ', bridgeValidatorsHome.options.address)
  homeNonce++

  console.log('\nhooking up eternal storage to BridgeValidators')
  const upgradeToBridgeVHomeData = await storageValidatorsHome.methods
    .upgradeTo('1', bridgeValidatorsHome.options.address)
    .encodeABI({ from: DEPLOYMENT_ACCOUNT_ADDRESS })
  const txUpgradeToBridgeVHome = await sendRawTxHome({
    data: upgradeToBridgeVHomeData,
    nonce: homeNonce,
    to: storageValidatorsHome.options.address,
    privateKey: deploymentPrivateKey,
    url: HOME_RPC_URL
  })
  assert.strictEqual(Web3Utils.hexToNumber(txUpgradeToBridgeVHome.status), 1, 'Transaction Failed')
  homeNonce++

  console.log('\ninitializing Home Bridge Validators with following parameters:\n')
  console.log(
    `REQUIRED_NUMBER_OF_VALIDATORS: ${REQUIRED_NUMBER_OF_VALIDATORS}, VALIDATORS: ${VALIDATORS}`
  )
  bridgeValidatorsHome.options.address = storageValidatorsHome.options.address
  const initializeData = await bridgeValidatorsHome.methods
    .initialize(REQUIRED_NUMBER_OF_VALIDATORS, VALIDATORS, HOME_VALIDATORS_OWNER)
    .encodeABI({ from: DEPLOYMENT_ACCOUNT_ADDRESS })
  const txInitialize = await sendRawTxHome({
    data: initializeData,
    nonce: homeNonce,
    to: bridgeValidatorsHome.options.address,
    privateKey: deploymentPrivateKey,
    url: HOME_RPC_URL
  })
  assert.strictEqual(Web3Utils.hexToNumber(txInitialize.status), 1, 'Transaction Failed')
  homeNonce++

  console.log('transferring proxy ownership to multisig for Validators Proxy contract')
  const proxyDataTransfer = await storageValidatorsHome.methods
    .transferProxyOwnership(HOME_UPGRADEABLE_ADMIN)
    .encodeABI()
  const txProxyDataTransfer = await sendRawTxHome({
    data: proxyDataTransfer,
    nonce: homeNonce,
    to: storageValidatorsHome.options.address,
    privateKey: deploymentPrivateKey,
    url: HOME_RPC_URL
  })
  assert.strictEqual(Web3Utils.hexToNumber(txProxyDataTransfer.status), 1, 'Transaction Failed')
  homeNonce++

  console.log('\ndeploying homeBridge storage\n')
  const homeBridgeStorage = await deployContract(EternalStorageProxy, [], {
    from: DEPLOYMENT_ACCOUNT_ADDRESS,
    nonce: homeNonce
  })
  homeNonce++
  console.log('[Home] HomeBridge Storage: ', homeBridgeStorage.options.address)

  console.log('\ndeploying homeBridge implementation\n')
  const homeBridgeImplementation = await deployContract(HomeBridge, [], {
    from: DEPLOYMENT_ACCOUNT_ADDRESS,
    nonce: homeNonce
  })
  homeNonce++
  console.log('[Home] HomeBridge Implementation: ', homeBridgeImplementation.options.address)

  console.log('\nhooking up HomeBridge storage to HomeBridge implementation')
  const upgradeToHomeBridgeData = await homeBridgeStorage.methods
    .upgradeTo('1', homeBridgeImplementation.options.address)
    .encodeABI({ from: DEPLOYMENT_ACCOUNT_ADDRESS })
  const txUpgradeToHomeBridge = await sendRawTxHome({
    data: upgradeToHomeBridgeData,
    nonce: homeNonce,
    to: homeBridgeStorage.options.address,
    privateKey: deploymentPrivateKey,
    url: HOME_RPC_URL
  })
  assert.strictEqual(Web3Utils.hexToNumber(txUpgradeToHomeBridge.status), 1, 'Transaction Failed')
  homeNonce++

  console.log('\n[Home] deploying Bridgeble token')
  const erc677token = await deployContract(
    SeniToken,
    [HOME_WHITELIST_ADDRESS],
    { from: DEPLOYMENT_ACCOUNT_ADDRESS, network: 'home', nonce: homeNonce }
  )
  homeNonce++
  console.log('[Home] Bridgeble Token: ', erc677token.options.address)

  console.log('\nset bridge contract on SeniToken')
  const setBridgeContractData = await erc677token.methods
    .setBridgeContract(homeBridgeStorage.options.address)
    .encodeABI({ from: DEPLOYMENT_ACCOUNT_ADDRESS })
  const setBridgeContract = await sendRawTxHome({
    data: setBridgeContractData,
    nonce: homeNonce,
    to: erc677token.options.address,
    privateKey: deploymentPrivateKey,
    url: HOME_RPC_URL
  })
  assert.strictEqual(Web3Utils.hexToNumber(setBridgeContract.status), 1, 'Transaction Failed')
  homeNonce++

  console.log('transferring ownership of Bridgeble token to homeBridge contract')
  const txOwnershipData = await erc677token.methods
    .transferOwnership(homeBridgeStorage.options.address)
    .encodeABI({ from: DEPLOYMENT_ACCOUNT_ADDRESS })
  const txOwnership = await sendRawTxHome({
    data: txOwnershipData,
    nonce: homeNonce,
    to: erc677token.options.address,
    privateKey: deploymentPrivateKey,
    url: HOME_RPC_URL
  })
  assert.strictEqual(Web3Utils.hexToNumber(txOwnership.status), 1, 'Transaction Failed')
  homeNonce++

  console.log('\n[Home] deploying TollBox contract')
  const tollBoxContract = await deployContract(
    TollBox,
    [HOME_TOLL_BOX_RATE, erc677token.options.address, homeBridgeStorage.options.address],
    { from: DEPLOYMENT_ACCOUNT_ADDRESS, network: 'home', nonce: homeNonce }
  )
  homeNonce++

  console.log('\ntransferring tollbox ownership to toll owner')
  const tollDataTransfer = await tollBoxContract.methods
  .transferOwnership(HOME_TOLL_BOX_OWNER)
  .encodeABI()
  const txTollDataTransfer = await sendRawTxHome({
    data: tollDataTransfer,
    nonce: homeNonce,
    to: tollBoxContract.options.address,
    privateKey: deploymentPrivateKey,
    url: HOME_RPC_URL
  })
  assert.strictEqual(Web3Utils.hexToNumber(txTollDataTransfer.status), 1, 'Transaction Failed')
  console.log('[Home] TollBox contract: ', tollBoxContract.options.address)
  homeNonce++

  console.log('\ninitializing Home Bridge with following parameters:\n')
  console.log(`Home Validators: ${storageValidatorsHome.options.address},
  HOME_DAILY_LIMIT : ${HOME_DAILY_LIMIT} which is ${Web3Utils.fromWei(HOME_DAILY_LIMIT)} in eth,
  HOME_MAX_AMOUNT_PER_TX: ${HOME_MAX_AMOUNT_PER_TX} which is ${Web3Utils.fromWei(
    HOME_MAX_AMOUNT_PER_TX
  )} in eth,
  HOME_MIN_AMOUNT_PER_TX: ${HOME_MIN_AMOUNT_PER_TX} which is ${Web3Utils.fromWei(
    HOME_MIN_AMOUNT_PER_TX
  )} in eth,
  HOME_GAS_PRICE: ${HOME_GAS_PRICE}, HOME_REQUIRED_BLOCK_CONFIRMATIONS : ${HOME_REQUIRED_BLOCK_CONFIRMATIONS}
  `)
  homeBridgeImplementation.options.address = homeBridgeStorage.options.address
  const initializeHomeBridgeData = await homeBridgeImplementation.methods
    .initialize(
      storageValidatorsHome.options.address,
      HOME_WHITELIST_ADDRESS,
      tollBoxContract.options.address,
      HOME_TOLL_FEE,
      HOME_DAILY_LIMIT,
      HOME_MAX_AMOUNT_PER_TX,
      HOME_MIN_AMOUNT_PER_TX,
      HOME_GAS_PRICE,
      HOME_REQUIRED_BLOCK_CONFIRMATIONS,
      erc677token.options.address,
      FOREIGN_DAILY_LIMIT,
      FOREIGN_MAX_AMOUNT_PER_TX,
      HOME_BRIDGE_OWNER
    )
    .encodeABI({ from: DEPLOYMENT_ACCOUNT_ADDRESS })
  const txInitializeHomeBridge = await sendRawTxHome({
    data: initializeHomeBridgeData,
    nonce: homeNonce,
    to: homeBridgeStorage.options.address,
    privateKey: deploymentPrivateKey,
    url: HOME_RPC_URL
  })
  assert.strictEqual(Web3Utils.hexToNumber(txInitializeHomeBridge.status), 1, 'Transaction Failed')
  homeNonce++

  console.log('transferring proxy ownership to multisig for Home bridge Proxy contract')
  const homeBridgeProxyData = await homeBridgeStorage.methods
    .transferProxyOwnership(HOME_UPGRADEABLE_ADMIN)
    .encodeABI()
  const txhomeBridgeProxyData = await sendRawTxHome({
    data: homeBridgeProxyData,
    nonce: homeNonce,
    to: homeBridgeStorage.options.address,
    privateKey: deploymentPrivateKey,
    url: HOME_RPC_URL
  })
  assert.strictEqual(Web3Utils.hexToNumber(txhomeBridgeProxyData.status), 1, 'Transaction Failed')
  homeNonce++

  console.log('\nHome Deployment Bridge completed\n')
  return {
    homeBridge: {
      address: homeBridgeStorage.options.address,
      deployedBlockNumber: Web3Utils.hexToNumber(homeBridgeStorage.deployedBlockNumber)
    },
    tollBox: { address: tollBoxContract.options.address },
    erc677: { address: erc677token.options.address }
  }
}
module.exports = deployHome