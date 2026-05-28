require('dotenv').config();
const { Telegraf } = require('telegraf');
const express = require('express');
const OpenAI = require('openai');

// .env dan kalitlarni olamiz
const BOT_TOKEN = process.env.BOT_TOKEN;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

if(!BOT_TOKEN || !OPENROUTER_API_KEY) {
    console.error("DIQQAT: .env faylida BOT_TOKEN yoki OPENROUTER_API_KEY kalitlari topilmadi!");
    process.exit(1);
}

const MUTE_DURATION_MINUTES = parseInt(process.env.MUTE_DURATION_MINUTES) || 10; // So'kingani uchun qancha vaqt muteda o'tirishi (daqiqa)

const app = express();
const PORT = process.env.PORT || 3000;

// Render Web Service doim ishlab turishi uchun / API orqali pingleb turishga yordam beradi
app.get('/', (req, res) => {
    res.send('AI Anti-Swear Bot is online and running!');
});

const bot = new Telegraf(BOT_TOKEN);

const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: OPENROUTER_API_KEY,
});

// AI uchun instruksiya. (Juda aniq profil qilib berilgan)
const systemPrompt = `You are an AI language moderation assistant. 
Your ONLY task is to analyze the user's message and determine if it contains ANY profanity, swearing, bad words, insults, or highly offensive language IN ANY LANGUAGE (Uzbek, Russian, English, Turkish, etc).
Respond strictly with a JSON object in this exact format:
{"is_profane": true} -> if there is swearing/profanity.
{"is_profane": false} -> if the message is completely clean.
Do not output any explanation or extra text.`;

bot.on('text', async (ctx) => {
    // Bot shaxsiy yozishmalarda ishlashi shart emas, guruh formatiga maxsus
    if (ctx.chat.type === 'private') {
        return ctx.reply("💬 Bu botni guruhga qo'shing va menga xabarlarni o'chirish hamda foydalanuvchilarni cheklash (admin) huquqini bering.");
    }

    const text = ctx.message.text;

    try {
        // OpenRouter orqali modellarga ulashish (gemini juda tez va yaxshi mantiqqa ega)
        const response = await openai.chat.completions.create({
            model: 'google/gemini-2.5-flash', 
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: text }
            ],
            response_format: { type: "json_object" }
        });

        let content = response.choices[0].message.content.trim();
        
        // JSON formati noto'g'ri stringlar bilan o'ralgan bo'lsa (markdown) tozalaymiz
        if (content.startsWith('```')) {
            content = content.replace(/```(json)?|```/g, '').trim();
        }

        const result = JSON.parse(content);

        // Agar AI so'kinish yoki haqorat bor debsa...
        if (result.is_profane) {
            
            // 1. So'kingan xabarni o'chirish
            try {
                await ctx.deleteMessage(ctx.message.message_id);
            } catch (e) {
                console.error("Xabarni o'chirishda xatolik:", e.message);
            }

            // 2. Foydalanuvchini yozishdan cheklash (Ban / Mute)
            const untilDate = Math.floor(Date.now() / 1000) + (MUTE_DURATION_MINUTES * 60);
            
            try {
                await ctx.restrictChatMember(ctx.from.id, {
                    permissions: {
                        can_send_messages: false, // yozisha olmaydi
                        can_send_media_messages: false, // rasm-video tashlay olmaydi
                        can_send_other_messages: false, // stikerlar taqiqlangan
                        can_add_web_page_previews: false // ssilka taqiqlangan
                    },
                    until_date: untilDate
                });
                
                await ctx.reply(`🚫 <a href="tg://user?id=${ctx.from.id}">${ctx.from.first_name || 'Foydalanuvchi'}</a> guruhda haqoratli so'z ishlatgani uchun ${MUTE_DURATION_MINUTES} daqiqaga "mute" qilingan (yozish huquqidan mahrum qilingan)!`, { parse_mode: 'HTML' });
            } catch (e) {
                console.error("Mute qilishda xatolik:", e.message);
                await ctx.reply(`🚫 <a href="tg://user?id=${ctx.from.id}">${ctx.from.first_name || 'Foydalanuvchi'}</a> so'kindi, diqqat qiling! (Bot pneal berishi / band qilishi uchun to'liq admin huquq berishingiz kerak)`, { parse_mode: 'HTML' });
            }
        }
    } catch (error) {
        console.error("AI so'rovida yoki matn tekshirishda xatolik:", error.message);
    }
});

// Botni ishga tushiramiz
bot.launch().then(() => {
    console.log("🤖 Telegram bot muvaffaqiyatli ishga tushdi va xabarlarni eshitmoqda (polling mode)...");
}).catch(console.error);

// Eksklyuziv tarzda Express serverni yoqamiz (Render Web Service platformasi xursand bo'lib portni tasdiqlashi uchun)
app.listen(PORT, () => {
    console.log(`🌐 Express web-server Render uchun ishga tushdi: port ${PORT}`);
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
