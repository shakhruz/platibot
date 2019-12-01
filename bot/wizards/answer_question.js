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
  await checkQuestion(ctx, true);
  bot.main_menu(ctx);
  return ctx.scene.leave();
});

stepHandler.action("false_answer", async ctx => {
  ctx.wizard.state.answer = false;
  await checkQuestion(ctx, false);
  bot.main_menu(ctx);
  return ctx.scene.leave();
});

stepHandler.use(ctx => {
  ctx.reply(helpers.menu_item("try_again"), helpers.main_menu);
  ctx.replyWithSticker(helpers.stickers["problem"]); // problem sticker
  bot.main_menu(ctx);
  return ctx.scene.leave();
});

async function showQuestion(ctx, question) {
  ctx.replyWithMarkdown(
    `QUESTION:*${question.question}*\n\n` +
      `REWARD: ${Math.floor(question.stake / question.winners)} mEOS`,
    Markup.inlineKeyboard([
      Markup.callbackButton("👍 TRUE", "true_answer"),
      Markup.callbackButton("👎 FALSE", "false_answer")
    ]).extra()
  );
}

async function checkQuestion(ctx, answer) {
  const question = ctx.session.question;
  const reward = Math.floor(question.stake / question.winners);
  if (question.answer == answer) {
    ctx.reply(`Congratulations! You won ${reward} mEOS...`);
    db.updateQuestion(question.id, true, () => {
      transferReward(ctx, question, reward);
    });
  } else {
    ctx.reply(`Wrong :(....Try again...`);
    db.updateQuestion(question.id, false, () => {
      console.log("updated question");
    });
  }
}

async function transferReward(ctx, question, reward) {
  ctx.replyWithChatAction("typing");

  await db.getUser(ctx.from.id, async to => {
    await db.getUser(question.user_id, async from => {
      console.log("to: ", to, " from: ", from);
      if (to && from) {
        dapp
          .vtransfer(
            from.account_name,
            to.account_name,
            reward,
            "reward",
            from.private_key
          )
          .then(result => {
            console.log("transfer result: ", result);
            ctx.reply(
              `✔ completed transferring ${reward} mEOS to your account...`
            );
            bot.notify(
              from.id,
              `@${to.username} just got ${reward} mEOS for answering: ${question.question}`
            );
            bot.main_menu(ctx, 2000);
            return ctx.scene.leave();
          })
          .catch(err => {
            console.log("transfer error: ", err);
            if (err.error && err.error.details[0]) {
              ctx.reply(
                `❗ there was an error tranferring ${reward} mEOS: ${err.error.details[0].message}`
              );
            } else {
              ctx.reply(
                `❗ there was an error tranferring ${reward} mEOS: ${err.error.message}`
              );
            }
            bot.main_menu(ctx, 2000);
            return ctx.scene.leave();
          });
      } else {
        ctx.reply(` something went wrong... `);
        bot.main_menu(ctx, 2000);
        return ctx.scene.leave();
      }
    });
  });
}

exports.answer_question = new WizardScene(
  "answer_question",
  async ctx => {
    ctx.replyWithChatAction("typing");

    db.getQuestion(ctx.session.question_id, async question => {
      ctx.session.question = question;
      console.log("got question: ", question);
      if (question) {
        if (question.user_id == ctx.from.id) {
          ctx.replyWithSticker(helpers.stickers["problem"]); // problem sticker
          ctx.reply(
            "Please don't answer your own questions. It's not fair ;)..."
          );
          bot.main_menu(ctx);
          return ctx.scene.leave();
        }
        if (question.winners > question.won) {
          console.log("got question: ", question);
          ctx.replyWithChatAction("typing");
          showQuestion(ctx, question);
          return ctx.wizard.next();
        } else {
          ctx.reply(`Sorry, this question has been answered by other players.`);
          bot.main_menu(ctx);
          return ctx.scene.leave();
        }
      } else {
        ctx.reply(`Question with this ID was not found...`);
        bot.main_menu(ctx);
        return ctx.scene.leave();
      }
    });
  },
  stepHandler,
  ctx => {
    bot.main_menu(ctx);
    return ctx.scene.leave();
  }
);
