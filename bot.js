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
        const referralLink = `https://t.me/leul50_bot?start=${userId}`;
        await collection.insertOne({ userId, chatId, referralLink });
        bot.sendMessage(chatId, `Welcome! Your referral link: ${referralLink}`);
    } else {
        bot.sendMessage(chatId, `Welcome back! Your referral link: ${user.referralLink}`);
    }
});

bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    const helpMessage = `
    Commands:
    /start - Get your referral link.
    /help - Display help.
    `;
    bot.sendMessage(chatId, helpMessage);
});

process.on('SIGINT', async () => {
    console.log('Shutting down...');
    await client.close();
    process.exit();
});
