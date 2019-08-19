const {
  influx,
  database,
  precision,
  printError
} = require('./connection');

module.exports = {
  writeStatus: function (data) {
    influx.writePoints(
      [
        {
          measurement: 'contracts_status',
          fields: {
            balance_diff: data.balanceDiff,
            deposits_diff: data.depositsDiff,
            withdrawal_diff: data.withdrawalDiff,
            validators_required_signatures_match: data.requiredSignaturesMatch,
            validators_match: data.validatorsMatch
          }
        }
      ],
      { database, precision }
    ).catch(e => { printError(e) });
  }
}