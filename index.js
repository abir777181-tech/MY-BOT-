const TelegramBot = require('node-telegram-bot-api');
const http = require('http');
const axios = require('axios');

// 🔑 আপনার ক্রেডেনশিয়ালস
const BOT_TOKEN = '8673480574:AAHZQ7kjq5e9oTGX6cShLT0TGkWxojzXkCQ';
const ADMIN_ID = 8514764458; 

// 🎯 প্রাইভেট টেলিগ্রাম চ্যানেল আইডি
const CHANNEL_ID = -1004308584896; 

// 🌐 WinGo 30S API Endpoint
const API_URL = 'https://draw.ar-lottery01.com/WinGo/WinGo_30S/GetHistoryIssuePage.json';

const bot = new TelegramBot(BOT_TOKEN, { 
  polling: {
    interval: 300,
    autoStart: true,
    params: { timeout: 10 }
  } 
});

let isBotRunning = false;
let marketLoopInterval = null;

// 🎯 5-STEP MARTINGALE & TRACKING STATE
let currentLevel = 1; 
const MAX_LEVEL = 5;

let lastPredictedPeriod = null;
let lastPredictionSignal = null; // 'BIG' or 'SMALL'

// Render Keep-Alive Server
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('WinGo Advanced Pattern Engine Active\n');
}).listen(PORT, () => console.log(`Server listening on port ${PORT}`));

// 📡 API থেকে লাইভ হিস্ট্রি আনার ফাংশন
async function fetchGameHistory() {
  try {
    const response = await axios.get(API_URL, {
      params: { pageNo: 1, pageSize: 10 },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Origin': 'https://draw.ar-lottery01.com',
        'Referer': 'https://draw.ar-lottery01.com/'
      },
      timeout: 5000
    });

    if (response.data && response.data.data && Array.isArray(response.data.data.list)) {
      return response.data.data.list;
    } else if (Array.isArray(response.data.list)) {
      return response.data.list;
    } else if (Array.isArray(response.data)) {
      return response.data;
    }
    return null;
  } catch (err) {
    console.error('API Fetch Error:', err.message);
    return null;
  }
}

// 🧠 প্রফেশনাল প্যাটার্ন ও ট্রেন্ড এনালাইসিস ইঞ্জিন (Advanced Prediction)
function analyzeAdvancedPatterns(historyList) {
  // হিস্ট্রি পার্স করা (০-৪ = SMALL, ৫-৯ = BIG)
  const history = historyList.slice(0, 10).map(item => {
    if (item.bigSmall) return item.bigSmall.toUpperCase();
    let num = item.resultNumber !== undefined ? parseInt(item.resultNumber) : parseInt(item.number);
    if (!isNaN(num)) return num >= 5 ? 'BIG' : 'SMALL';
    return Math.random() < 0.5 ? 'BIG' : 'SMALL';
  });

  const p0 = history[0]; // সর্বশেষ রেজাল্ট
  const p1 = history[1]; 
  const p2 = history[2]; 
  const p3 = history[3]; 

  // ১. 1x1 Zig-Zag / Alternate Pattern (BIG -> SMALL -> BIG -> SMALL)
  if (p0 !== p1 && p1 !== p2 && p2 !== p3) {
    return p0 === 'BIG' ? 'SMALL' : 'BIG'; // পরবর্তী চাল প্রেডিক্ট
  }

  // ২. 2x2 Double Bounce Pattern (BIG -> BIG -> SMALL -> SMALL)
  if (p0 === p1 && p2 === p3 && p0 !== p2) {
    return p0; // ২x২ প্যাটার্ন পূর্ণ করতে বর্তমান ট্রেন্ড ধরে রাখা
  }

  // ৩. Overbought / Trend Reversal (পরপর ৪টি বা তার বেশি একই রেজাল্ট আসলে বিপরীত চাল)
  let consecutiveCount = 1;
  for (let i = 0; i < history.length - 1; i++) {
    if (history[i] === history[i + 1]) {
      consecutiveCount++;
    } else {
      break;
    }
  }

  if (consecutiveCount >= 4) {
    return p0 === 'BIG' ? 'SMALL' : 'BIG'; // ড্রাগন ব্রেক ধরে রিভার্সাল সিগন্যাল
  }

  // ৪. Streak Continuation (পরপর ২টি বা ৩টি একই আসলে ট্রেন্ড ফলো)
  if (consecutiveCount >= 2) {
    return p0;
  }

  // ৫. Ratio Based Smart Selection (গত ১০ গেমের মেজোরিটি কাউন্ট)
  const bigCount = history.filter(x => x === 'BIG').length;
  if (bigCount >= 7) return 'SMALL';
  if (bigCount <= 3) return 'BIG';

  // ডিফোল্ট অল্টারনেট
  return p0 === 'BIG' ? 'SMALL' : 'BIG';
}

