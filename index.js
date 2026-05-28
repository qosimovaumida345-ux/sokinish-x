require('dotenv').config();
const { Telegraf } = require('telegraf');
const express = require('express');
const OpenAI = require('openai');

const BOT_TOKEN = process.env.BOT_TOKEN;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

if(!BOT_TOKEN || !OPENROUTER_API_KEY) {
    console.error("DIQQAT: .env faylida BOT_TOKEN yoki OPENROUTER_API_KEY kalitlari topilmadi!");
    process.exit(1);
}

const MUTE_DURATION_MINUTES = parseInt(process.env.MUTE_DURATION_MINUTES) || 10;

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('AI Anti-Swear Bot is online and running!');
});

const bot = new Telegraf(BOT_TOKEN);

const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: OPENROUTER_API_KEY,
});

// Qattiq so'kinishlarni aniqlovchi KUCHLI RegEx
const hardSwearRegex = /naxuy|naxx?uy|dinax|blyat|blya?d|jalab|jalla|qanjiq|xaromi|haromi|gandon|gondon|pidar|piderez|ko\'?t|ammi|sika|sikam|dalbayob|yiban|chumich/i;

const systemPrompt = `You are a strict text classification algorithm.
Your only job is to analyze the user text in any language (especially Uzbek, Russian slang) and evaluate if it contains ANY form of profanity, insults, swear words, or rude language.
Look closely for masked words.
Output only JSON: {"is_profane": true} or {"is_profane": false}. No other text.`;

bot.on('message', async (ctx) => {
    if (ctx.chat && ctx.chat.type === 'private') {
        return ctx.reply("💬 Bu botni guruhga qo'shing. Barcha so'kinishlarni o'zi tozalaydi!");
    }

    const text = ctx.message && (ctx.message.text || ctx.message.caption);
    if (!text) return;

    try {
        let isProfane = false;
        const cleanTextForCheck = text.replace(/[\s\.\,\_\-]/g, '').toLowerCase();

        if (hardSwearRegex.test(cleanTextForCheck) || hardSwearRegex.test(text.toLowerCase())) {
            isProfane = true;
        } else {
            try {
                const response = await openai.chat.completions.create({
                    model: 'meta-llama/llama-3.1-8b-instruct:free', 
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: text }
                    ],
                    response_format: { type: "json_object" }
                });

                let content = response.choices[0].message.content.trim().toLowerCase();
                
                if (content.includes('"is_profane": true') || content.includes('"is_profane":true')) {
                    isProfane = true;
                }
            } catch (aiError) {
                console.error("AI aniqlashda xato:", aiError.message);
            }
        }

        if (isProfane) {
            try {
                await ctx.deleteMessage(ctx.message.message_id);
            } catch (e) {
                console.error("Xabarni o'chirish huquqi yo'q:", e.message);
            }

            try {
                const userLink = `<a href="tg://user?id=${ctx.from.id}">${ctx.from.first_name || 'Foydalanuvchi'}</a>`;
                await ctx.reply(`${userLink}, so'kinish mumkin emas! 🚫`, { parse_mode: 'HTML' });
            } catch (e) {
                console.error("Javob yozishda xato:", e.message);
            }

            const untilDate = Math.floor(Date.now() / 1000) + (MUTE_DURATION_MINUTES * 60);
            try {
                await ctx.restrictChatMember(ctx.from.id, {
                    permissions: { can_send_messages: false },
                    until_date: untilDate
                });
            } catch (e) {
                console.error("Mute qilish uchun huquq yo'q:", e.message);
            }
        }
    } catch (error) {
        console.error("Umumiy xatolik:", error.message);
    }
});

bot.launch().then(() => {
    console.log("🤖 Anti-Swear Bot ish qo'shildi!");
}).catch(console.error);

app.listen(PORT, () => {
    console.log(`🌐 Express web-server port ${PORT} da yondi.`);
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
