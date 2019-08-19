# State Monitor

## Bridge collector agent

This tools allows you to spin up node.js server to monitor for 2 contracts on
Home and Foreign Eth networks to check for balance difference.
On Home network it checks for `HOME_BRIDGE_ADDRESS` balance.
On Foreign network it checks for the `ERC20 token` total supply for the `FOREIGN_BRIDGE_ADDRESS`.

Example of an API

* `GET /` - check contract balances & tx numbers

```json

{
    "home": {
        "balance": "3710077.6896438415780044",
        "deposits": 481,
        "withdrawals": 221
    },
    "foreign": {
        "totalSupply": "3710077.6896438415780044",
        "deposits": 481,
        "withdrawals": 221
    },
    "balanceDiff": 0,
    "lastChecked": 1529511982,
    "depositsDiff": 0,
    "withdrawalDiff": 0
}
```

* `GET /validators` - check validators balances
```json
{
    "home": {
        "validators": {
            "0x35DC13c72A9C09C8AEEBD0490C7228C43Ccc38Cd": {
                "balance": "19.994900374",
                "leftTx": 66649667913333,
                "gasPrice": 1
            },
            "0x5D44BC8642947685F45004c936245B969F9709a6": {
                "balance": "19.993736069",
                "leftTx": 66645786896666,
                "gasPrice": 1
            },
            "0x284877074B986A78F01D7Eb1f34B6043b1719002": {
                "balance": "19.995139875",
                "leftTx": 66650466250000,
                "gasPrice": 1
            }
        },
        "requiredSignatures": 2
    },
    "foreign": {
        "validators": {
            "0x35DC13c72A9C09C8AEEBD0490C7228C43Ccc38Cd": {
                "balance": "19.084023268196",
                "leftTx": 28915,
                "gasPrice": 2.2
            },
            "0x5D44BC8642947685F45004c936245B969F9709a6": {
                "balance": "19.086724777075",
                "leftTx": 28919,
                "gasPrice": 2.2
            },
            "0x284877074B986A78F01D7Eb1f34B6043b1719002": {
                "balance": "19.050074813935",
                "leftTx": 28863,
                "gasPrice": 2.2
            }
        },
        "requiredSignatures": 2
    },
    "requiredSignaturesMatch": true,
    "validatorsMatch": true,
    "lastChecked": 1529512164
}
```

* `GET /eventsStats` - check unprocessed events
```json
{
    "onlyInHomeDeposits": [],
    "onlyInForeignDeposits": [],
    "onlyInHomeWithdrawals": [],
    "onlyInForeignWithdrawals": [],
    "lastChecked": 1529512436
}
```

# How to run
Create .env file (see `.env.example` for parameters reference)
```bash
cp .env.exaple .env
```

```bash
npm i
# check balances of contracts and validators
node checkWorker.js
# check unprocessed events
node checkWorker2.js
# run web interface
node index.js
```

To enabled debug logging, set `DEBUG=1` env variable.

You can create cron job to run workers (see `crontab.example` for reference):
```bash
#crontab -e
*/4 * * * * cd $HOME/state-monitor; node checkWorker.js >>cronWorker.out 2>>cronWorker.err
*/5 * * * * cd $HOME/state-monitor; node checkWorker2.js >>cronWorker2.out 2>>cronWorker2.err
```
