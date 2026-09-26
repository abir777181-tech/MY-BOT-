const TelegramBot = require('node-telegram-bot-api');
const http = require('http');

// 🔑 নতুন টোকেন ও এডমিন আইডি
const BOT_TOKEN = '8673480574:AAHZQ7kjq5e9oTGX6cShLT0TGkWxojzXkCQ';
const ADMIN_ID = 8514764458; 

// 🎯 টার্গেট টেলিগ্রাম চ্যানেল
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

// 🎯 5-STEP MARTINGALE STATE & PERIOD SHIFT
let currentLevel = 1; 
const MAX_LEVEL = 5;
let periodHistory = []; 
let customPeriodOffset = 0; // গেম পিরিয়ড সিঙ্ক করার অফসেট

// Render Keep-Alive HTTP Server
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('5-Step Real-Time Engine Active\n');
}).listen(PORT, () => console.log(`Server listening on port ${PORT}`));

// ⏱️ গেমের পিরিয়ড নম্বর জেনারেটর (BD Time + 30s Real Clock Offset)
function getExactPeriodNumber() {
  const now = new Date();
  
  // Bangladesh Time (+6 GMT)
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const bdTime = new Date(utc + (3600000 * 6));

  const year = bdTime.getFullYear();
  const month = String(bdTime.getMonth() + 1).padStart(2, '0');
  const day = String(bdTime.getDate()).padStart(2, '0');

  // রাত 00:00:00 BD Time থেকে সেকেন্ড গণনা
  const startOfDay = new Date(bdTime.getFullYear(), bdTime.getMonth(), bdTime.getDate(), 0, 0, 0);
  const elapsedSeconds = Math.floor((bdTime - startOfDay) / 1000);

  // প্রতি ৩০ সেকেন্ডে ১টি পিরিয়ড + অফসেট
  let currentPeriodIndex = Math.floor(elapsedSeconds / 30) + 1 + customPeriodOffset;
  if (currentPeriodIndex < 1) currentPeriodIndex = 1;

  const formattedIndex = String(currentPeriodIndex).padStart(4, '0');

  return `${year}${month}${day}1000${formattedIndex}`;
}

// 📊 BIG / SMALL এনালাইসিস ইঞ্জিন (৫-স্টেপ ট্র্যাকিং)
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

  // 🎯 মার্টিঙ্গেল ৫-স্টেপ লজিক (Win = Level 1, Loss = Level + 1)
  let activeBetLevel = currentLevel;
  const isWin = Math.random() < 0.70; 

  if (isWin) {
    currentLevel = 1; 
  } else {
    if (currentLevel < MAX_LEVEL) {
      currentLevel++; 
    } else {
      currentLevel = 1; 
    }
  }

  if (periodHistory.length >= 20) periodHistory.shift();
  periodHistory.push(decision);

  return { signal: formattedSignal, level: activeBetLevel };
}

// ⏱️ সিগন্যাল পোস্ট ফাংশন
async function sendSignalNow() {
  if (!isBotRunning) return;

  const currentPeriod = getExactPeriodNumber();
  const result = generateSignalEngine();

  const signalMessage = `📊 **VIP 5-STEP 30s SIGNAL**\n\n` +
                        `🔹 **Period:** \`${currentPeriod}\`\n` +
                        `🔹 **Signal:** **${result.signal}**\n` +
                        `🎯 **Bet Step:** **Level ${result.level}**\n` +
                        `⏱ **Time Frame:** 30 Seconds\n\n` +
                        `⚠️ *Win = Level 1 | Loss = Level+1 (Max Step 5)*`;

  try {
    await bot.sendMessage(CHANNEL_ID, signalMessage, { parse_mode: 'Markdown' });
  } catch (err) {
    console.error('মেসেজ পাঠাতে সমস্যা:', err.message);
  }
}

// ⏱️ ঘড়ির :০০ এবং :৩০ সেকেন্ডের সাথে নিখুঁত সিঙ্ক লুপ
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
        [
          { text: '➕ পিরিয়ড +১ বাড়াও', callback_data: 'period_plus' },
          { text: '➖ পিরিয়ড -১ কমাও', callback_data: 'period_minus' }
        ],
        [{ text: '🔄 রিফ্রেশ স্ট্যাটাস', callback_data: 'refresh_status' }]
      ]
    }
  };

  const currentPeriod = getExactPeriodNumber();
  bot.sendMessage(chatId, `🛠 **এডমিন কন্ট্রোল প্যানেল**\n\nঅবস্থা: **${statusText}**\nচ্যানেল: **${CHANNEL_ID}**\nবর্তমান লেভেল: **Level ${currentLevel}**\nবটের পিরিয়ড: \`${currentPeriod}\`\n(গেমের সাথে না মিললে ➕/➖ চাপুন)`, { parse_mode: 'Markdown', ...options });
}

// বাটন হ্যান্ডলার
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
      await bot.answerCallbackQuery(query.id, { text: '৫-স্টেপ সিগন্যাল চালু হয়েছে!' });
      
      await sendSignalNow();
      scheduleNextRealTimeSignal();
    }
    sendAdminPanel(query.message.chat.id);
  } else if (query.data === 'period_plus') {
    customPeriodOffset += 1;
    await bot.answerCallbackQuery(query.id, { text: 'পিরিয়ড ১ বাড়ানো হয়েছে' });
    sendAdminPanel(query.message.chat.id);
  } else if (query.data === 'period_minus') {
    customPeriodOffset -= 1;
    await bot.answerCallbackQuery(query.id, { text: 'পিরিয়ড ১ কমানো হয়েছে' });
    sendAdminPanel(query.message.chat.id);
  } else if (query.data === 'refresh_status') {
    await bot.answerCallbackQuery(query.id, { text: 'স্ট্যাটাস আপডেট' });
    sendAdminPanel(query.message.chat.id);
  }
});

// এরর অটো-হ্যান্ডলিং
bot.on('polling_error', (error) => {
  console.log(`Auto Recovered: ${error.code || error.message}`);
});

process.on('uncaughtException', (err) => console.error('Uncaught Exception:', err.message));
process.on('unhandledRejection', (reason) => console.error('Unhandled Rejection:', reason));
