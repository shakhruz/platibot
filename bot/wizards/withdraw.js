const Markup = require("telegraf/markup");
const Composer = require("telegraf/composer");
const WizardScene = require("telegraf/scenes/wizard");
const helpers = require("../helpers.js");
const bot = require("../bot.js");
const data = require("../data");
const db = require("../db.js");
const dapp = require("../dapp.js");

const stepHandler = new Composer();

stepHandler.use(ctx => {
  ctx.reply(helpers.menu_item("try_again"), helpers.main_menu);
  ctx.replyWithSticker(helpers.stickers["problem"]); // problem sticker
  bot.main_menu(ctx);
  return ctx.scene.leave();
});

exports.withdraw = new WizardScene(
  "withdraw",
  async ctx => {
    await ctx.replyWithSticker(helpers.stickers["start"]); // sticker
    ctx.reply("How much mEOS would you like to withdraw?", helpers.back_menu());
    return ctx.wizard.next();
  },
  async ctx => {
    if (!ctx.message) {
      ctx.reply(`ОK...`);
      bot.main_menu(ctx);
      return ctx.scene.leave();
    }
    if (ctx.message.text != helpers.menu_item("back")) {
      ctx.wizard.state.amount = ctx.message.text.trim();
      console.log("amount: ", ctx.wizard.state.amount);

      ctx.reply(
        "Please enter EOS username where to send " +
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

      db.getUser(ctx.from.id, async from => {
        const result = await dapp.withdraw(
          from.account_name,
          ctx.wizard.state.to,
          ctx.wizard.state.amount,
          from.private_key
        );
        if (result) {
          ctx.reply(
            `... sent ${ctx.wizard.state.amount} mEOS to ${ctx.wizard.state.to}`
          );
        } else {
          ctx.reply(
            `there was an error tranferring ${ctx.wizard.state.amount} mEOS to ${ctx.wizard.state.to}`
          );
        }
      });

      bot.main_menu(ctx, 2000);
      return ctx.scene.leave();
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
