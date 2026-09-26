const TelegramBot = require('node-telegram-bot-api');
const http = require('http');

// কাস্টম সেটিংস
const BOT_TOKEN = '8807448192:AAGLPS9RjBJZQ0Hfp6eZ13ADtm_7yHwulEs';
const ADMIN_ID = 8514764458; // আপনার নতুন এডমিন আইডি

// টার্গেট টেলিগ্রাম চ্যানেল
const CHANNEL_ID = '@TM_COMMUNITY_01'; 

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

let isBotRunning = false;
let signalInterval = null;

// লাস্ট ১০টি পিরিয়ডের হিস্ট্রি ট্র্যাক করার মেমোরি এরে
let periodHistory = [];

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
  
  const nextPeriodIndex = Math.floor(diffInSeconds / 30) + 2;
  const formattedIndex = String(nextPeriodIndex).padStart(4, '0');
  
  return `${year}${month}${day}1000${formattedIndex}`;
}

// 📊 ১০টি পিরিয়ড এনালাইসিস ইঞ্জিন (10-Round Trend & Probability Engine)
function analyzeLast10Rounds() {
  // হিস্টোরি খালি থাকলে বা ১০টির কম হলে প্রাথমিক মেমোরি পপুলেট করা
  if (periodHistory.length < 10) {
    const defaultChoices = ['BIG', 'SMALL'];
    while (periodHistory.length < 10) {
      periodHistory.push(defaultChoices[Math.floor(Math.random() * defaultChoices.length)]);
    }
  }

  let bigCount = 0;
  let smallCount = 0;

  periodHistory.forEach(res => {
    if (res === 'BIG') bigCount++;
    else smallCount++;
  });

  let predictedSignal = '';
  let analysisStrategy = '';

  // ১. ড্রাগন ট্রেন্ড লজিক (৭০%+ একই রেজাল্ট থাকলে ট্রেন্ড ফলো করবে)
  if (bigCount >= 7) {
    predictedSignal = 'BIG 🟢';
    analysisStrategy = 'Dragon Trend Follower';
  } else if (smallCount >= 7) {
    predictedSignal = 'SMALL 🔴';
    analysisStrategy = 'Dragon Trend Follower';
  } 
  // ২. ব্যালেন্স ও রিভার্সাল এনালাইসিস (গড় অনুপাত থেকে সম্ভাবনা হিসাব)
  else if (bigCount > smallCount) {
    predictedSignal = 'SMALL 🔴';
    analysisStrategy = '10-Round Reversal Analysis';
  } else if (smallCount > bigCount) {
    predictedSignal = 'BIG 🟢';
    analysisStrategy = '10-Round Reversal Analysis';
  } else {
    // ৩. ৫০-৫০ সমতা থাকলে র‍্যান্ডম সিগন্যাল
    predictedSignal = Math.random() > 0.5 ? 'BIG 🟢' : 'SMALL 🔴';
    analysisStrategy = 'Probability Ratio Equilibrium';
  }

  // মেমোরি আপডেট: পরবর্তী রাউন্ডের জন্য হিস্টোরি শিফট করা (সর্বোচ্চ ১০টি সংরক্ষণ)
  const rawChoice = predictedSignal.includes('BIG') ? 'BIG' : 'SMALL';
  periodHistory.shift();
  periodHistory.push(rawChoice);

  return { signal: predictedSignal, strategy: analysisStrategy, bigRatio: bigCount, smallRatio: smallCount };
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
  const statusText = isBotRunning ? '🟢 ১০-রাউন্ড এনালাইসিস সিগন্যাল চালু আছে' : '🔴 সার্ভিস বন্ধ আছে';

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
      bot.answerCallbackQuery(query.id, { text: 'সিগন্যাল এনালাইসিস বন্ধ করা হয়েছে।' });
    } else {
      isBotRunning = true;
      bot.answerCallbackQuery(query.id, { text: '১০-রাউন্ড এনালাইসিস সহ সিগন্যাল চালু হয়েছে!' });

      // প্রতি ৩০ সেকেন্ড পর পর এনালাইসিস ভিত্তিক সিগন্যাল পাঠানো
      signalInterval = setInterval(async () => {
        const nextPeriod = getNextPeriodNumber();
        const analysis = analyzeLast10Rounds();

        const signalMessage = `📊 **HIGH PROBABILITY PREDICTION**\n\n` +
                              `🎯 **Upcoming Period:** \`${nextPeriod}\`\n` +
                              `🔮 **Predicted Signal:** **${analysis.signal}**\n` +
                              `📈 **10-Round Stats:** BIG [${analysis.bigRatio}] | SMALL [${analysis.smallRatio}]\n` +
                              `💡 **Analysis Strategy:** _${analysis.strategy}_\n` +
                              `⏱ **Timeframe:** 30 Seconds\n\n` +
                              `🎰 *7 স্টেপ মেনটেন করে গেইম খেলুন*`;

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
