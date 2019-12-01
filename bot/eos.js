const { Api, JsonRpc, RpcError } = require("eosjs");
const { JsSignatureProvider } = require("eosjs/dist/eosjs-jssig");
const { TextEncoder, TextDecoder } = require("util");
const fetch = require("node-fetch");
const data = require("./data.js");
const ecc = require("eosjs-ecc");
const endpoint = data.eos_endpoint; // "https://api.kylin.alohaeos.com";
const rpc = new JsonRpc(endpoint, { fetch });

const signatureProvider = new JsSignatureProvider([
  data.token_issuer_private_key
]);
const signatureProvider_uzsrate = new JsSignatureProvider([data.uzsrate_key]);

const api = new Api({
  rpc,
  signatureProvider,
  textDecoder: new TextDecoder(),
  textEncoder: new TextEncoder()
});

const api_uzsrate = new Api({
  rpc,
  signatureProvider_uzsrate,
  textDecoder: new TextDecoder(),
  textEncoder: new TextEncoder()
});

// getUZSRate(result => {
//   console.log("got rate: ", result);
// });

async function getAccountInfo(account_name) {
  try {
    const result = await rpc.get_account(account_name);
    console.log("account: ", account_name, " info: ", result);
    return result;
  } catch (error) {
    return false;
  }
}

async function getUZSRate(callback) {
  const result = await rpc.get_table_rows({
    json: true,
    code: data.uzsrate_contract,
    scope: "UZS",
    table: "uzsprice",
    limit: 10,
    reverse: false,
    show_payer: false
  });
  console.log("uzsrate: ", result);
  callback(result);
}

// save note and hash to blockchain
async function issueTokens(account_name, amount) {
  let actionData = {
    payload: {
      to: account_name,
      quantity: amount + " MEOS",
      memo: ""
    }
  };

  try {
    console.log("issue tokens", actionData);
    const result = await api.transact(
      {
        actions: [
          {
            account: data.contract_account,
            name: "issue",
            authorization: [
              {
                actor: data.token_issuer,
                permission: "active"
              }
            ],
            data: actionData
          }
        ]
      },
      {
        blocksBehind: 3,
        expireSeconds: 30
      }
    );

    console.log(result);
    return result.transaction_id;
  } catch (e) {
    console.log("Caught exception: ", e);
    if (e instanceof RpcError) {
      console.log(JSON.stringify(e.json, null, 2));
    }
    return false;
  }
}

// update UZS exchange rate
async function updateRate() {
  let actionData = {
    url: "https://nbu.uz/exchange-rates/json/" // Buffer.from("https://nbu.uz/exchange-rates/json/", "utf8")
  };

  try {
    console.log("update rate: ", actionData);
    const result = await api_uzsrate.transact(
      {
        actions: [
          {
            account: data.uzsrate_contract,
            name: "getrate",
            authorization: [
              {
                actor: data.uzsrate_contract,
                permission: "active"
              }
            ],
            data: actionData
          }
        ]
      },
      {
        blocksBehind: 3,
        expireSeconds: 30
      }
    );

    console.log(result);
    return result.transaction_id;
  } catch (e) {
    console.log("Caught exception: ", e);
    if (e instanceof RpcError) {
      console.log(JSON.stringify(e.json, null, 2));
    }
    return false;
  }
}

module.exports = {
  getAccountInfo,
  issueTokens,
  updateRate,
  getUZSRate
};
