const dappClient = require("@liquidapps/dapp-client");
const ecc = require("eosjs-ecc");
const eos = require("./eos.js");
const data = require("./data");
const utils = require("./utils.js");

const fetch = require("isomorphic-fetch");
const endpoint = data.eos_endpoint;
const contract = data.contract_account;
let client = null;

(async () => {
  client = await dappClient.createClient({
    network: "kylin",
    httpEndpoint: endpoint,
    fetch
  });
  console.log("dapp client ready...");
  // await createUZSaccount(client, data.uzsrate_contract, data.uzsrate_key);
  // await updateRate();
  // getUZSRate(rate => {
  //   console.log("got rate: ", rate);
  // });
})();

async function createNewAccount(callback) {
  if (!client) {
    console.log("dapp client is not ready");
    callback(false);
  }
  ecc.randomKey().then(async privateKey => {
    const pub_key = ecc.privateToPublic(privateKey);
    const account_name = await findAccountName(pub_key);
    // console.log("Private Key:\t", privateKey);
    // console.log("Public Key:\t", pub_key);
    // console.log("found available eos name: ", account_name);
    createVAccount(client, account_name, privateKey)
      .then(result => {
        console.log("created new account: ", result);
        callback({ account_name, privateKey, trx: result });
      })
      .catch(err => {
        console.log("there was an error creating a new account... ");
        callback(false);
      });
  });
}

async function findAccountName(key) {
  let index = 3;
  let name = normalizeName(key.slice(index, index + 12));
  let found;
  if (["1", "2", "3", "4", "5", "."].includes(name[0]))
    return findAccountName(key.slice(index + 1), 12);
  console.log("try: ", name);
  found = await eos.getAccountInfo(name);
  if (found) return findAccountName(key.slice(index + 1), 12);
  else return name;
}

function normalizeName(name) {
  let nname = name.replace(/6/g, "1");
  nname = nname.replace(/7/g, "2");
  nname = nname.replace(/8/g, "3");
  nname = nname.replace(/9/g, "4");
  nname = nname.replace(/0/g, "5");
  return nname.toLowerCase();
}

// get a row in a table
async function getRow(client, contract, scope, table, key) {
  try {
    const vram_service = await client.service("ipfs", contract);
    const response = await vram_service.get_vram_row(
      contract,
      scope,
      table,
      key
    );
    console.log("result: ", response);
    return response;
  } catch (error) {
    console.log("error: ", error);
    return false;
  }
}

async function getBalance(account_name) {
  console.log("getBalance for ", account_name);
  let balance = await getRow(
    client,
    contract,
    account_name,
    "vaccounts",
    "MEOS"
  );
  console.log("got balance: ", balance);
  if (!balance) return 0;
  return utils.parseAsset(balance.row.balance);
}

async function getUZSRate(callback) {
  console.log("get uzs rate");
  let rate = await getRow(
    client,
    data.uzsrate_contract,
    data.uzsrate_contract,
    "prices",
    "UZS"
  );
  console.log("got rate: ", rate);
  if (!rate) return 0;
  return utils.parseAsset(rate.row.balance);
}

exports.getBalance = getBalance;

// create vAccount
async function createVAccount(client, account_name, private_key) {
  const service = await client.service("vaccounts", account_name);
  return new Promise((resolve, reject) => {
    service
      .push_liquid_account_transaction(contract, private_key, "regaccount", {
        vaccount: account_name
      })
      .then(result => {
        resolve(result);
      })
      .catch(err => {
        console.log("create vaccount error: ", err);
        reject(JSON.parse(err.message));
      });
  });
}

async function createUZSaccount(client, account_name, private_key) {
  console.log("create uzs account");
  const service = await client.service("vaccounts", account_name);
  return new Promise((resolve, reject) => {
    service
      .push_liquid_account_transaction(contract, private_key, "regaccount", {
        vaccount: account_name
      })
      .then(result => {
        resolve(result);
      })
      .catch(err => {
        console.log("create vaccount error: ", err);
        reject(JSON.parse(err.message));
      });
  });
}

// transfer from vAccount to another vAccount
async function vtransfer(from, to, quantity, memo, private_key) {
  const service = await client.service("vaccounts", from);
  return new Promise((resolve, reject) => {
    service
      .push_liquid_account_transaction(contract, private_key, "vtransfer", {
        from: from,
        to: to,
        quantity: quantity + " MEOS",
        memo: memo,
        vaccount: from
      })
      .then(result => {
        resolve(result);
      })
      .catch(err => {
        console.log("vtransfer error: ", err);
        reject(JSON.parse(err.message));
      });
  });
}

// withdraw from vAccount to EOS account
async function withdraw(from, to, quantity, private_key) {
  const service = await client.service("vaccounts", from);
  return new Promise((resolve, reject) => {
    service
      .push_liquid_account_transaction(contract, private_key, "withdraw", {
        from: from,
        to: to,
        quantity: quantity + " MEOS",
        vaccount: from
      })
      .then(result => {
        resolve(result);
      })
      .catch(err => {
        console.log("withdraw error: ", err);
        reject(JSON.parse(err.message));
      });
  });
}

async function updateRate() {
  console.log("updateRate:", data.uzsrate_contract);
  const service = await client.service("vaccounts", data.uzsrate_contract);
  return new Promise((resolve, reject) => {
    service
      .push_liquid_account_transaction(
        data.uzsrate_contract,
        data.uzsrate_key,
        "getrate",
        {
          vaccount: data.uzsrate_contract,
          sym: "UZS",
          uri: Buffer.from("https+json://nbu.uz/exchange-rates/json/", "utf8")
          // "https+json://nbu.uz/exchange-rates/json/"
        }
      )
      .then(result => {
        console.log("done udpating rates");
        resolve(result);
      })
      .catch(err => {
        console.log("getrate error: ", err);
        reject(JSON.parse(err.message));
      });
  });
}

module.exports = {
  createNewAccount,
  getBalance,
  withdraw,
  vtransfer,
  updateRate,
  getUZSRate
};
