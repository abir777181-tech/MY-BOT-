const TelegramBot = require('node-telegram-bot-api');
const http = require('http');
const axios = require('axios');

// 🔑 ক্রেডেনশিয়ালস
const BOT_TOKEN = '8673480574:AAHZQ7kjq5e9oTGX6cShLT0TGkWxojzXkCQ';
const ADMIN_ID = 8514764458; 
const CHANNEL_ID = -1004308584896; 
const API_URL = 'https://draw.ar-lottery01.com/WinGo/WinGo_30S/GetHistoryIssuePage.json';

const bot = new TelegramBot(BOT_TOKEN, { 
  polling: { interval: 300, autoStart: true, params: { timeout: 10 } } 
});

let isBotRunning = false;
let marketLoopInterval = null;

let currentLevel = 1; 
const MAX_LEVEL = 5;

let lastPredictedPeriod = null;
let lastPredictionSignal = null;

// Render Keep-Alive Server
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('WinGo Engine Running Active\n');
}).listen(PORT, () => console.log(`Server listening on port ${PORT}`));

// 📡 API Fetcher with Enhanced Headers
async function fetchGameHistory() {
  try {
    const response = await axios.get(API_URL, {
      params: { pageNo: 1, pageSize: 10, ts: Date.now() },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Cache-Control': 'no-cache'
      },
      timeout: 8000
    });

    if (response.data && response.data.data && Array.isArray(response.data.data.list)) {
      return response.data.data.list;
    } else if (Array.isArray(response.data.list)) {
      return response.data.list;
    }
    return null;
  } catch (err) {
    console.error('API Connection Failed:', err.message);
    return null;
  }
}

// 🧠 Advanced Pattern Logic
function analyzeAdvancedPatterns(historyList) {
  const history = historyList.slice(0, 10).map(item => {
    if (item.bigSmall) return item.bigSmall.toUpperCase();
    let num = item.resultNumber !== undefined ? parseInt(item.resultNumber) : parseInt(item.number);
    if (!isNaN(num)) return num >= 5 ? 'BIG' : 'SMALL';
    return Math.random() < 0.5 ? 'BIG' : 'SMALL';
  });

  const p0 = history[0];
  const p1 = history[1];
  const p2 = history[2];
  const p3 = history[3];

  if (p0 !== p1 && p1 !== p2 && p2 !== p3) return p0 === 'BIG' ? 'SMALL' : 'BIG';
  if (p0 === p1 && p2 === p3 && p0 !== p2) return p0;

  let consecutiveCount = 1;
  for (let i = 0; i < history.length - 1; i++) {
    if (history[i] === history[i + 1]) consecutiveCount++;
    else break;
  }

  if (consecutiveCount >= 4) return p0 === 'BIG' ? 'SMALL' : 'BIG';
  if (consecutiveCount >= 2) return p0;

  const bigCount = history.filter(x => x === 'BIG').length;
  if (bigCount >= 7) return 'SMALL';
  if (bigCount <= 3) return 'BIG';

  return p0 === 'BIG' ? 'SMALL' : 'BIG';
}

