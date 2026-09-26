const TelegramBot = require('node-telegram-bot-api');
const http = require('http');

// কাস্টম সেটিংস
const BOT_TOKEN = '8673480574:AAHZQ7kjq5e9oTGX6cShLT0TGkWxojzXkCQ';
const ADMIN_ID = 8514764458; 

// টার্গেট টেলিগ্রাম চ্যানেল
const CHANNEL_ID = '@TM_COMMUNITY_01'; 

// পোলিং এরর রিকভারি সেটিংস
const bot = new TelegramBot(BOT_TOKEN, { 
  polling: {
    interval: 300,
    autoStart: true,
    params: {
      timeout: 10
    }
  } 
});

let isBotRunning = false;
let signalInterval = null;

// ডায়নামিক হিস্ট্রি মেমোরি ও ৫-স্টেপ ট্র্যাকিং
let periodHistory = [];
let currentLevel = 1; 
const MAX_LEVEL = 5;

// Render Web Service Alive রাখার সার্ভার
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Bot Server Active\n');
}).listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

// পিরিয়ড নম্বর জেনারেটর
function getNextPeriodNumber() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffInSeconds = Math.floor((now - startOfDay) / 1000);
  
  const nextPeriodIndex = Math.floor(diffInSeconds / 30) + 2;
  const formattedIndex = String(nextPeriodIndex).padStart(4, '0');
  
  return `${year}${month}${day}1000${formattedIndex}`;
}

// 📊 ডায়নামিক হিস্ট্রি এনালাইসিস এবং ৫-স্টেপ উইন ইঞ্জিন
function generateDynamicSmartSignal() {
  if (periodHistory.length < 15) {
    const defaultChoices = ['BIG', 'SMALL'];
    while (periodHistory.length < 15) {
      periodHistory.push(defaultChoices[Math.floor(Math.random() * defaultChoices.length)]);
    }
  }

  let requiredHistoryDepth = currentLevel >= 3 ? 15 : (currentLevel === 2 ? 8 : 5);
  const activeHistory = periodHistory.slice(-requiredHistoryDepth);

  let bigCount = 0;
  let smallCount = 0;

  activeHistory.forEach(res => {
    if (res === 'BIG') bigCount++;
    else smallCount++;
  });

  let predictedSignal = '';

  if (bigCount / requiredHistoryDepth >= 0.6) {
    predictedSignal = 'BIG 🟢';
  } else if (smallCount / requiredHistoryDepth >= 0.6) {
    predictedSignal = 'SMALL 🔴';
  } else if (currentLevel >= 3) {
    predictedSignal = bigCount >= smallCount ? 'SMALL 🔴' : 'BIG 🟢';
  } else {
    predictedSignal = bigCount > smallCount ? 'SMALL 🔴' : 'BIG 🟢';
  }

  const isWinSimulated = Math.random() < 0.70;
  let oldLevel = currentLevel;
  
  if (isWinSimulated || currentLevel >= MAX_LEVEL) {
    currentLevel = 1;
  } else {
    currentLevel++;
  }

  const rawChoice = predictedSignal.includes('BIG') ? 'BIG' : 'SMALL';
  if (periodHistory.length >= 20) periodHistory.shift();
  periodHistory.push(rawChoice);

  return { signal: predictedSignal, level: oldLevel };
}

// এডমিন কমান্ড
bot.onText(/\/admin|এডমিন প্যানেল|\/start/, (msg) => {
  const chatId = msg.chat.id;

  if (chatId !== ADMIN_ID) {
    return bot.sendMessage(chatId, '❌ আপনার এই কমান্ড ব্যবহার করার অনুমতি নেই।');
  }

  sendAdminPanel(chatId);
});

function sendAdminPanel(chatId) {
  const statusText = isBotRunning ? '🟢 ডায়নামিক ৫-স্টেপ সিগন্যাল চালু আছে' : '🔴 সিগন্যাল সার্ভিস বন্ধ আছে';

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
      if (signalInterval) clearInterval(signalInterval);
      signalInterval = null;
      currentLevel = 1;
      await bot.answerCallbackQuery(query.id, { text: 'সিগন্যাল সার্ভিস বন্ধ করা হয়েছে।' });
    } else {
      isBotRunning = true;
      currentLevel = 1;
      await bot.answerCallbackQuery(query.id, { text: 'ডায়নামিক এনালাইসিস সিগন্যাল চালু হয়েছে!' });

      signalInterval = setInterval(async () => {
        if (!isBotRunning) return;

        const nextPeriod = getNextPeriodNumber();
        const result = generateDynamicSmartSignal();

        const signalMessage = `📊 **VIP SIGNAL UPDATE**\n\n` +
                              `🔹 **Period:** \`${nextPeriod}\`\n` +
                              `🔹 **Signal:** **${result.signal}**\n` +
                              `🎯 **Bet Step:** **Level ${result.level}**\n` +
                              `⏱ **Time Frame:** 30 Seconds\n\n` +
                              `⚠️ *৫-স্টেপ মানিম্যানেজমেন্ট মেনে ট্রেড করুন।*`;

        try {
          await bot.sendMessage(CHANNEL_ID, signalMessage, { parse_mode: 'Markdown' });
        } catch (err) {
          console.error('চ্যানেলে পোস্ট পাঠাতে সমস্যা:', err.message);
        }

      }, 30000);
    }

    sendAdminPanel(chatId);
  } else if (data === 'refresh_status') {
    await bot.answerCallbackQuery(query.id, { text: 'স্ট্যাটাস আপডেট করা হয়েছে' });
    sendAdminPanel(chatId);
  }
});

// 🛠️ পোলিং এরর রিকভারি হ্যান্ডলার (যা বটকে হ্যাং হতে দেবে না)
bot.on('polling_error', (error) => {
  console.log(`Polling status auto-recovered: ${error.code || error.message}`);
});

process.on('uncaughtException', (err) => console.error('Uncaught Exception:', err.message));
process.on('unhandledRejection', (reason) => console.error('Unhandled Rejection:', reason));
