const TelegramBot = require('node-telegram-bot-api');
const http = require('http');

// 🔑 আপনার টোকেন ও এডমিন আইডি
const BOT_TOKEN = '8673480574:AAHZQ7kjq5e9oTGX6cShLT0TGkWxojzXkCQ';
const ADMIN_ID = 8514764458; 

// 🎯 প্রাইভেট টেলিগ্রাম চ্যানেল আইডি
const CHANNEL_ID = -1004308584896; 

const bot = new TelegramBot(BOT_TOKEN, { 
  polling: {
    interval: 300,
    autoStart: true,
    params: { timeout: 10 }
  } 
});

let isBotRunning = false;
let marketLoopInterval = null;
let awaitingPeriodInput = false;

// 🎯 5-STEP MARTINGALE & GAME MARKET STATE
let currentLevel = 1; 
const MAX_LEVEL = 5;
let periodHistory = ['BIG', 'SMALL', 'BIG', 'BIG', 'SMALL', 'SMALL']; 

// গেম মার্কেট ট্র্যাকার
let activeGamePeriod = null; 

// Render Keep-Alive Server
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Game Market Advanced Trend Engine Active\n');
}).listen(PORT, () => console.log(`Server listening on port ${PORT}`));

// ⏱️ পিরিয়ড নম্বর জেনারেটর
function getNextMarketPeriod() {
  if (!activeGamePeriod) {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const bdTime = new Date(utc + (3600000 * 6));
    
    const year = bdTime.getFullYear();
    const month = String(bdTime.getMonth() + 1).padStart(2, '0');
    const day = String(bdTime.getDate()).padStart(2, '0');
    
    activeGamePeriod = `${year}${month}${day}10000001`;
  } else {
    const basePart = activeGamePeriod.slice(0, -4);
    const numPart = parseInt(activeGamePeriod.slice(-4));
    const nextNum = String(numPart + 1).padStart(4, '0');
    activeGamePeriod = `${basePart}${nextNum}`;
  }
  return activeGamePeriod;
}

// 🧠 অ্যাডভান্সড ট্রেন্ড অ্যানালাইসিস ইঞ্জিন (Trend Following Logic)
function analyzeMarketPattern() {
  const len = periodHistory.length;
  const last1 = periodHistory[len - 1];
  const last2 = periodHistory[len - 2];
  const last3 = periodHistory[len - 3];

  // ১. ড্রাগন ট্রেন্ড অ্যানালাইসিস (পরপর ৩টি একই আসলে ট্রেন্ড ধরে রাখা)
  if (last1 === last2 && last2 === last3) {
    return Math.random() < 0.70 ? last1 : (last1 === 'BIG' ? 'SMALL' : 'BIG');
  }

  // ২. পিং-পং প্যাটার্ন অ্যানালাইসিস (BIG -> SMALL -> BIG)
  if (last1 !== last2 && last2 !== last3) {
    return last1 === 'BIG' ? 'SMALL' : 'BIG';
  }

  // ৩. ব্যালেন্সড ট্রেন্ড অ্যানালাইসিস
  const bigCount = periodHistory.filter(x => x === 'BIG').length;
  const smallCount = periodHistory.filter(x => x === 'SMALL').length;

  if (bigCount > smallCount) {
    return Math.random() < 0.65 ? 'SMALL' : 'BIG';
  } else if (smallCount > bigCount) {
    return Math.random() < 0.65 ? 'BIG' : 'SMALL';
  }

  return Math.random() < 0.5 ? 'BIG' : 'SMALL';
}

// 📊 সিগন্যাল ও মার্টিঙ্গেল ইঞ্জিন
function generateMarketSignal() {
  const decision = analyzeMarketPattern();
  const formattedSignal = decision === 'BIG' ? 'BIG 🟢' : 'SMALL 🔴';

  let activeBetLevel = currentLevel;
  const isWin = Math.random() < 0.85; // ৮৫% ট্রেন্ড একিউরেসি সিমুলেশন

  if (isWin) {
    currentLevel = 1; 
  } else {
    if (currentLevel < MAX_LEVEL) {
      currentLevel++; 
    } else {
      currentLevel = 1; 
    }
  }

  periodHistory.push(decision);
  if (periodHistory.length > 15) periodHistory.shift();

  return { signal: formattedSignal, level: activeBetLevel };
}

// ⏱️ সিগন্যাল পাবলিশ করার ফাংশন
async function publishMarketSignal() {
  if (!isBotRunning) return;

  const targetPeriod = getNextMarketPeriod();
  const result = generateMarketSignal();

  const signalMessage = `📊 **VIP GAME MARKET SIGNAL**\n\n` +
                        `🔹 **Period:** \`${targetPeriod}\`\n` +
                        `🔹 **Signal:** **${result.signal}**\n` +
                        `🎯 **Bet Step:** **Level ${result.level}**\n` +
                        `⏱ **Time Frame:** 30 Seconds\n\n` +
                        `⚠️ *Win = Reset Level 1 | Loss = Level+1 (Max Step 5)*`;

  try {
    await bot.sendMessage(CHANNEL_ID, signalMessage, { parse_mode: 'Markdown' });
  } catch (err) {
    console.error('মেসেজ পাঠাতে সমস্যা:', err.message);
  }
}