// ⏱️ সিগন্যাল প্রসেসিং, ভেরিফিকেশন ও পাবলিশিং
async function processAndPublishSignal() {
  if (!isBotRunning) return;

  const history = await fetchGameHistory();

  if (!history || history.length === 0) {
    console.log('⚠️ API থেকে ডেটা পাওয়া যায়নি, পরবর্তী চক্রের জন্য অপেক্ষা...');
    return;
  }

  const latestData = history[0]; // রানিং কমপ্লিটেড গেম
  const latestPeriod = String(latestData.issue || latestData.period || latestData.issueNo);

  // 🔍 ১. আগের সিগন্যাল অটো ভেরিফিকেশন (Win / Loss Calculation)
  if (lastPredictedPeriod && lastPredictionSignal) {
    if (latestPeriod === lastPredictedPeriod) {
      const num = latestData.resultNumber !== undefined ? parseInt(latestData.resultNumber) : parseInt(latestData.number);
      const actualResult = num >= 5 ? 'BIG' : 'SMALL';

      if (lastPredictionSignal === actualResult) {
        // WIN -> লেভেল ১-এ রিসেট
        console.log(`✅ [WIN] Period: ${latestPeriod} | Predicted: ${lastPredictionSignal} \vert{} Actual:${actualResult}`);
        currentLevel = 1;
      } else {
        // LOSS -> Step + 1 (Max 5 Step)
        console.log(`❌ [LOSS] Period: ${latestPeriod} | Predicted: ${lastPredictionSignal} \vert{} Actual:${actualResult}`);
        if (currentLevel < MAX_LEVEL) {
          currentLevel++;
        } else {
          currentLevel = 1; // ৫ম স্টেপ শেষে ১ নম্বরে রিসেট
        }
      }
    }
  }

  // 🎯 ২. পরবর্তী পিরিয়ড জেনারেট
  const nextPeriod = String(BigInt(latestPeriod) + 1n);

  // 🎯 ৩. স্মার্ট প্যাটার্ন এনালাইসিস করে প্রেডিকশন
  const predictedDecision = analyzeAdvancedPatterns(history);
  const formattedSignal = predictedDecision === 'BIG' ? 'BIG 🟢' : 'SMALL 🔴';

  // স্টেট আপডেট
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
    console.error('মেসেজ পাঠাতে সমস্যা:', err.message);
  }
}

// 🛠️ এডমিন প্যানেল
bot.onText(/\/admin|এডমিন প্যানেল|\/start/, (msg) => {
  if (msg.chat.id !== ADMIN_ID) return;
  sendAdminPanel(msg.chat.id);
});

function sendAdminPanel(chatId) {
  const statusText = isBotRunning ? '🟢 গেম মার্কেট সিগন্যাল চালু' : '🔴 সিগন্যাল বন্ধ আছে';

  const options = {
    reply_markup: {
      inline_keyboard: [
        [{ text: isBotRunning ? '⏸️ BOT OFF' : '▶️ BOT ON', callback_data: 'toggle_bot' }],
        [{ text: '🔄 রিফ্রেশ স্ট্যাটাস', callback_data: 'refresh_status' }]
      ]
    }
  };

  const currentPeriodDisp = lastPredictedPeriod ? lastPredictedPeriod : 'API অটো সিঙ্ক সক্রিয়...';
  bot.sendMessage(chatId, `🛠 **গেম মার্কেট এডমিন প্যানেল (Pattern Engine)**\n\nঅবস্থা: **${statusText}**\nচ্যানেল আইডি: \`${CHANNEL_ID}\`\nবর্তমান লেভেল: **Level ${currentLevel}**\nরানিং পিরিয়ড: \`${currentPeriodDisp}\``, { parse_mode: 'Markdown', ...options });
}

// বাটন হ্যান্ডলিং
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
      await bot.answerCallbackQuery(query.id, { text: 'অ্যাডভান্সড প্যাটার্ন সিগন্যাল চালু হয়েছে!' });
      
      await processAndPublishSignal();
      marketLoopInterval = setInterval(async () => {
        if (isBotRunning) await processAndPublishSignal();
      }, 30000);
    }
    sendAdminPanel(query.message.chat.id);
  } else if (query.data === 'refresh_status') {
    await bot.answerCallbackQuery(query.id, { text: 'স্ট্যাটাস আপডেট' });
    sendAdminPanel(query.message.chat.id);
  }
});

// এরর হ্যান্ডলিং
bot.on('polling_error', (error) => {
  console.log(`Auto Recovered: ${error.code || error.message}`);
});

process.on('uncaughtException', (err) => console.error('Uncaught Exception:', err.message));
process.on('unhandledRejection', (reason) => console.error('Unhandled Rejection:', reason));
