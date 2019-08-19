require('dotenv').config()
const Influx = require('influx');

const {
  INFLUX_HOST,
  INFLUX_DATABASE,
  INFLUX_USERNAME,
  INFLUX_PASSWORD,
} = process.env

const influx = new Influx.InfluxDB({
  host: INFLUX_HOST,
  database: INFLUX_DATABASE,
  username: INFLUX_USERNAME,
  password: INFLUX_PASSWORD
});

function printError(e) {
  console.error('Error writing data to Influx:' + e);
}

async function createDatabase() {
  const names = await influx.getDatabaseNames();
  if (!names.includes(INFLUX_DATABASE)) {
    try {
      return influx.createDatabase(INFLUX_DATABASE);
    } catch (e) {
      console.error(`Error creating Influx database: ${e}`)
    }
  }
}

module.exports = {
  influx,
  printError,
  database: INFLUX_DATABASE,
  precision: 's',
  createDatabase
}