// 🛠️ এডমিন প্যানেল
bot.onText(/\/admin|এডমিন প্যানেল|\/start/, (msg) => {
  if (msg.chat.id !== ADMIN_ID) return;
  awaitingPeriodInput = false;
  sendAdminPanel(msg.chat.id);
});

function sendAdminPanel(chatId) {
  const statusText = isBotRunning ? '🟢 গেম মার্কেট সিগন্যাল চালু' : '🔴 সিগন্যাল বন্ধ আছে';

  const options = {
    reply_markup: {
      inline_keyboard: [
        [{ text: isBotRunning ? '⏸️ BOT OFF' : '▶️ BOT ON', callback_data: 'toggle_bot' }],
        [{ text: '🎯 গেমের লাইভ পিরিয়ড সিঙ্ক করো (Sync Period)', callback_data: 'sync_game_period' }],
        [{ text: '🔄 রিফ্রেশ স্ট্যাটাস', callback_data: 'refresh_status' }]
      ]
    }
  };

  const currentPeriodDisp = activeGamePeriod ? activeGamePeriod : 'সেট করা হয়নি (অটো জেনারেটিং)';
  bot.sendMessage(chatId, `🛠 **গেম মার্কেট এডমিন প্যানেল**\n\nঅবস্থা: **${statusText}**\nচ্যানেল আইডি: \`${CHANNEL_ID}\`\nবর্তমান লেভেল: **Level ${currentLevel}**\nরানিং মার্কেট পিরিয়ড: \`${currentPeriodDisp}\``, { parse_mode: 'Markdown', ...options });
}

// বাটন হ্যান্ডলিং
bot.on('callback_query', async (query) => {
  if (query.message.chat.id !== ADMIN_ID) return;

  if (query.data === 'toggle_bot') {
    if (isBotRunning) {
      isBotRunning = false;
      if (marketLoopInterval) clearInterval(marketLoopInterval);
      currentLevel = 1;
      await bot.answerCallbackQuery(query.id, { text: 'বট বন্ধ করা হয়েছে।' });
    } else {
      isBotRunning = true;
      currentLevel = 1;
      await bot.answerCallbackQuery(query.id, { text: 'সিগন্যাল চালু হয়েছে!' });
      
      await publishMarketSignal();
      marketLoopInterval = setInterval(async () => {
        if (isBotRunning) await publishMarketSignal();
      }, 30000);
    }
    sendAdminPanel(query.message.chat.id);
  } else if (query.data === 'sync_game_period') {
    awaitingPeriodInput = true;
    await bot.answerCallbackQuery(query.id);
    bot.sendMessage(query.message.chat.id, `✏️ **গেমের বর্তমান যে পিরিয়ডটি বোর্ডে চলছে তার পুরো নম্বরটি দিন:**\n\nউদাহরণ: \`2026092610000450\``, { parse_mode: 'Markdown' });
  } else if (query.data === 'refresh_status') {
    await bot.answerCallbackQuery(query.id, { text: 'স্ট্যাটাস আপডেট' });
    sendAdminPanel(query.message.chat.id);
  }
});

// এডমিন ইনপুট রিসিভার
bot.on('message', (msg) => {
  if (msg.chat.id !== ADMIN_ID) return;
  if (msg.text && msg.text.startsWith('/')) return;

  if (awaitingPeriodInput) {
    const inputPeriod = msg.text.trim();
    
    if (inputPeriod.length < 8 || isNaN(inputPeriod)) {
      bot.sendMessage(msg.chat.id, '❌ ভুল পিরিয়ড ফরম্যাট! সঠিক পিরিয়ড নম্বর লিখুন।');
      return;
    }

    activeGamePeriod = inputPeriod;
    awaitingPeriodInput = false;

    bot.sendMessage(msg.chat.id, `✅ **গেম মার্কেটের সাথে পিরিয়ড সিঙ্ক হয়েছে!**\n\nপরবর্তী সিগন্যাল পিরিয়ড: \`${activeGamePeriod}\``, { parse_mode: 'Markdown' });
    sendAdminPanel(msg.chat.id);
  }
});

// এরর হ্যান্ডলিং
bot.on('polling_error', (error) => {
  console.log(`Auto Recovered: ${error.code || error.message}`);
});

process.on('uncaughtException', (err) => console.error('Uncaught Exception:', err.message));
process.on('unhandledRejection', (reason) => console.error('Unhandled Rejection:', reason));
