const Markup = require("telegraf/markup");
const lang = "ru";

// const main_menu = function() {
//   return Markup.keyboard([
//     [menu_item("add_question", lang)],
//     [menu_item("balance", lang), menu_item("transfer", lang)],
//     [
//       menu_item("deposit", lang),
//       menu_item("deposit_uzs", lang),
//       menu_item("withdraw", lang)
//     ],
//     [menu_item("help", lang)]
//   ])
//     .oneTime()
//     .resize()
//     .extra();
// };

const main_menu = function() {
  return Markup.keyboard([
    // [menu_item("add_question", lang)],
    [menu_item("balance", lang), menu_item("transfer", lang)],
    [
      menu_item("deposit", lang),
      // menu_item("deposit_uzs", lang),
      menu_item("withdraw", lang)
    ],
    [menu_item("help", lang)]
  ])
    .oneTime()
    .resize()
    .extra();
};

const user_menu = function() {
  return Markup.keyboard([menu_item("help", lang)])
    .oneTime()
    .resize()
    .extra();
};

const back_menu = function() {
  return Markup.keyboard([menu_item("back", lang)])
    .oneTime()
    .resize()
    .extra();
};

const back_skip_menu = function() {
  return Markup.keyboard([menu_item("back", lang), menu_item("skip", lang)])
    .oneTime()
    .resize()
    .extra();
};

function menu_item(name, lang = "ru") {
  return menu_items[name][lang];
}

function text(name, lang = "ru") {
  return menu_items[name][lang];
}

const menu_items = {
  add_question: {
    ru: "❓ Создать Вопрос",
    en: "❓ Create Paid Trivia Question"
  },
  transfer: { ru: "📨 Перевести mEOS", en: "📨 Transfer mEOS" },
  deposit_uzs: { ru: "📥 Пополнить UZS", en: "📥 Deposit UZS" },
  withdraw: { ru: "📤 Забрать EOS", en: "📤 Withdraw EOS" },
  deposit: { ru: "📥 Загрузить EOS", en: "📥 Deposit EOS" },
  balance: { ru: "💵 Баланс", en: "💵 Show Balance" },
  help: { ru: "🆘 Помощь", en: "🆘 Help" },
  back: { ru: "⬅️ НАЗАД", en: "⬅️ Back" },
  try_again: { ru: "ОК", en: "OK" },
  main_menu_title: {
    ru: "📕 Что будем делать дальше?",
    en: "📕 What would you like to do next?"
  },
  check_link: {
    ru: "☑️ Ответить",
    en: "☑️ Reply"
  },
  you_got_bonus: {
    ru: "Поздравляем! Мы только что начислили Вам бонус",
    en: "You got a bonus!"
  },
  welcome: { ru: 'Добро пожаловать в "Плати Лети", ', en: "Welcome, " },
  welcome_back: { ru: "С возвращением, ", en: "Welcome back, " },
  help_info: {
    ru: "Плати Лети - сервис оплаты между людьми",
    en: "Pay and Go - payment service for people"
  },
  your_balance: { ru: "ВАШ БАЛАНС:", en: "YOU HAVE:" }
};

const stickers = {
  welcome: "CAADAgADZgADVSx4C4I00LsibnWGFgQ",
  problem: "CAADAgADPgADVSx4C0RnK8OCcgwkFgQ",
  start: "CAADAgADUAADVSx4C4RAPsaJNQ4GFgQ",
  happy: "CAADAgADXAADVSx4C01PSHLmRFaqFgQ"
};

module.exports = {
  menu_item,
  main_menu,
  back_menu,
  back_skip_menu,
  stickers,
  user_menu,
  text
};
