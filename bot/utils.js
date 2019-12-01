const db = require("./db.js");
const dapp = require("./dapp.js");

function parseAsset(asset) {
  const arr = asset.split(" ");
  let balance = 0;
  if (arr && arr[0]) balance = parseInt(arr[0].trim());
  return balance;
}

async function getBalance(user_id, callback) {
  db.getUser(user_id, async user => {
    const balance = await dapp.getBalance(user.account_name);
    callback(balance);
  });
}

// Возвращает форматированное кол-во токенов
function formatAmount(amount, coin) {
  if (!amount) return 0;
  switch (coin) {
    case "BIP":
      amount = Number(Math.trunc(amount * 10000) / 10000);
      break;
    case "BTC":
      amount = Number(amount.toFixed(8));
      break;
    case "USDT":
      amount = Number(amount.toFixed(4));
      break;
    case "USD":
      amount = Number(amount.toFixed(2));
      break;
    case "ETH":
      amount = Number(amount.toFixed(6));
      break;
    default:
      amount = Number(amount.toFixed(2));
  }
  return amount;
}

const timeout = ms => new Promise(res => setTimeout(res, ms));

module.exports = {
  formatAmount,
  parseAsset,
  getBalance,
  timeout
};
