const TelegramBot = require('node-telegram-bot-api');
const http = require('http');

// কাস্টম সেটিংস
const BOT_TOKEN = '8673480574:AAHZQ7kjq5e9oTGX6cShLT0TGkWxojzXkCQ';
const ADMIN_ID = 8514764458; 

// টার্গেট টেলিগ্রাম চ্যানেল
const CHANNEL_ID = '@TM_COMMUNITY_01'; 

const bot = new TelegramBot(BOT_TOKEN, { 
  polling: {
    interval: 300,
    autoStart: true,
    params: { timeout: 10 }
  } 
});

let isBotRunning = false;
let realTimeLoopTimeout = null;

// 🎯 REAL 5-STEP MARTINGALE STATE
let currentLevel = 1; 
const MAX_LEVEL = 5;
let periodHistory = []; 

// Render Keep-Alive HTTP Server
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Real-Time Engine Active\n');
}).listen(PORT, () => console.log(`Server listening on port ${PORT}`));

// ⏱️ বাংলাদেশ টাইমজোনে (GMT+6) নিখুঁত ৩০ সেকেন্ড পিরিয়ড ক্যালকুলেটর
function getExactPeriodNumber() {
  // UTC থেকে বাংলাদেশ টাইমে কনভার্ট (+6 hours)
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const bdTime = new Date(utc + (3600000 * 6));

  const year = bdTime.getFullYear();
  const month = String(bdTime.getMonth() + 1).padStart(2, '0');
  const day = String(bdTime.getDate()).padStart(2, '0');

  const startOfDay = new Date(bdTime.getFullYear(), bdTime.getMonth(), bdTime.getDate());
  const elapsedSeconds = Math.floor((bdTime - startOfDay) / 1000);

  const currentPeriodIndex = Math.floor(elapsedSeconds / 30) + 1;
  const formattedIndex = String(currentPeriodIndex).padStart(4, '0');

  return `${year}${month}${day}1000${formattedIndex}`;
}

// 📊 BIG / SMALL এনালাইসিস ইঞ্জিন
function generateSignalEngine() {
  if (periodHistory.length < 6) {
    periodHistory = ['BIG', 'SMALL', 'BIG', 'SMALL', 'BIG', 'SMALL'];
  }

  const recent = periodHistory.slice(-4);
  let bigs = recent.filter(x => x === 'BIG').length;
  let smalls = recent.filter(x => x === 'SMALL').length;

  let decision = '';
  if (bigs > smalls) {
    decision = Math.random() < 0.6 ? 'SMALL' : 'BIG';
  } else if (smalls > bigs) {
    decision = Math.random() < 0.6 ? 'BIG' : 'SMALL';
  } else {
    decision = Math.random() < 0.5 ? 'BIG' : 'SMALL';
  }

  const formattedSignal = decision === 'BIG' ? 'BIG 🟢' : 'SMALL 🔴';

  // 🎯 মার্টিঙ্গেল ৫-স্টেপ লেভেল ট্র্যাকিং
  let activeBetLevel = currentLevel;
  const isWin = Math.random() < 0.70; 

  if (isWin) {
    currentLevel = 1; // উইন হলে লেভেল ১ এ ফেরত
  } else {
    if (currentLevel < MAX_LEVEL) {
      currentLevel++; // লস হলে লেভেল ১ ধাপ বৃদ্ধি
    } else {
      currentLevel = 1; // Level 5 শেষে রিসেট
    }
  }

  if (periodHistory.length >= 20) periodHistory.shift();
  periodHistory.push(decision);

  return { signal: formattedSignal, level: activeBetLevel };
}

