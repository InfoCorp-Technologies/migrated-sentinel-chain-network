const {
  influx,
  database,
  precision,
  printError
} = require('./connection');

function writeRequiredSignatures(chain, rs) {
  influx.writePoints(
    [
      {
        measurement: 'validators_required_signatures',
        fields: { requiredSignatures: rs },
        tags: { chain: chain }
      }
    ],
    { database, precision }
  ).catch(e => { printError(e) });
}

module.exports = {
  writeValidator: function (data) {
    influx.writePoints(
      [
        {
          measurement: 'validators',
          fields: {
            balance: data.balance,
            leftTx: data.leftTx
          },
          tags: {
            address: data.address,
            chain: data.chain
          }
        }
      ],
      { database, precision }
    ).catch(e => { printError(e) });
  },
  writeHomeReqSig: function (requiredSignatures) {
    writeRequiredSignatures('home', requiredSignatures);
  },
  writeForeignReqSig: function (requiredSignatures) {
    writeRequiredSignatures('foreign', requiredSignatures);
  },
}