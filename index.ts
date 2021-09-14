import { Telegraf } from 'telegraf'

process.env["NTBA_FIX_319"] = '1';


const token = process.env.BOT_TOKEN || require('./config.json').bot_token;
const url = process.env.APP_URL;


const bot = new Telegraf(token);

if (url)
    bot.telegram.setWebhook(url);

bot.start((ctx) => ctx.reply('Hello World'));

bot.command('del', ctx => 
{
    if (ctx.from.username != 'diegov')
        return;

    if (ctx.message.reply_to_message != null)
    {
        ctx.telegram.deleteMessage(ctx.chat.id, ctx.message.reply_to_message.message_id);
        ctx.telegram.deleteMessage(ctx.chat.id, ctx.message.message_id);
    }
})

bot.hears('!check', ctx => 
{
    ctx.reply("I am alive!", { reply_to_message_id : ctx.message.message_id })
})

bot.launch();


console.log("Started!");

process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))