import { Telegraf } from "telegraf";

import mongoose from "mongoose";
const { Schema } = mongoose;

process.env["NTBA_FIX_319"] = "1";

const token: string =
  process.env.BOT_TOKEN || require("./config.json").bot_token;
const mongo_path: string =
  process.env.MONGO_TOKEN || require("./config.json").mongo_path;
const mongo_user: string =
  process.env.MONGO_USER || require("./config.json").mongo_user;
const mongo_password: string =
  process.env.MONGO_PASSWORD || require("./config.json").mongo_password;

const url = process.env.APP_URL;

const dbToken = mongo_path
  .replace("$(User)", mongo_user)
  .replace("$(Password)", mongo_password);
mongoose.connect(dbToken);

const volunteerSchema = new Schema({
  chat_id: Number,
  user_id: Number,
  user_name: String,
  name: String,
});

const contentSchema = new Schema({
  chat_id: Number,
  message_id: Number,
  alerts: Number,
  alert_by: String,
});

const VolunteerModel = mongoose.model("Volunteer", volunteerSchema);
const AlertContentModel = mongoose.model("AlertContent", contentSchema);

const bot = new Telegraf(token);
// if (url) bot.telegram.setWebhook(url);

bot.start((ctx) => ctx.reply("Hello World"));

bot.command(["del", "d"], (ctx) => {
  let chatId = ctx.message.chat.id;

  ctx.telegram.deleteMessage(chatId, ctx.message.message_id);

  if (ctx.from.username != "diegov") return;

  if (ctx.message.reply_to_message != null) {
    ctx.telegram.deleteMessage(
      ctx.chat.id,
      ctx.message.reply_to_message.message_id
    );
    ctx.telegram.deleteMessage(ctx.chat.id, ctx.message.message_id);
  }
});

bot.command(["report", "r"], async (ctx) => {
  let chatId = ctx.message.chat.id;

  ctx.telegram.deleteMessage(ctx.chat.id, ctx.message.message_id);

  if (!ctx.message.reply_to_message) return;

  let volunteer = await getVolunteer(ctx.message.from.id, chatId);
  if (!volunteer) return;

  var message = await AlertContentModel.findOne({
    chat_id: chatId,
    message_id: ctx.message.reply_to_message.message_id,
  });
  if (!message) {
    message = new AlertContentModel({
      chat_id: chatId,
      message_id: ctx.message.reply_to_message.message_id,
      alerts: 0,
      alertBy: "",
    });
  }
  let currentAlertBy: string = message.get("alert_by") ?? "";

  let hasMyAlert =
    currentAlertBy.split(",").filter((i) => i == ctx.message.from.id.toString())
      .length > 0;
  if (hasMyAlert) return;

  currentAlertBy += `${ctx.message.from.id},`;
  message.set("alert_by", currentAlertBy);

  let currentAlerts = message.get("alerts");
  message.set("alerts", ++currentAlerts);
  await message.save();

  if (currentAlerts >= 3)
    ctx.telegram.deleteMessage(chatId, ctx.message.reply_to_message.message_id);
});

bot.command(["addval", "av"], async (ctx) => {
  var chatId = ctx.chat.id;

  ctx.telegram.deleteMessage(chatId, ctx.message.message_id);

  if (ctx.from.username != "diegov") return;

  if (ctx.message.reply_to_message != null) {
    const chatId = ctx.message.chat.id;
    const user = ctx.message.reply_to_message.from;
    const name = [user?.first_name, user?.last_name].filter((i) => i).join(" ");

    const volunteer = await getVolunteer(user?.id, chatId);

    if (volunteer) {
      ctx.reply(name + " уже волонтер!");
      return;
    }

    var doc = new VolunteerModel({
      user_id: user?.id,
      user_name: user?.username,
      name: name,
      chat_id: chatId,
    });
    await doc.save();

    ctx.reply(name + " стал волонтером!");
  }
});

bot.command(["delval", "dv"], async (ctx) => {
  var chatId = ctx.chat.id;

  ctx.telegram.deleteMessage(chatId, ctx.message.message_id);

  if (ctx.from.username != "diegov") return;

  if (ctx.message.reply_to_message != null) {
    const user = ctx.message.reply_to_message.from;
    const name = [user?.first_name, user?.last_name].filter((i) => i).join(" ");

    const volunteer = await getVolunteer(user?.id, chatId);

    if (!volunteer) {
      ctx.reply(name + " не волонтер!");
      return;
    }
    await volunteer?.delete();

    ctx.reply(name + " перестал быть волонтером!");
  }
});

bot.command(["vals"], async (ctx) => {
  var chatId = ctx.chat.id;

  ctx.telegram.deleteMessage(chatId, ctx.message.message_id);

  let i = 0;
  let list = "Список волонтеров:";
  try {
    
  for (const doc of await VolunteerModel.find({ chat_id: chatId })) {
    i++;
    let userName = doc.get("user_name");
    let name = [doc.get("name"), userName ? `(@${userName})` : undefined]
      .filter((i) => i)
      .join(" ");

    list += `\n${i}. ${name}`;
  }
}
catch (e)
{
    console.log(e);
}

  ctx.reply(list);
});

bot.hears("!check", (ctx) => {
  ctx.reply("I am alive!", { reply_to_message_id: ctx.message.message_id });
});

function getVolunteer(
  userId: number | undefined,
  chatId: number
): mongoose.Query<any, any> {
  var query = VolunteerModel.findOne({
    user_id: userId,
    chat_id: chatId,
  });

  return query;
}

bot.launch();

console.log("Started!");

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
