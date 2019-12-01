const Markup = require("telegraf/markup");
const Composer = require("telegraf/composer");
const WizardScene = require("telegraf/scenes/wizard");
const helpers = require("../helpers.js");
const bot = require("../bot.js");
const data = require("../data");
const db = require("../db.js");
const dapp = require("../dapp.js");
const utils = require("../utils.js");

const stepHandler = new Composer();

stepHandler.action("true_answer", async ctx => {
  ctx.wizard.state.answer = true;
  await confirmQuestion(ctx);
  return ctx.wizard.next();
});

stepHandler.action("false_answer", async ctx => {
  ctx.wizard.state.answer = false;
  await confirmQuestion(ctx);
  return ctx.wizard.next();
});

stepHandler.action("yes", async ctx => {
  await createQuestion(ctx);
  bot.main_menu(ctx);
  return ctx.scene.leave();
});

stepHandler.action("no", async ctx => {
  bot.main_menu(ctx);
  return ctx.wizard.next();
});

stepHandler.use(ctx => {
  ctx.reply(helpers.menu_item("try_again"), helpers.main_menu);
  ctx.replyWithSticker(helpers.stickers["problem"]); // problem sticker
  bot.main_menu(ctx);
  return ctx.scene.leave();
});

async function confirmQuestion(ctx) {
  ctx.replyWithMarkdown(
    `QUESTION:\n\n*${ctx.wizard.state.question}*\n\nCORRECT ANSWER: ${ctx.wizard.state.answer}\n` +
      `TOTAL REWARD: ${ctx.wizard.state.stake}\nMAX WINNERS: ${ctx.wizard.state.winners}\n` +
      `PER WINNER: ${Math.floor(
        ctx.wizard.state.stake / ctx.wizard.state.winners
      )} mEOS`,
    Markup.inlineKeyboard([
      Markup.callbackButton("👍 OK", "yes"),
      Markup.callbackButton("❌ Cancel", "no")
    ]).extra()
  );
}

async function createQuestion(ctx) {
  console.log("create question: ", ctx.wizard.state);
  db.addQuestion(
    ctx.from.id,
    ctx.wizard.state.stake,
    ctx.wizard.state.winners,
    ctx.wizard.state.question,
    ctx.wizard.state.answer,
    0,
    0,
    id => {
      console.log("question id: ", id);
      if (id) {
        showQuestion(ctx, id);
      } else {
        bot.replyError(`There was an error adding a question to DB...`);
      }
    }
  );
}

async function showQuestion(ctx, id) {
  ctx.replyWithMarkdown(
    `QUESTION:\n\n*${ctx.wizard.state.question}*\n\nCORRECT ANSWER: ${ctx.wizard.state.answer}\n` +
      `TOTAL REWARD: ${ctx.wizard.state.stake}\nMAX WINNERS: ${ctx.wizard.state.winners}\n` +
      `PER WINNER: ${Math.floor(
        ctx.wizard.state.stake / ctx.wizard.state.winners
      )} mEOS`,
    Markup.inlineKeyboard([
      [
        Markup.urlButton(
          helpers.menu_item("check_link"),
          "t.me/" + data.bot_username + "?start=" + id
        )
      ]
    ])
      .oneTime()
      .resize()
      .extra()
  );
}

exports.add_question = new WizardScene(
  "add_question",
  async ctx => {
    ctx.replyWithChatAction("typing");

    db.getUser(ctx.from.id, async user => {
      ctx.replyWithChatAction("typing");

      const balance = await utils.getBalance(ctx.from.id, async balance => {
        ctx.wizard.state.balance = balance;
        await ctx.replyWithSticker(helpers.stickers["start"]); // sticker
        ctx
          .reply(
            "YOU HAVE: " + balance + " mEOS",
            Markup.inlineKeyboard([
              [Markup.callbackButton(`Stake All (${balance} mEOS)`, "send_all")]
            ])
              .oneTime()
              .resize()
              .extra()
          )
          .then(() => {
            ctx.reply(
              "How much would you like to stake as a reward?",
              Markup.keyboard([helpers.menu_item("back")])
                .oneTime()
                .resize()
                .extra()
            );
            return ctx.wizard.next();
          });
      });
    });
  },
  async ctx => {
    // console.log("message: ", ctx);truesend_all"
    if (ctx.update && ctx.update.data == "send_all") {
      console.log("update query: ", ctx.update.callback_query.data);
      ctx.wizard.state.stake = ctx.wizard.state.balance;
      ctx.reply("How many people can get the reward?", helpers.back_menu());
      return ctx.wizard.next();
    }
    if (!ctx.message) {
      ctx.reply(`ОK...`);
      bot.main_menu(ctx);
      return ctx.scene.leave();
    }
    if (ctx.message.text != helpers.menu_item("back")) {
      ctx.wizard.state.stake = parseInt(ctx.message.text.trim());
      if (
        ctx.wizard.state.stake < 0 ||
        ctx.wizard.state.stake > ctx.wizard.state.balance
      ) {
        ctx.reply(
          `You cannot stake more than you have: ${ctx.wizard.state.balance} mEOS`
        );
        bot.main_menu(ctx);
        return ctx.scene.leave();
      }
      console.log("stake: ", ctx.wizard.state.stake);

      ctx.reply("How many people can get the reward?:", helpers.back_menu());

      return ctx.wizard.next();
    } else {
      bot.main_menu(ctx);
      return ctx.scene.leave();
    }
  },
  async ctx => {
    if (!ctx.message) {
      ctx.reply(`ОK...`);
      bot.main_menu(ctx);
      return ctx.scene.leave();
    }
    if (ctx.message.text != helpers.menu_item("back")) {
      ctx.wizard.state.winners = parseInt(ctx.message.text.trim());
      console.log("winners: ", ctx.wizard.state.winners);

      ctx.reply(
        'Please type your question text. Make it a true/false question only like "No bird can fly backwards": 👇',
        helpers.back_menu()
      );

      return ctx.wizard.next();
    } else {
      bot.main_menu(ctx);
      return ctx.scene.leave();
    }
  },
  async ctx => {
    if (!ctx.message) {
      ctx.reply(`ОK...`);
      bot.main_menu(ctx);
      return ctx.scene.leave();
    }
    if (ctx.message.text != helpers.menu_item("back")) {
      ctx.wizard.state.question = ctx.message.text.trim();
      console.log("question: ", ctx.wizard.state.question);
      ctx.replyWithChatAction("typing");

      ctx.reply(
        `Is it true or false?`,
        Markup.inlineKeyboard([
          Markup.callbackButton("👍 TRUE", "true_answer"),
          Markup.callbackButton("👎 FALSE", "false_answer")
        ]).extra()
      );
      return ctx.wizard.next();
    } else {
      bot.main_menu(ctx);
      return ctx.scene.leave();
    }
  },
  stepHandler,
  stepHandler,
  ctx => {
    bot.main_menu(ctx);
    return ctx.scene.leave();
  }
);
