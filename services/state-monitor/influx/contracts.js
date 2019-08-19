const {
  influx,
  database,
  precision,
  printError
} = require('./connection');

module.exports = {
  writeContracts: function (data) {
    influx.writePoints(
      [
        {
          measurement: 'contracts',
          fields: {
            home_total_supply: data.home.totalSupply,
            home_deposits: data.home.deposits,
            home_withdrawals: data.home.withdrawals,
            foreign_erc20_balance: data.foreign.erc20Balance,
            foreign_deposits: data.foreign.deposits,
            foreign_withdrawals: data.foreign.withdrawals
          }
        }
      ],
      { database, precision }
    ).catch(e => { printError(e) });
  }
}