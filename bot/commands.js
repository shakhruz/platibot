const Telegraf = require("telegraf");
const session = require("telegraf/session");
const extra = require("telegraf/extra");
const markup = extra.markdown();
const Markup = require("telegraf/markup");
const Stage = require("telegraf/stage");
const { enter, leave } = Stage;

const data = require("./data");
const bot = new Telegraf(data.BOT_TOKEN);
const db = require("./db.js");
const dapp = require("./dapp.js");
const utils = require("./utils.js");
const helpers = require("./helpers.js");
const eos = require("./eos.js");
const rates = require("./rates.js");

async function welcomeUser(ctx, silent = false) {
  db.getUser(ctx.from.id, async user => {
    if (user != null) {
      console.log("user already exists");
      if (!silent) {
        await ctx.reply(helpers.text("welcome_back") + user.first_name + " !");
        await showBalance(ctx);
        await starter(ctx, 2000);
      }
    } else {
      console.log("adding a new user: ", ctx.from.id);
      ctx.replyWithChatAction("typing");
      await createNewAccount(ctx);
    }
  });
}

async function createNewAccount(ctx) {
  dapp.createNewAccount(acc => {
    if (acc) {
      console.log("created a new vaccount: ", acc.account_name);
      ctx.replyWithChatAction("typing");

      db.addUser(
        ctx.from.id,
        ctx.from.username,
        ctx.from.first_name,
        ctx.from.last_name,
        ctx.from.language_code,
        acc.account_name,
        acc.privateKey,
        async result => {
          if (result) {
            ctx.replyWithChatAction("typing");
            await utils.timeout(1000);
            await ctx.replyWithMarkdown(
              helpers.text("welcome") + ctx.from.first_name + "!"
            );
            await ctx.replyWithChatAction("typing");
            await issueTokens(
              ctx,
              100,
              helpers.text("you_got_bonus"),
              async () => {
                await help(ctx);
                await starter(ctx, 3000);
              }
            );
          }
        }
      );
    } else {
      console.log("there was an error creating a new account: ", acc);
      sendError(ctx, "There was an error in creating a new mEOS account");
      replyError(
        ctx,
        "Oops. There was an error in creating a new mEOS account"
      );
    }
  });
}

async function issueTokens(ctx, meos_amount, message, callback) {
  db.getUser(ctx.from.id, async user => {
    ctx.replyWithChatAction("typing");

    const result = await eos.issueTokens(user.account_name, meos_amount);
    if (result) {
      await ctx.replyWithMarkdown(`${message} ${meos_amount} mEOS `);
    } else {
      await ctx.reply("There was problem issuing tokens...");
    }
    callback();
  });
}

function deposit_command(ctx) {
  db.getUser(ctx.from.id, async user => {
    ctx.replyWithChatAction("typing");
    await ctx.replyWithMarkdown(
      `Please send EOS tokens to *'meoswalletxx'* with memo ` +
        `'*${user.account_name}*' to deposit mEOS tokens.\n\n` +
        `10 000 mEOS tokens = 1 EOS token.\n\nYou can withdraw mEOS as EOS anytime to an external EOS account.`
    );
    starter(ctx, 2000);
  });
}

// main menu
async function starter(ctx, delay = 0) {
  ctx.replyWithChatAction("typing");

  setTimeout(async () => {
    await ctx.reply(helpers.menu_item("main_menu_title"), helpers.main_menu());
  }, delay);
}

// send message to all admins
function sendToAdmins(message, markdown = false) {
  data.admins_id.forEach(function(id) {
    if (markdown) bot.telegram.sendMessage(id, message, markup);
    else bot.telegram.sendMessage(id, message);
  });
}

// send message to a user
function sendMessage(userId, message, markdown = false) {
  if (markdown) bot.telegram.sendMessage(userId, message, markup);
  else bot.telegram.sendMessage(userId, message);
}

exports.notify = function(id, message, markdown) {
  sendMessage(id, message, markdown);
};

// send error message to admins
function sendError(ctx, err) {
  ctx.replyWithChatAction("typing");
  console.log("Error: ", err.toString());
  if (ctx && ctx.from) {
    if (err.toString().includes("message is not modified")) {
      return;
    }
    bot.telegram.sendMessage(
      data.dev,
      `❌ Ошибка у [${ctx.from.first_name}](tg://user?id=${ctx.from.id}) \n\nОшибка: ${err}`
    );
  }
  starter(ctx);
}

async function replyError(ctx, message) {
  ctx.replyWithChatAction("typing");
  await ctx.replyWithSticker(helpers.stickers["problem"]);
  ctx.reply(message);
}