// ⏱️ Main Execution Cycle
async function processAndPublishSignal() {
  if (!isBotRunning) return;

  const history = await fetchGameHistory();

  if (!history || history.length === 0) {
    console.log('⚠️ API ডেটা পাওয়া যায়নি, ট্রাই করা হচ্ছে...');
    return;
  }

  const latestData = history[0];
  const latestPeriod = String(latestData.issue || latestData.period || latestData.issueNo);

  // Win/Loss Verification
  if (lastPredictedPeriod && lastPredictionSignal) {
    if (latestPeriod === lastPredictedPeriod) {
      const num = latestData.resultNumber !== undefined ? parseInt(latestData.resultNumber) : parseInt(latestData.number);
      const actualResult = num >= 5 ? 'BIG' : 'SMALL';

      if (lastPredictionSignal === actualResult) {
        currentLevel = 1;
      } else {
        currentLevel = currentLevel < MAX_LEVEL ? currentLevel + 1 : 1;
      }
    }
  }

  const nextPeriod = String(BigInt(latestPeriod) + 1n);

  // Prevent sending duplicate signal for same period
  if (lastPredictedPeriod === nextPeriod) return;

  const predictedDecision = analyzeAdvancedPatterns(history);
  const formattedSignal = predictedDecision === 'BIG' ? 'BIG 🟢' : 'SMALL 🔴';

  lastPredictedPeriod = nextPeriod;
  lastPredictionSignal = predictedDecision;

  const signalMessage = `📊 **VIP GAME MARKET SIGNAL**\n\n` +
                        `🔹 **Period:** \`${nextPeriod}\`\n` +
                        `🔹 **Signal:** **${formattedSignal}**\n` +
                        `🎯 **Bet Step:** **Level ${currentLevel} /${MAX_LEVEL}**\n` +
                        `⏱ **Time Frame:** 30 Seconds\n\n` +
                        `⚠️ *Win = Reset Level 1 | Loss = Step +1 (Max 5)*`;

  try {
    await bot.sendMessage(CHANNEL_ID, signalMessage, { parse_mode: 'Markdown' });
  } catch (err) {
    console.error('Telegram Post Error:', err.message);
  }
}

// 🛠️ Admin Panel
bot.onText(/\/admin|এডমিন প্যানেল|\/start/, (msg) => {
  if (msg.chat.id !== ADMIN_ID) return;
  sendAdminPanel(msg.chat.id);
});

function sendAdminPanel(chatId) {
  const statusText = isBotRunning ? '🟢 সিগন্যাল চালু আছে' : '🔴 সিগন্যাল বন্ধ আছে';

  const options = {
    reply_markup: {
      inline_keyboard: [
        [{ text: isBotRunning ? '⏸️ BOT OFF' : '▶️ BOT ON', callback_data: 'toggle_bot' }],
        [{ text: '🔄 রিফ্রেশ স্ট্যাটাস', callback_data: 'refresh_status' }]
      ]
    }
  };

  const currentPeriodDisp = lastPredictedPeriod ? lastPredictedPeriod : 'API রেডি হচ্ছে...';
  bot.sendMessage(chatId, `🛠 **গেম মার্কেট এডমিন প্যানেল**\n\nঅবস্থা: **${statusText}**\nচ্যানেল আইডি: \`${CHANNEL_ID}\`\nবর্তমান লেভেল: **Level ${currentLevel}**\nরানিং পিরিয়ড: \`${currentPeriodDisp}\``, { parse_mode: 'Markdown', ...options });
}

// Callback Handler
bot.on('callback_query', async (query) => {
  if (query.message.chat.id !== ADMIN_ID) return;

  if (query.data === 'toggle_bot') {
    if (isBotRunning) {
      isBotRunning = false;
      if (marketLoopInterval) clearInterval(marketLoopInterval);
      currentLevel = 1;
      lastPredictedPeriod = null;
      lastPredictionSignal = null;
      await bot.answerCallbackQuery(query.id, { text: 'বট বন্ধ করা হয়েছে।' });
    } else {
      isBotRunning = true;
      currentLevel = 1;
      await bot.answerCallbackQuery(query.id, { text: 'সিগন্যাল ইঞ্জিন চালু হয়েছে!' });
      
      await processAndPublishSignal();
      marketLoopInterval = setInterval(async () => {
        if (isBotRunning) await processAndPublishSignal();
      }, 15000); // Check API every 15 sec for smooth 30s period cycle
    }
    sendAdminPanel(query.message.chat.id);
  } else if (query.data === 'refresh_status') {
    await bot.answerCallbackQuery(query.id, { text: 'স্ট্যাটাস আপডেট' });
    sendAdminPanel(query.message.chat.id);
  }
});

bot.on('polling_error', (error) => console.log(`Polling: ${error.code || error.message}`));
process.on('uncaughtException', (err) => console.error('Uncaught:', err.message));
process.on('unhandledRejection', (reason) => console.error('Unhandled:', reason));
