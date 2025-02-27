import TelegramBot from 'node-telegram-bot-api';
import { MongoClient } from 'mongodb';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN;
const mongoUri = process.env.MONGO_URI;
const dbName = process.env.DB_NAME;
const collectionName = process.env.COLLECTION_NAME;

const bot = new TelegramBot(token, { polling: true });
const client = new MongoClient(mongoUri);

// Connect to MongoDB
async function connectToMongo() {
    try {
        await client.connect();
        console.log('Connected to MongoDB');
    } catch (err) {
        console.error('Failed to connect to MongoDB:', err);
    }
}
connectToMongo();

// Language messages
const messages = {
    en: { welcome: "Welcome to simplemoneymaker Bot! 🎉", selectLanguage: "Please select your preferred language:",
        referralLink: "Your unique referral link: ",
        unlockCourse: "Unlock Course",
        competitions: "Competitions",
        referralProgress: "Referral Progress",
        help: "Help",
        support: "Contact Support",
        cashout: "Cashout",
        needReferral: "You need to refer 5 people to unlock the course.",
        selectBank: "Please choose your bank:",
        enterAccount: "Please enter your account number:",
        enterPhone: "Please enter your phone number:" },
    am: { welcome: "እንኳን ወደ በቀላሉ ገንዘብ መሰብሰቢያመሰብሰቢያ ቦት በደህና መጡ! 🎉",
        selectLanguage: "እባኮትን የሚወዷቸውን ቋንቋ ይምረጡ፡",
        referralLink: "የእርስዎ ልዩ የማጋረጃ አገናኝ፡ ",
        unlockCourse: "ኮርስ ይክፈቱ",
        competitions: "ውድድሮች",
        referralProgress: "የማጋረጃ ሂደት",
        help: "እርዳታ",
        support: "የደጋፊ መረጃ",
        cashout: "ገንዘብ ያውጡ",
        needReferral: "ኮርሱን ለመክፈት 5 ሰዎችን ማጋረጃ አለቦት።",
        selectBank: "እባኮትን የሚወዷቸውን ባንክ ይምረጡ፡",
        enterAccount: "እባኮትን የባንክ መለያ ቁጥር ያስገቡ፡",
        enterPhone: "እባኮትን የስልክ ቁጥርዎን ያስገቡ፡" },
    om: { welcome: "Baga nagaan dhuftan! 🎉",selectLanguage: "Mee afaan filadhu:",
        referralLink: "Linkii kee addaa: ",
        unlockCourse: "Koorso banuu",
        competitions: "Tapha dorgommii",
        referralProgress: "Sadarkaa maqa-gaggeessuu",
        help: "Gargaarsa",
        support: "Gargaarsa qunnamuu",
        cashout: "Mallaqa baasuu",
        needReferral: "Koorso banuf namoota 5 ergaa qabdu.",
        selectBank: "Mee baankii kee filadhu:",
        enterAccount: "Mee lakkoofsa mana baankii kee galchi:",
        enterPhone: "Mee lakkoofsa bilbila kee galchi:" }
};

// Store user cashout data temporarily
let cashoutData = {};

// Function to send a welcome message based on language
async function sendWelcomeMessage(chatId, user) {
    const userLang = user?.language || 'en'; 
//const userLang = messages[lang] ? lang : 'en';
    bot.sendMessage(chatId, `${messages[userLang].welcome}\n\n${messages[userLang].referralLink}`);
}