async function showBalance(ctx) {
  // get and show user balance
  ctx.replyWithChatAction("typing");
  utils.getBalance(ctx.from.id, balance => {
    const usd_balance = (balance * rates.eos_price()) / 10000;
    ctx.reply(
      helpers.text("your_balance") +
        ` ${balance} mEOS ($${utils.formatAmount(usd_balance, "USD")})`
    );
  });
}

async function balance_command(ctx) {
  ctx.replyWithChatAction("typing");
  await showBalance(ctx);
  starter(ctx, 2000);
}

function chargeUzcard(ctx, uzs_amount, meos_amount) {
  console.log("charge uzcard: ", uzs_amount, " meos: ", meos_amount);
  const invoice = createInvoice(uzs_amount, meos_amount, 0);
  ctx.replyWithInvoice(invoice).then(invoice_result => {
    console.log("invoice result: ", invoice_result);
  });
}

function createInvoice(uzs_amount, meos_amount, contract_id) {
  // let token = process.env.mode == "PRODUCTION" ? data.provider_token : data.provider_token_dev
  return {
    provider_token: data.payme_token,
    start_parameter: meos_amount,
    title: "Trivia Points (mEOS)",
    description: `deposit of ${meos_amount} mEOS`,
    currency: "UZS",
    is_flexible: false,
    // need_shipping_address: false,
    prices: [
      { label: "Trivia Points (mEOS)", amount: Math.trunc(uzs_amount * 100) }
    ],
    payload: meos_amount,
    photo_url: "https://i.imgur.com/88GAIkZ.png",
    provider_data: contract_id,
    need_phone_number: false,
    need_email: false,
    need_shipping_address: false,
    send_phone_number_to_provider: false,
    send_email_to_provider: false,
    disable_notification: false,
    photo_width: 320,
    photo_height: 320
  };
}

async function help(ctx) {
  ctx.replyWithChatAction("typing");
  await utils.timeout(2000);
  await ctx.replyWithMarkdown(helpers.text("help_info"));
  // ctx.replyWithChatAction("typing");
  // await utils.timeout(2000);
  // await ctx.replyWithMarkdown(
  //   "You can also organize your own Trivia game and give away mEOS tokens in exhange for players attention to your questions and their usernames. " +
  //     "It's a great marketing tool that's also fun."
  // );
  // ctx.replyWithChatAction("typing");
  // await utils.timeout(2000);
  // await ctx.replyWithMarkdown(
  //   "mEOS is a game token that you can earn and spend here in mEOS wallet"
  // );
  // ctx.replyWithChatAction("typing");
  // await utils.timeout(2000);
  // await ctx.replyWithMarkdown(
  //   "You can transfer and withdraw mEOS. Or better - create a paid Trivia Question and let other people answer it and get mEOS tokens that you staked for that question."
  // );
  // ctx.replyWithChatAction("typing");
  // await utils.timeout(2000);
  // await ctx.replyWithMarkdown(
  //   "This way you can organize your own Trivia game and give away mEOS tokens in exhange for people's attention to your questions and also for the opportunity to chat with them. "
  // );
  // ctx.replyWithChatAction("typing");
  // await utils.timeout(2000);
  // await ctx.replyWithMarkdown(
  //   "It's a great marketing tool that's fair and fun."
  // );
  // ctx.replyWithChatAction("typing");
  // await utils.timeout(2000);
  // await ctx.replyWithMarkdown(
  //   "You can use it as a nice gift to your group members if you have a telegram group. Or you can promote a service or a product this way."
  // );
  // ctx.replyWithChatAction("typing");
  // await utils.timeout(2000);
  // await ctx.replyWithMarkdown(
  //   "Once you create a question you can share it in the groups, channels you choose you just send to people you want to take part in it."
  // );
  // ctx.replyWithChatAction("typing");
  // await utils.timeout(2000);
  // await ctx.replyWithMarkdown(
  //   "Every time someone answers your question, you will get notified and will see the players username, so you can talk to that user if you wish."
  // );
  // ctx.replyWithChatAction("typing");
  // await utils.timeout(2000);
  // await ctx.replyWithMarkdown(
  //   "You can specify how many people will share your reward."
  // );
  // ctx.replyWithChatAction("typing");
  // await utils.timeout(2000);
  // await ctx.replyWithMarkdown(
  //   "You can try it right now by selecting *Create Paid Trivia Question* in the menu..."
  // );
}

module.exports = {
  help,
  issueBonusTokens: issueTokens,
  createNewAccount,
  welcomeUser,
  deposit_command,
  sendToAdmins,
  sendMessage,
  balance_command,
  showBalance,
  replyError,
  sendError,
  starter,
  welcomeUser,
  chargeUzcard
};
