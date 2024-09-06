const TelegramBot = require('node-telegram-bot-api');
const { MongoClient } = require('mongodb');
require('dotenv').config(); // Load .env file

// Load environment variables
const token = process.env.TELEGRAM_BOT_TOKEN;
const mongoUri = process.env.MONGO_URI;
const dbName = process.env.DB_NAME;
const collectionName = process.env.COLLECTION_NAME;

const bot = new TelegramBot(token, { polling: true });
const client = new MongoClient(mongoUri);

async function connectToMongo() {
    try {
        await client.connect();
        console.log('Connected to MongoDB');
    } catch (err) {
        console.error('Failed to connect to MongoDB:', err);
    }
}

connectToMongo();

function generateRandomString(length) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    // Check if the user already exists in the database
    let user = await collection.findOne({ userId });
    if (!user) {
        
        const referralLink = `https://t.me/CodeReferrer_bot?start=${userId}`;
        await collection.insertOne({ userId, chatId, referralLink });
        bot.sendMessage(chatId, `Welcome to CodeReferrer Bot! 🎉

            This bot is here to help you grow your network and unlock exciting opportunities in the world of programming! Here's what you can do with CodeReferrer Bot:
            
            1. **Get Your Referral Link**: Start referring others with your unique link and earn rewards. 🌟
            2. **Unlock a Programming Course**: Refer 5 people and gain access to a top-notch online programming course for a week! 📚
            3. **Find Programming Competitions**: Stay updated on upcoming programming competitions and showcase your skills! 🏆
            4. **Check Referral Progress**: Track how many people you've referred and see your progress. 📊
            5. **Contact Support**: Need help? Reach out to our support team for assistance. 📧
            
            Your unique referral link: ${referralLink}
            
            To get started, just tap on the buttons below and explore the options. If you need help, type /help anytime.
            
            Happy referring and coding! 🚀`);
    } else {
        bot.sendMessage(chatId, `Welcome back to CodeReferrer Bot! 🎉\n\nHere's your referral link: ${user.referralLink}\n\nUse the buttons below to:\n- Unlock a programming course\n- Find programming competitions\n- Check your referral progress\n- Get help or contact support`);
    }

    // Send a message with buttons for additional actions
    bot.sendMessage(chatId, 'Choose an option:', {
        reply_markup: {
            keyboard: [
                [{ text: 'Unlock Course' }, { text: 'Competitions' }],
                [{ text: 'Referral Progress' }, { text: 'Help' }],
                [{ text: 'Contact Support' }]
            ],
            resize_keyboard: true,
            one_time_keyboard: true
        }
    });
});


// Handle button presses
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (text === 'Unlock Course') {
        const db = client.db(dbName);
        const collection = db.collection(collectionName);
        const userId = msg.from.id;

        let user = await collection.findOne({ userId });
        if (user && user.referralCount >= 5) {
            bot.sendMessage(chatId, 'Congratulations! You have unlocked access to the programming course for a week. [Here’s the link to the course](http://example.com/course)', { parse_mode: 'Markdown' });
        } else {
            bot.sendMessage(chatId, 'You need to refer 5 people to unlock the course.');
        }
    } else if (text === 'Competitions') {
        bot.sendMessage(chatId, 'Here are some upcoming programming competitions:\n1. [Competition 1](http://example.com/competition1)\n2. [Competition 2](http://example.com/competition2)');
    } else if (text === 'Referral Progress') {
        const db = client.db(dbName);
        const collection = db.collection(collectionName);
        const userId = msg.from.id;

        let user = await collection.findOne({ userId });
        if (user) {
            bot.sendMessage(chatId, `You have referred ${user.referralCount} people.`);
        } else {
            bot.sendMessage(chatId, 'You have not started referring anyone yet.');
        }
    } else if (text === 'Help') {
        const helpMessage = `
        Commands:
        /start - Get your referral link and choose an action.
        /help - Display help.
        `;
        bot.sendMessage(chatId, helpMessage);
    } else if (text === 'Contact Support') {
        bot.sendMessage(chatId, 'For support, please contact [support@example.com](mailto:support@example.com).');
    }
});

process.on('SIGINT', async () => {
    console.log('Shutting down...');
    await client.close();
    process.exit();
});
