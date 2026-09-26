const TelegramBot = require('node-telegram-bot-api');
const http = require('http');

// কাস্টম সেটিংস
const BOT_TOKEN = '8807448192:AAGLPS9RjBJZQ0Hfp6eZ13ADtm_7yHwulEs';
const ADMIN_ID = 8514764458; // আপনার এডমিন আইডি

// টার্গেট টেলিগ্রাম চ্যানেল
const CHANNEL_ID = '@TM_COMMUNITY_01'; 

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

let isBotRunning = false;
let signalInterval = null;

// সার্ভার চালু রাখা (Render Web Service-এর জন্য প্রয়োজনীয়)
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Bot is active!\n');
}).listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

// পরবর্তী (NEXT / UPCOMING) পিরিয়ড নম্বর জেনারেটর
function getNextPeriodNumber() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffInSeconds = Math.floor((now - startOfDay) / 1000);
  
  // পরবর্তী ৩০ সেকেন্ড রাউন্ডের ইনডেক্স (+২ ব্যবহার করে পরবর্তী পিরিয়ড নিশ্চিত করা হচ্ছে)
  const nextPeriodIndex = Math.floor(diffInSeconds / 30) + 2;
  const formattedIndex = String(nextPeriodIndex).padStart(4, '0');
  
  return `${year}${month}${day}1000${formattedIndex}`;
}

// প্রেডিকশন সিগন্যাল জেনারেটর
function getPredictionSignal() {
  const choices = ['BIG 🟢', 'SMALL 🔴'];
  return choices[Math.floor(Math.random() * choices.length)];
}

// এডমিন কমান্ড
bot.onText(/\/admin|এডমিন প্যানেল/, (msg) => {
  const chatId = msg.chat.id;

  if (chatId !== ADMIN_ID) {
    return bot.sendMessage(chatId, '❌ আপনার এই কমান্ড ব্যবহার করার অনুমতি নেই।');
  }

  sendAdminPanel(chatId);
});

function sendAdminPanel(chatId) {
  const statusText = isBotRunning ? '🟢 পরবর্তী রাউন্ডের প্রেডিকশন চালু আছে' : '🔴 সার্ভিস বন্ধ আছে';

  const options = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: isBotRunning ? '⏸️ BOT OFF' : '▶️ BOT ON', callback_data: 'toggle_bot' }
        ],
        [
          { text: '🔄 রিফ্রেশ স্ট্যাটাস', callback_data: 'refresh_status' }
        ]
      ]
    }
  };

  bot.sendMessage(chatId, `🛠 **এডমিন কন্ট্রোল প্যানেল**\n\nবর্তমান অবস্থা: **${statusText}**\nটার্গেট চ্যানেল: **${CHANNEL_ID}**`, { parse_mode: 'Markdown', ...options });
}

// বাটন ক্লিক হ্যান্ডলিং
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;

  if (chatId !== ADMIN_ID) {
    return bot.answerCallbackQuery(query.id, { text: 'অনুমতি নেই!', show_alert: true });
  }

  if (data === 'toggle_bot') {
    if (isBotRunning) {
      isBotRunning = false;
      clearInterval(signalInterval);
      signalInterval = null;
      bot.answerCallbackQuery(query.id, { text: 'সিগন্যাল প্রেডিকশন বন্ধ করা হয়েছে।' });
    } else {
      isBotRunning = true;
      bot.answerCallbackQuery(query.id, { text: 'পরবর্তী রাউন্ডের অটো প্রেডিকশন শুরু হয়েছে!' });

      // প্রতি ৩০ সেকেন্ড পর পর পরবর্তী পিরিয়ডের জন্য প্রেডিকশন পাঠানো হবে
      signalInterval = setInterval(async () => {
        const nextPeriod = getNextPeriodNumber();
        const signal = getPredictionSignal();

        const signalMessage = `🔮 **NEXT ROUND PREDICTION**\n\n` +
                              `🎯 **Upcoming Period:** \`${nextPeriod}\`\n` +
                              `📊 **Predicted Signal:** **${signal}**\n` +
                              `⏱ **Timeframe:** 30 Seconds\n\n` +
                              `⚠️ *7 স্টেপ মেনটেন করে গেমপ্লে করুন*`;

        try {
          await bot.sendMessage(CHANNEL_ID, signalMessage, { parse_mode: 'Markdown' });
        } catch (err) {
          console.error('চ্যানেলে পোস্ট পাঠাতে সমস্যা:', err.message);
        }

      }, 30000);
    }

    sendAdminPanel(chatId);
  } else if (data === 'refresh_status') {
    bot.answerCallbackQuery(query.id, { text: 'স্ট্যাটাস আপডেট করা হয়েছে' });
    sendAdminPanel(chatId);
  }
});
