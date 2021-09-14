import { Telegraf } from 'telegraf'

process.env["NTBA_FIX_319"] = '1';


const token = process.env.BOT_TOKEN || require('./config.json').bot_token;
const url = process.env.APP_URL;


const bot = new Telegraf(token);

bot.start((ctx) => ctx.reply('Hello World'));

bot.launch();


console.log("Started!");

process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))