// Handle /start command
bot.onText(/\/start(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const referrerId = match ? match[0] : null; // Extract referrer ID if present

    const db = client.db(dbName);
    const collection = db.collection(collectionName)

    try {
        let user = await collection.findOne({ userId });

        if (!user) {
            // Generate referral link
            const referralLink = (`https://t.me/DailyCash?start=${userId}`, { parse_mode: 'Markdown' });
            await collection.insertOne({ 
                userId, 
                chatId, 
                referralLink, 
                language: 'en', // Default language
                referralCount: 0,
                referrerId: referrerId ? parseInt(referrerId) : null // Store referrer ID if available
            });
     
            // Ask user to select language
            return bot.sendMessage(chatId, "Please select your preferred language:", {
                reply_markup: {
                    keyboard: [[{ text: 'English' }, { text: 'Amharic' }, { text: 'Oromo' }]],
                    resize_keyboard: true,
                    one_time_keyboard: true
                }
            });
        } 

        // Existing user: Retrieve stored language and send welcome message
        const userLang = user.language || 'en';
        bot.sendMessage(chatId, `${messages[userLang].welcome}\n\n${messages[userLang].referralLink} ${user.referralLink}`);

        // Show main menu
        return bot.sendMessage(chatId, 'Choose an option:', {
            reply_markup: {
                keyboard: [
                    
                    [{ text: 'Unlock Course' }, { text: 'Competitions' }],
                    [{ text: 'Referral Progress' }, { text: 'Language' }],
                    [{ text: 'Contact Support' }, { text: 'Cashout' }],
                    [{ text: 'Complete Task' }]  
                ],
                resize_keyboard: true,
                one_time_keyboard: false
            }
        });

    } catch (error) {
        console.error("Error in /start command:", error);
        bot.sendMessage(chatId, "An error occurred. Please try again later.");
    }
    
});

// Language selection handler
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text.toLowerCase();

    const languages = {
        english: 'en',
        amharic: 'am',
        oromo: 'or'
    };

    if (languages[text]) {
        const db = client.db(dbName);
        const collection = db.collection(collectionName);
        await collection.updateOne({ userId }, { $set: { language: languages[text] } });

        bot.sendMessage(chatId, `Language set to ${text.charAt(0).toUpperCase() + text.slice(1)}! 🎉`);
        
        // Proceed to show main menu
        return bot.sendMessage(chatId, 'Choose an option:', {
            reply_markup: {
                keyboard: [
                    [{ text: 'Unlock Course' }, { text: 'Competitions' }],
                    [{ text: 'Referral Progress' }, { text: 'Language' }],
                    [{ text: 'Contact Support' }, { text: 'Cashout' }],
                    [{ text: 'Complete Task' }]  
                ],
                resize_keyboard: true,
                one_time_keyboard: false
            }
        });
    }
});

