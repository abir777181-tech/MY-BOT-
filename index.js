const TelegramBot = require('node-telegram-bot-api');
const http = require('http');

// যাচাইকৃত তথ্য
const BOT_TOKEN = '8807448192:AAGLPS9RjBJZQ0Hfp6eZ13ADtm_7yHwulEs';
const ADMIN_ID = 8196834441;

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

let isBotRunning = false;
let signalInterval = null;

// বাস্তব টাইমের পিরিয়ড নম্বর জেনারেটর
function generatePeriodNumber() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    
    const totalSeconds = (now.getHours() * 3600) + (now.getMinutes() * 60) + now.getSeconds();
    const periodCount = String(Math.floor(totalSeconds / 30)).padStart(4, '0');
    
    return `${year}${month}${day}${periodCount}`;
}

// প্রতি ৩০ সেকেন্ড পরপর সিগন্যাল পাঠানোর ফাংশন
function startSendingSignals(chatId) {
    if (signalInterval) clearInterval(signalInterval);

    signalInterval = setInterval(() => {
        if (!isBotRunning) return;

        const choices = ['BIG 🟢', 'SMALL 🔴'];
        const randomSignal = choices[Math.floor(Math.random() * choices.length)];
        const period = generatePeriodNumber();

        const messageText = 
`🔮 𝗡𝗘𝗪 𝗦𝗜𝗚𝗡𝗔𝗟

🎯 𝗦𝗜𝗚𝗡𝗔𝗟 ➜  ${randomSignal}
⏰ 𝗣𝗘𝗥𝗜𝗢𝗗 ➜ #${period}
📊 𝗦𝗧𝗔𝗧𝗨𝗦 ➜ ⏳ PENDING 

⚡ 𝗣𝗟𝗔𝗖𝗘 𝗬𝗢𝗨𝗥 𝗦𝗜𝗚𝗡𝗔𝗟
💎 𝗣𝗟𝗔𝗬 𝗦𝗔𝗙𝗘𝗟𝗬`;

        bot.sendMessage(chatId, messageText).catch(err => {
            console.error("Error sending message:", err.message);
        });
    }, 30000);
}

// /start কমান্ড হ্যান্ডলার
bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, "👋 **সিগন্যাল বট চালু হয়েছে!**\n\nএডমিন প্যানেল দেখতে `/admin` বা 'এডমিন প্যানেল' লিখুন।", { parse_mode: 'Markdown' });
});

// এডমিন প্যানেল ফিল্টার
bot.on('message', (msg) => {
    const text = msg.text ? msg.text.trim().toLowerCase() : '';
    
    if (text === '/admin' || text === 'এডমিন প্যানেল' || text === 'admin panel') {
        if (msg.from.id !== ADMIN_ID) {
            return bot.sendMessage(msg.chat.id, "❌ আপনার এই এডমিন প্যানেল ব্যবহার করার অনুমতি নেই!");
        }

        const statusText = isBotRunning ? "🟢 চালু (ON)" : "🔴 বন্ধ (OFF)";
        
        const options = {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "▶️ BOT ON", callback_data: "start_bot" },
                        { text: "⏹️ BOT OFF", callback_data: "stop_bot" }
                    ]
                ]
            }
        };

        bot.sendMessage(msg.chat.id, `⚙️ **ADMIN CONTROL PANEL**\n\nবটের বর্তমান অবস্থা: **${statusText}**\n\nনিচের বাটন চেপে বট নিয়ন্ত্রণ করুন:`, { parse_mode: 'Markdown', ...options });
    }
});

// অন/অফ বাটনের কাজের লজিক
bot.on('callback_query', (query) => {
    const chatId = query.message.chat.id;
    const messageId = query.message.message_id;

    if (query.from.id !== ADMIN_ID) {
        return bot.answerCallbackQuery(query.id, { text: "❌ আপনার অনুমতি নেই!", show_alert: true });
    }

    if (query.data === "start_bot") {
        if (!isBotRunning) {
            isBotRunning = true;
            startSendingSignals(chatId);
            bot.editMessageText("✅ **বট সফলভাবে চালু করা হয়েছে!** (প্রতি ৩০ সেকেন্ডে সিগন্যাল আসবে)", { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown' });
        } else {
            bot.answerCallbackQuery(query.id, { text: "⚠️ বট ইতিমধ্যেই চালু আছে!", show_alert: true });
        }
    } else if (query.data === "stop_bot") {
        if (isBotRunning) {
            isBotRunning = false;
            if (signalInterval) clearInterval(signalInterval);
            bot.editMessageText("🛑 **বট সফলভাবে বন্ধ করা হয়েছে!**", { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown' });
        } else {
            bot.answerCallbackQuery(query.id, { text: "⚠️ বট ইতিমধ্যেই বন্ধ রয়েছে!", show_alert: true });
        }
    }
});

// Render-এ বট ২৪ ঘণ্টা চালু রাখার জন্য HTTP পোর্ট সার্ভার
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.end('Bot is Active\n');
}).listen(PORT);

console.log("Bot server is running...");
  
