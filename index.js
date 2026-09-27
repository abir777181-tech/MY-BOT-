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

// Keep-Alive Server
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('WinGo API Dynamic Engine Active\n');
}).listen(PORT, () => console.log(`Server listening on port ${PORT}`));

// 📡 API থেকে সর্বশেষ লাইভ হিস্ট্রি ফেচ করার ফাংশন
async function fetchGameHistory() {
  try {
    const response = await axios.get(API_URL, {
      params: { pageNo: 1, pageSize: 10 },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
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

// 🧠 ১০টি হিস্ট্রি ডেটা বিশ্লেষণ করে হাই-একুরেসি সিগন্যাল অ্যালগরিদম
function analyzeHistoryPattern(historyList) {
  // হিস্ট্রি পার্সিং (০-৪ = SMALL, ৫-৯ = BIG)
  const parsedList = historyList.slice(0, 10).map(item => {
    if (item.bigSmall) return item.bigSmall.toUpperCase();
    let num = item.resultNumber !== undefined ? parseInt(item.resultNumber) : parseInt(item.number);
    if (!isNaN(num)) return num >= 5 ? 'BIG' : 'SMALL';
    return Math.random() < 0.5 ? 'BIG' : 'SMALL';
  });

  // ১. Trend Streak (পরপর ৩টা বা তার বেশি একই আসলে ড্রাগন ট্রেন্ড ফলো করবে)
  const last1 = parsedList[0];
  const last2 = parsedList[1];
  const last3 = parsedList[2];

  if (last1 === last2 && last2 === last3) {
    return last1; // Trend continuation
  }

  // ২. Alternate Bounce (BIG -> SMALL -> BIG হলে এর পরেরটা SMALL আসার সম্ভাবনা বেশি)
  if (last1 !== last2 && last2 !== last3) {
    return last1 === 'BIG' ? 'SMALL' : 'BIG';
  }

  // ৩. Majority Ratio Analysis (গত ১০টি গেমের মধ্যে যেটি কম এসেছে সেটি বা ট্রেন্ড রিভার্সাল)
  const bigCount = parsedList.filter(x => x === 'BIG').length;
  if (bigCount >= 7) return 'SMALL'; // Overbought BIG -> Predict SMALL
  if (bigCount <= 3) return 'BIG';   // Overbought SMALL -> Predict BIG

  // ৪. Default Smart Alternate
  return last1 === 'BIG' ? 'SMALL' : 'BIG';
}

// ⏱️ সিগন্যাল প্রসেসিং, রেজাল্ট ভেরিফিকেশন এবং পাবলিশ
async function processAndPublishSignal() {
  if (!isBotRunning) return;

  const history = await fetchGameHistory();

  if (!history || history.length === 0) {
    console.log('API ডেটা মেলেনি, পরবর্তী সাইকেলের জন্য অপেক্ষা করা হচ্ছে...');
    return;
  }

  const latestData = history[0]; // সর্বশেষ যে পিরিয়ডের খেলা শেষ হলো
  const latestPeriod = String(latestData.issue || latestData.period || latestData.issueNo);

  // 🔍 ১. আগের পিরিয়ডের সিগন্যাল উইন হলো নাকি লস হলো চেক
  if (lastPredictedPeriod && lastPredictionSignal) {
    if (latestPeriod === lastPredictedPeriod) {
      const num = latestData.resultNumber !== undefined ? parseInt(latestData.resultNumber) : parseInt(latestData.number);
      const actualResult = num >= 5 ? 'BIG' : 'SMALL';

      if (lastPredictionSignal === actualResult) {
        // WIN -> ১ নম্বরে রিসেট
        console.log(`✅ WIN! Period: ${latestPeriod} \vert{} Signal:${lastPredictionSignal} | Result: ${actualResult}`);         currentLevel = 1;       } else {         // LOSS -> Step 1 বৃদ্ধি (সর্বোচ্চ 5 Step)         console.log(`❌ LOSS! Period: ${latestPeriod} | Signal: ${lastPredictionSignal} \vert{} Result:${actualResult}`);
        if (currentLevel < MAX_LEVEL) {
          currentLevel++;
        } else {
          currentLevel = 1; // ৫ম স্টেপ শেষে রিসেট
        }
      }
    }
  }

  // 🎯 ২. পরবর্তী পিরিয়ড নম্বর জেনারেট
  const nextPeriod = String(BigInt(latestPeriod) + 1n);

  // 🎯 ৩. ১০-হিস্ট্রি এনালাইসিস করে সিগন্যাল তৈরি
  const predictedDecision = analyzeHistoryPattern(history);
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

  const currentPeriodDisp = lastPredictedPeriod ? lastPredictedPeriod : 'API থেকে সিঙ্ক হচ্ছে...';
  bot.sendMessage(chatId, `🛠 **গেম মার্কেট এডমিন প্যানেল (Auto API Verification)**\n\nঅবস্থা: **${statusText}**\nচ্যানেল আইডি: \`${CHANNEL_ID}\`\nবর্তমান লেভেল: **Level ${currentLevel}**\nরানিং পিরিয়ড: \`${currentPeriodDisp}\``, { parse_mode: 'Markdown', ...options });
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
      await bot.answerCallbackQuery(query.id, { text: 'API এনালাইসিস সিগন্যাল চালু হয়েছে!' });
      
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