// Handle "Complete Task" button
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text;

    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    let user = await collection.findOne({ userId });

    if (text === 'Complete Task') {
        if (user && user.taskCompleted) {
            return bot.sendMessage(chatId, "✅ You have already completed this task and received your reward.");
        }

        // Simulate task completion (You can replace this with real task verification logic)
        bot.sendMessage(chatId, "🎯 Task: Join our Telegram channel and click 'Done' when finished.", {
            reply_markup: {
                inline_keyboard: [[{ text: "Join Channel", url: "https://t.me/cheapnetn" }],
                 [{ text: "Join youtube", url: "https://youtu.be/3n1KPBdZupk" }], 
                 [{ text: "Done", callback_data: "task_done" }]
            ]}
        });
    }
});
// Handle "Done" button click
bot.on('callback_query', async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const userId = callbackQuery.from.id;
    const data = callbackQuery.data;

    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    let user = await collection.findOne({ userId });

    if (data === "task_done") {
        if (user && user.taskCompleted) {
            return bot.answerCallbackQuery(callbackQuery.id, { text: "✅ You have already completed this task." });
        }

        // Reward user with 5 Birr
        await collection.updateOne(
            { userId },
            { $set: { taskCompleted: true }, $inc: { balance: 5 } }
        );

        bot.answerCallbackQuery(callbackQuery.id, { text: "🎉 Task completed! You earned 5 Birr." });
        bot.sendMessage(chatId, "💰 5 Birr has been added to your balance!");
    }
});
// Handle user messages (including language selection)
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text;

    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    try {
        let user = await collection.findOne({ userId });

        if (['English', 'Amharic', 'Oromo'].includes(text)) {
            let selectedLang = text === 'Amharic' ? 'am' : text === 'Oromo' ? 'om' : 'en';
            await collection.updateOne({ userId }, { $set: { language: selectedLang } });

            bot.sendMessage(chatId, messages[selectedLang].welcome);
            return;
        }

        let userLang = user ? user.language : 'en';

        if (text === 'Cashout') {
            bot.sendMessage(chatId, 'Please choose your bank:', {
                reply_markup: {
                    keyboard: [
                        [{ text: 'CBEBirr' }, { text: 'Commercial Bank of Ethiopia (CBE)' }],
                        [{ text: 'M-Pesa' }, { text: 'telebirr' }]
                    ],
                    resize_keyboard: true,
                    one_time_keyboard: true
                }
            });
            cashoutData[chatId] = { userId };
        } else if (['CBEBirr', 'Commercial Bank of Ethiopia (CBE)', 'M-Pesa', 'telebirr'].includes(text)) {
            if (!cashoutData[chatId]) return;
            cashoutData[chatId].bank = text;

            bot.sendMessage(chatId, text === 'Commercial Bank of Ethiopia (CBE)' ? 'Please enter your account number:' : 'Please enter your phone number:');
        } else if (cashoutData[chatId] && cashoutData[chatId].bank) {
            cashoutData[chatId].accountNumber = text;
            cashoutData[chatId].amount = 10;
            cashoutData[chatId].currency = 'ETB';

            const bankCodes = {
                'CBEBirr': 128, 'Commercial Bank of Ethiopia (CBE)': 946, 'M-Pesa': 266, 'telebirr': 855
            };

            const bankCode = bankCodes[cashoutData[chatId].bank];

            const payload = {
                account_name: 'User',
                account_number: cashoutData[chatId].accountNumber,
                reference: `InviteBot${Math.floor(Math.random() * 1000)}`,
                amount: cashoutData[chatId].amount,
                currency: cashoutData[chatId].currency,
                bank_code: bankCode
            };

            try {
                const response = await axios.post('http://chapa.payment.api.codenilesolutions.com/api/transfer', payload);
                if (response.data.message === 'Transfer successful') {
                    bot.sendMessage(chatId, `🎉 Cashout successful! Transaction ID: ${response.data.details}`);
                } else {
                    bot.sendMessage(chatId, `Cashout failed: ${response.data.message}`);
                }
            } catch (error) {
                let errorMessage = 'Cashout failed: ';
                if (error.response) errorMessage += error.response.data.error || 'Unknown error';
                else errorMessage += 'No response from server.';
                bot.sendMessage(chatId, errorMessage);
            }

            delete cashoutData[chatId];
        }

        if (text === 'Unlock Course') {
            const db = client.db(dbName);
        const collection = db.collection(collectionName);
        const userId = msg.from.id;
        let user = await collection.findOne({ userId });


            if (user && user.referralCount >= 5) {
                bot.sendMessage(chatId, '🎉 You unlocked the course! [Access it here](http://example.com/course)', { parse_mode: 'Markdown' });
            } else {
                bot.sendMessage(chatId, 'You need to refer 5 people to unlock the course.');
            }
        } else if (text === 'Competitions') {
            bot.sendMessage(chatId, 'Upcoming competitions:\n1. [Competition 1](http://example.com/competition1)\n2. [Competition 2](http://example.com/competition2)', { parse_mode: 'Markdown' });
        } else if (text === 'Referral Progress') {
            const db = client.db(dbName);
        const collection = db.collection(collectionName);
        const userId = msg.from.id;
        console.log(`Checking referral progress for userId: ${userId}`);

        let user = await collection.findOne({ userId });
        console.log("User data from DB:", user);
        
        const referralCount = user && user.referralCount ? user.referralCount : 0;
            bot.sendMessage(chatId, `You have referred ${referralCount} people.`);
        }
    } catch (error) {
        console.error("Error handling message:", error);
        bot.sendMessage(chatId, "nopeAn error occurred. Please try again later.");
    }
});

process.on('SIGINT', async () => {
    console.log('Shutting down...');
    await client.close();
    process.exit();
});