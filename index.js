require('dotenv').config();
const { Telegraf } = require('telegraf');
const express = require('express');
const OpenAI = require('openai');
const Filter = require('bad-words'); // inglizcha npm kutubxonasi (400+ qattiq so'zlar)
const { generateMegaRegex } = require('./badwords'); // Siz uchun tuzilgan keng O'zbek/Rus bazasi

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

// Kutubxonalar va mega filtr qoidalarni yuklaymiz (Jami 1500+ haqorat so'zlariga yetadi)
const englishFilter = new Filter();
const { exact: exactUzRuRegex, roots: rootsUzRuRegex } = generateMegaRegex();

const systemPrompt = `You are a strict text classification algorithm.
Your only job is to analyze the user text in any language (especially deep Uzbek slang, Russian mat, etc.) and evaluate if it contains ANY form of profanity, insults, swear words, or rude language.
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
        
        // Bo'shliqlar olib tashlangan versiya (xarflar orasiga probel qo'ysa ham topadi d i n ax)
        const cleanTextForCheck = text.replace(/[\s\.\,\_\-]/g, '').toLowerCase();

        // 1-qadam: BARCHA TILLAR (Ingliz, O'zbek, Rus 1500+ tadan izlaydi)
        if (
            englishFilter.isProfane(text) || 
            exactUzRuRegex.test(text.toLowerCase()) ||
            rootsUzRuRegex.test(cleanTextForCheck) ||
            rootsUzRuRegex.test(text.toLowerCase())
        ) {
            isProfane = true;
        } else {
            // 2-qadam: AI bazasi orqali Mantiqiy tekshirish, ya'ni inson bilmagan narsani topsa
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
                // Xabarni yo'q qilish
                await ctx.deleteMessage(ctx.message.message_id);
            } catch (e) {
                console.error("Xabarni o'chirish huquqi yo'q:", e.message);
            }

            try {
                // Rasm yoki sticker bo'lsa uni ogohlantirish bilan almashtirish
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
    console.log("🤖 1500+ Mega Anti-Swear Bot eshitmoqda...");
}).catch(console.error);

app.listen(PORT, () => {
    console.log(`🌐 Express web-server port ${PORT} da yondi.`);
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
