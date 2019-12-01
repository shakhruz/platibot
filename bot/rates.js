const data = require("./data.js");
const cc = require("cryptocompare");
const dapp = require("./dapp.js");

cc.setApiKey(data.compareKey);
let _eos_usd = 0;
const updateRatesInterval = 60 * 1000;

function updateRates(callback) {
  cc.priceMulti(["EOS"], ["USD"])
    .then(prices => {
      _eos_usd = prices.EOS.USD;
      callback(_eos_usd);
    })
    .catch(console.error);
}

updateRates(eos_price => {
  console.log("eos price:", eos_price);
});

setInterval(() => {
  updateRates(eos_price => {
    console.log("eos price:", eos_price);
    _eos_usd = eos_price;
  });
}, updateRatesInterval);

function eos_price() {
  return _eos_usd;
}

function uzs_price(callback) {
  // dapp.getUZSRate(rate => {
  //   console.log("got rate: ", rate);
  //   callback(rate);
  // });
  // TODO - get the exchange rate from LiquidOracles from smart contract
  return 9500;
}

// uzs_rate = json;
// for (let i = 0; i < uzs_rate.length; i++) {
//   if (uzs_rate[i].code == "USD") {
//     console.log("USD: ", uzs_rate[i]);
//     sum_usd_rate = uzs_rate[i];
//     break;
//   }
// }

module.exports = {
  updateRates,
  eos_price,
  uzs_price
};
