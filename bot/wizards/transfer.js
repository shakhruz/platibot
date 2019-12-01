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

stepHandler.use(ctx => {
  ctx.reply(helpers.menu_item("try_again"), helpers.main_menu);
  ctx.replyWithSticker(helpers.stickers["problem"]); // problem sticker
  bot.main_menu(ctx);
  return ctx.scene.leave();
});

exports.transfer = new WizardScene(
  "transfer",
  async ctx => {
    ctx.replyWithChatAction("typing");

    db.getUser(ctx.from.id, async user => {
      ctx.replyWithChatAction("typing");

      await utils.getBalance(ctx.from.id, async balance => {
        ctx.wizard.state.balance = balance;
        await ctx.replyWithSticker(helpers.stickers["start"]); // sticker
        ctx
          .reply(
            "YOU HAVE: " + balance + " mEOS",
            Markup.inlineKeyboard([
              [Markup.callbackButton(`Send All (${balance} mEOS)`, "send_all")]
            ])
              .oneTime()
              .resize()
              .extra()
          )
          .then(() => {
            ctx.reply(
              "How much would you like to transfer?",
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
    // console.log("message: ", ctx);
    if (
      ctx.updateType == "callback_query" &&
      ctx.update.callback_query.data == "send_all"
    ) {
      console.log("update query: ", ctx.update.callback_query.data);
      ctx.wizard.state.amount = ctx.wizard.state.balance;
      ctx.reply(
        "Please enter telegram username where to send 👇" +
          ctx.wizard.state.amount +
          " mEOS: ",
        helpers.back_menu()
      );
      return ctx.wizard.next();
    }
    if (!ctx.message) {
      ctx.reply(`ОK...`);
      bot.main_menu(ctx);
      return ctx.scene.leave();
    }
    if (ctx.message.text != helpers.menu_item("back")) {
      ctx.wizard.state.amount = parseInt(ctx.message.text.trim());
      if (
        ctx.wizard.state.amount <= 0 ||
        ctx.wizard.state.amount > ctx.wizard.state.balance
      ) {
        ctx.reply(
          `You cannot send more than you have ${balance} mEOS or less than 1 mEOS`
        );
        bot.main_menu(ctx);
        return ctx.scene.leave();
      }
      console.log("amount: ", ctx.wizard.state.amount);

      ctx.reply(
        "Please enter telegram username where to send 👇" +
          ctx.wizard.state.amount +
          " mEOS: ",
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
      ctx.wizard.state.to = ctx.message.text.trim();
      console.log("to: ", ctx.wizard.state.to);

      ctx.reply("Message to send with payment: 👇", helpers.back_menu());

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
      ctx.wizard.state.memo = ctx.message.text.trim();
      console.log("memo: ", ctx.wizard.state.memo);

      ctx.replyWithChatAction("typing");

      await db.getUser(ctx.from.id, async from => {
        await db.getUserByName(ctx.wizard.state.to, async to => {
          if (to) {
            dapp
              .vtransfer(
                from.account_name,
                to.account_name,
                ctx.wizard.state.amount,
                ctx.wizard.state.memo,
                from.private_key
              )
              .then(result => {
                console.log("transfer result: ", result);
                ctx.reply(
                  `✔ completed transferring ${ctx.wizard.state.amount} mEOS to ${ctx.wizard.state.to}...`
                );
                bot.notify(
                  to.id,
                  `@${from.username} sent you ${ctx.wizard.state.amount} mEOS with a note: ${ctx.wizard.state.memo}`
                );
                bot.main_menu(ctx, 2000);
                return ctx.scene.leave();
              })
              .catch(err => {
                console.log("transfer error: ", err);
                if (err.error && err.error.details[0]) {
                  ctx.reply(
                    `❗ there was an error tranferring ${ctx.wizard.state.amount} mEOS to ${ctx.wizard.state.to}: ${err.error.details[0].message}`
                  );
                } else {
                  ctx.reply(
                    `❗ there was an error tranferring ${ctx.wizard.state.amount} mEOS to ${ctx.wizard.state.to}: ${err.error.message}`
                  );
                }
                bot.main_menu(ctx, 2000);
                return ctx.scene.leave();
              });
          } else {
            ctx.reply(
              ` user ${ctx.wizard.state.to} does not have a wallet yet. `
            );
            bot.main_menu(ctx, 2000);
            return ctx.scene.leave();
          }
        });
      });
    } else {
      bot.main_menu(ctx);
      return ctx.scene.leave();
    }
  },
  ctx => {
    bot.main_menu(ctx);
    return ctx.scene.leave();
  }
);
