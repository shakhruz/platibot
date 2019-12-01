const Markup = require("telegraf/markup");
const Composer = require("telegraf/composer");
const WizardScene = require("telegraf/scenes/wizard");
const helpers = require("../helpers.js");
const bot = require("../bot.js");
const data = require("../data");
const db = require("../db.js");
const dapp = require("../dapp.js");
const utils = require("../utils.js");
const commands = require("../commands.js");
const rates = require("../rates.js");

const stepHandler = new Composer();

stepHandler.use(ctx => {
  ctx.reply(helpers.menu_item("try_again"), helpers.main_menu);
  ctx.replyWithSticker(helpers.stickers["problem"]); // problem sticker
  bot.main_menu(ctx);
  return ctx.scene.leave();
});

exports.deposit_uzs = new WizardScene(
  "deposit_uzs",
  async ctx => {
    ctx.reply(
      "How much UZS would you like to deposit? (10000 - 1000000)",
      Markup.keyboard([helpers.menu_item("back")])
        .oneTime()
        .resize()
        .extra()
    );
    return ctx.wizard.next();
  },
  async ctx => {
    if (!ctx.message) {
      ctx.reply(`ОK...`);
      bot.main_menu(ctx);
      return ctx.scene.leave();
    }
    if (ctx.message.text != helpers.menu_item("back")) {
      ctx.wizard.state.amount = parseInt(ctx.message.text.trim());
      if (
        ctx.wizard.state.amount <= 10000 ||
        ctx.wizard.state.amount > 1000000
      ) {
        ctx.reply(`Please deposit more than 10 000 and less than 1 mln UZS`);
        bot.main_menu(ctx);
        return ctx.scene.leave();
      }
      console.log("amount: ", ctx.wizard.state.amount);
      const usd_amount = ctx.wizard.state.amount / rates.uzs_price();
      const meos_amount = Math.trunc(
        (usd_amount / rates.eos_price()) * 0.9 * 10000
      );

      commands.chargeUzcard(ctx, ctx.wizard.state.amount, meos_amount, 0);

      return ctx.wizard.next();
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