// ⏱️ রিয়েল-টাইম সিগন্যাল সেন্ডার
async function sendSignalNow() {
  if (!isBotRunning) return;

  const currentPeriod = getExactPeriodNumber();
  const result = generateSignalEngine();

  const signalMessage = `📊 **VIP 30-SEC SIGNAL**\n\n` +
                        `🔹 **Period:** \`${currentPeriod}\`\n` +
                        `🔹 **Signal:** **${result.signal}**\n` +
                        `🎯 **Bet Step:** **Level ${result.level}**\n` +
                        `⏱ **Time:** 30 Seconds\n\n` +
                        `⚠️ *Win = Level 1 | Loss = Level+1*`;

  try {
    await bot.sendMessage(CHANNEL_ID, signalMessage, { parse_mode: 'Markdown' });
  } catch (err) {
    console.error('মেসেজ পাঠাতে সমস্যা:', err.message);
  }
}

// ⏱️ ঘড়ির :০০ এবং :৩০ সেকেন্ডের সাথে সিঙ্ক লুপ
function scheduleNextRealTimeSignal() {
  if (!isBotRunning) return;

  const now = new Date();
  const seconds = now.getSeconds();
  const milliseconds = now.getMilliseconds();

  let delay = 0;
  if (seconds < 30) {
    delay = (30 - seconds) * 1000 - milliseconds;
  } else {
    delay = (60 - seconds) * 1000 - milliseconds;
  }

  realTimeLoopTimeout = setTimeout(async () => {
    if (!isBotRunning) return;
    await sendSignalNow();
    scheduleNextRealTimeSignal();
  }, delay);
}

// এডমিন কমান্ড
bot.onText(/\/admin|এডমিন প্যানেল|\/start/, (msg) => {
  if (msg.chat.id !== ADMIN_ID) return;
  sendAdminPanel(msg.chat.id);
});

function sendAdminPanel(chatId) {
  const statusText = isBotRunning ? '🟢 রিয়েল-টাইম ৫-স্টেপ সিগন্যাল চালু' : '🔴 সিগন্যাল বন্ধ আছে';

  const options = {
    reply_markup: {
      inline_keyboard: [
        [{ text: isBotRunning ? '⏸️ BOT OFF' : '▶️ BOT ON', callback_data: 'toggle_bot' }],
        [{ text: '🔄 রিফ্রেশ স্ট্যাটাস', callback_data: 'refresh_status' }]
      ]
    }
  };

  bot.sendMessage(chatId, `🛠 **এডমিন কন্ট্রোল প্যানেল**\n\nঅবস্থা: **${statusText}**\nচ্যানেল: **${CHANNEL_ID}**\nবর্তমান লেভেল: **Level ${currentLevel}**`, { parse_mode: 'Markdown', ...options });
}

// বাটন একশন
bot.on('callback_query', async (query) => {
  if (query.message.chat.id !== ADMIN_ID) return;

  if (query.data === 'toggle_bot') {
    if (isBotRunning) {
      isBotRunning = false;
      if (realTimeLoopTimeout) clearTimeout(realTimeLoopTimeout);
      currentLevel = 1;
      await bot.answerCallbackQuery(query.id, { text: 'বট বন্ধ করা হয়েছে।' });
    } else {
      isBotRunning = true;
      currentLevel = 1;
      await bot.answerCallbackQuery(query.id, { text: 'রিয়েল-টাইম সিগন্যাল চালু হয়েছে!' });
      
      // প্রথম সিগন্যাল সাথে সাথেই যাবে, এরপর থেকে ৩০s সিঙ্ক হবে
      await sendSignalNow();
      scheduleNextRealTimeSignal();
    }
    sendAdminPanel(query.message.chat.id);
  } else if (query.data === 'refresh_status') {
    await bot.answerCallbackQuery(query.id, { text: 'স্ট্যাটাস আপডেট' });
    sendAdminPanel(query.message.chat.id);
  }
});

// এরর হ্যান্ডলার
bot.on('polling_error', (error) => {
  console.log(`Auto Recovered: ${error.code || error.message}`);
});

process.on('uncaughtException', (err) => console.error('Uncaught Exception:', err.message));
process.on('unhandledRejection', (reason) => console.error('Unhandled Rejection:', reason));
