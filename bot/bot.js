const Telegraf = require("telegraf");
const session = require("telegraf/session");
const extra = require("telegraf/extra");
const markup = extra.markdown();
const Markup = require("telegraf/markup");
const Stage = require("telegraf/stage");
const { enter, leave } = Stage;

const data = require("./data");

const BOT_TOKEN =
  data.mode === "PRODUCTION" ? data.BOT_TOKEN || "" : data.BOT_DEV_TOKEN;
console.log("starting in " + data.mode + " mode...");

const bot = new Telegraf(BOT_TOKEN);
const db = require("./db.js");
const dapp = require("./dapp.js");
const utils = require("./utils.js");
const helpers = require("./helpers.js");
const eos = require("./eos.js");
const commands = require("./commands.js");

bot.telegram.setWebhook("");
bot.launch();
bot.use(session());

// Визарды
const transfer_wizard = require("./wizards/transfer.js");
const withdraw_wizard = require("./wizards/withdraw.js");
const add_question_wizard = require("./wizards/add_question.js");
const answer_question_wizard = require("./wizards/answer_question.js");
const deposit_uzs_wizard = require("./wizards/deposit_uzs.js");

const stage = new Stage(
  [
    transfer_wizard.transfer,
    withdraw_wizard.withdraw,
    add_question_wizard.add_question,
    answer_question_wizard.answer_question,
    deposit_uzs_wizard.deposit_uzs
  ],
  { ttl: 300 }
);
bot.use(stage.middleware());

// start with params - get to a question
bot.hears(/^\/start (.+)/, async ctx => {
  try {
    let opts = ctx.match[1];
    if (opts) {
      console.log("starting with options: ", opts);
      await commands.welcomeUser(ctx, true);
      ctx.session.question_id = opts;
      ctx.scene.enter("answer_question");
    }
  } catch (err) {
    commands.sendError(ctx, err);
  }
});

bot.start(async ctx => {
  console.log("starting the bot...");
  if (ctx.from.is_bot) {
    console.log("another bot is trying to access me, quitting....");
    return;
  }
  await ctx.replyWithSticker(helpers.stickers["welcome"]);
  await commands.welcomeUser(ctx);
});

bot.command("help", ctx => {
  commands.help(ctx);
});
bot.command("balance", ctx => {
  commands.showBalance(ctx);
});
bot.command("withdraw", ctx => {
  commands.withdraw_command(ctx);
});
bot.command("send", ctx => {
  ctx.scene.enter("transfer");
});
bot.command("transfer", ctx => {
  ctx.scene.enter("transfer");
});

bot.hears(helpers.menu_item("balance"), ctx => {
  commands.balance_command(ctx);
});
bot.hears(helpers.menu_item("help"), async ctx => {
  const eos = require("./eos.js");
  // (async () => {
  //   const result = await dapp.updateRate();
  //   console.log("result: ", result);
  // })();

  // commands.help(ctx);
});
bot.hears(helpers.menu_item("deposit"), async ctx => {
  commands.deposit_command(ctx);
});
bot.hears(helpers.menu_item("transfer"), enter("transfer"));
bot.hears(helpers.menu_item("withdraw"), enter("withdraw"));
bot.hears(helpers.menu_item("add_question"), enter("add_question"));
bot.hears(helpers.menu_item("deposit_uzs"), enter("deposit_uzs"));

function isAdmin(username) {
  return data.editors.indexOf(username) >= 0;
}

// approve payment request from paycom
bot.on("pre_checkout_query", ctx => {
  console.log("preCheckoutQuery: ", ctx.update);
  console.log("precheckout from:", ctx.update.pre_checkout_query.from);
  const currency = ctx.update.pre_checkout_query.currency;
  const checkout_id = ctx.update.pre_checkout_query.id;
  const checkout_amount = ctx.update.pre_checkout_query.total_amount / 100;
  const contract_id = Number(ctx.update.pre_checkout_query.invoice_payload);
  console.log("contract_id for this checkout: ", contract_id);

  if (currency != "UZS") {
    ctx.reply(`wrong payment request: #${checkout_id}. Payment declined.`);
    ctx.replyWithSticker(helpers.stickers["problem"]);
    ctx.answerPreCheckoutQuery(false);
  } else {
    console.log("pre checkout approved");
    ctx.answerPreCheckoutQuery(true);
  }
});

// payment received
bot.on("successful_payment", ctx => {
  console.log("successful payment: ", ctx.message.successful_payment);
  console.log(
    `${ctx.from.username} just paid ${ctx.message.successful_payment
      .total_amount / 100} UZS`
  );
  const amount_paid = Math.trunc(
    ctx.message.successful_payment.total_amount / 100
  );

  const contract_amount = Number(
    ctx.message.successful_payment.invoice_payload
  );
  const payment_charge_id =
    ctx.message.successful_payment.provider_payment_charge_id;
  console.log(" charge_id: ", payment_charge_id);

  console.log("payment received");
  commands.issueTokens(ctx, contract_amount, "You have deposited ", () => {
    console.log("completed issuing tokens");
  });
});

exports.main_menu = function(ctx, delay) {
  commands.starter(ctx, delay);
};

module.exports = {
  isAdmin
};
