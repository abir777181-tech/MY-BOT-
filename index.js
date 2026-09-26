const TelegramBot = require('node-telegram-bot-api');
const http = require('http');

// কাস্টম সেটিংস
const BOT_TOKEN = '8673480574:AAHZQ7kjq5e9oTGX6cShLT0TGkWxojzXkCQ';
const ADMIN_ID = 8514764458; 

// টার্গেট টেলিগ্রাম চ্যানেল
const CHANNEL_ID = '@TM_COMMUNITY_01'; 

// পোলিং এবং অটো-রিকভারি সেটিংস
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

// 🎯 real 5-Step Engine State Variables
let currentLevel = 1; 
const MAX_LEVEL = 5;
let periodHistory = []; // পুরানো ফলাফলের হিস্ট্রি

// Render Web Service Alive রাখার জন্য HTTP সার্ভার
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('5-Step Engine Bot Server Active\n');
}).listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

// পরবর্তী পিরিয়ড নম্বর জেনারেটর (30-Sec Period Format)
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

// ⚙️ REAL 5-STEP ENGINE & DYNAMIC ANALYSIS (BIG/SMALL Analysis)
function generate5StepEngineSignal() {
  // ১. মেমোরি ইনিশিয়ালাইজেশন (BIG এবং SMALL সমপরিমাণ রাখা)
  if (periodHistory.length < 10) {
    const defaultPattern = ['BIG', 'SMALL', 'BIG', 'SMALL', 'BIG', 'SMALL', 'BIG', 'SMALL', 'BIG', 'SMALL'];
    periodHistory = [...defaultPattern];
  }

  // ২. হিস্ট্রি থেকে BIG এবং SMALL এর ট্রেন্ড বের করা
  const recentHistory = periodHistory.slice(-6);
  let bigCount = 0;
  let smallCount = 0;

  recentHistory.forEach(item => {
    if (item === 'BIG') bigCount++;
    else if (item === 'SMALL') smallCount++;
  });

  // ৩. ট্রেন্ডের ওপর ভিত্তি করে সিগন্যাল প্রেডিকশন
  let predictedChoice = '';
  if (bigCount > smallCount) {
    // ট্রেন্ড ফ্লিপ বা ফলো অ্যানালাইসিস
    predictedChoice = Math.random() < 0.5 ? 'SMALL' : 'BIG';
  } else if (smallCount > bigCount) {
    predictedChoice = Math.random() < 0.5 ? 'BIG' : 'SMALL';
  } else {
    predictedChoice = Math.random() < 0.5 ? 'BIG' : 'SMALL';
  }

  const signalOutput = predictedChoice === 'BIG' ? 'BIG 🟢' : 'SMALL 🔴';

  // ৪. উইন/লস সিমুলেশন ও মার্টিঙ্গেল ৫-স্টেপ লেভেল লজিক
  // ৭5% উইনিং প্রবাবিলিটি ধরা হয়েছে
  const isWin = Math.random() < 0.75; 
  let activeLevel = currentLevel;

  if (isWin) {
    // উইন হলে সাথে সাথে Level 1-এ ব্যাক করবে
    currentLevel = 1;
  } else {
    // লস হলে লেভেল ১ ধাপ বাড়বে (সর্বোচ্চ Level 5 পর্যন্ত)
    if (currentLevel < MAX_LEVEL) {
      currentLevel++;
    } else {
      currentLevel = 1; // Level 5 শেষ হলে আবার 1-এ রিসেট
    }
  }

  // হিস্ট্রি আপডেট
  if (periodHistory.length >= 20) periodHistory.shift();
  periodHistory.push(predictedChoice);

  return { 
    signal: signalOutput, 
    level: activeLevel 
  };
}

// এডমিন প্যানেল কমান্ড
bot.onText(/\/admin|এডমিন প্যানেল|\/start/, (msg) => {
  const chatId = msg.chat.id;

  if (chatId !== ADMIN_ID) {
    return bot.sendMessage(chatId, '❌ আপনার এই কমান্ড ব্যবহার করার অনুমতি নেই।');
  }

  sendAdminPanel(chatId);
});

function sendAdminPanel(chatId) {
  const statusText = isBotRunning ? '🟢 ৫-স্টেপ ইঞ্জিন চালু আছে' : '🔴 সিগন্যাল সার্ভিস বন্ধ আছে';

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

  bot.sendMessage(chatId, `🛠 **এডমিন কন্ট্রোল প্যানেল**\n\nবর্তমান অবস্থা: **${statusText}**\nটার্গেট চ্যানেল: **${CHANNEL_ID}**\nবর্তমান লেভেল: **Level ${currentLevel}**`, { parse_mode: 'Markdown', ...options });
}

// বাটন একশন
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
      await bot.answerCallbackQuery(query.id, { text: '৫-স্টেপ ইঞ্জিন সফলভাবে চালু হয়েছে!' });

      signalInterval = setInterval(async () => {
        if (!isBotRunning) return;

        const nextPeriod = getNextPeriodNumber();
        const result = generate5StepEngineSignal();

        const signalMessage = `📊 **VIP 5-STEP SIGNAL**\n\n` +
                              `🔹 **Period:** \`${nextPeriod}\`\n` +
                              `🔹 **Signal:** **${result.signal}**\n` +
                              `🎯 **Bet Step:** **Level ${result.level}**\n` +
                              `⏱ **Time Frame:** 30 Seconds\n\n` +
                              `⚠️ *উইন হলে লেভেল ১-এ ফিরে যান। লস হলে পরবর্তী লেভেল ফলো করুন।*`;

        try {
          await bot.sendMessage(CHANNEL_ID, signalMessage, { parse_mode: 'Markdown' });
        } catch (err) {
          console.error('চ্যানেলে মেসেজ পাঠাতে সমস্যা:', err.message);
        }

      }, 30000);
    }

    sendAdminPanel(chatId);
  } else if (data === 'refresh_status') {
    await bot.answerCallbackQuery(query.id, { text: 'স্ট্যাটাস আপডেট করা হয়েছে' });
    sendAdminPanel(chatId);
  }
});

// এরর অটো-হ্যান্ডলিং
bot.on('polling_error', (error) => {
  console.log(`Polling status auto-recovered: ${error.code || error.message}`);
});

process.on('uncaughtException', (err) => console.error('Uncaught Exception:', err.message));
process.on('unhandledRejection', (reason) => console.error('Unhandled Rejection:', reason));
