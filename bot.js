const TelegramBot = require('node-telegram-bot-api');
const { MongoClient } = require('mongodb');

// Replace with your Telegram Bot API token
const token = '7465285349:AAGzhl1kALJJ9dhfkmbZulc6o267uu6To0g';
const bot = new TelegramBot(token, { polling: true });

// MongoDB connection URI
const mongoUri = 'mongodb+srv://kukuassefa18:exRsElJdQ5Mu99l8@telegrambotapi.x69ku.mongodb.net/?retryWrites=true&w=majority&appName=TelegramBotAPI';
const client = new MongoClient(mongoUri);
const dbName = 'mybot';
const collectionName = 'users';

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
        // Create a new user with a dynamic referral link
        const referralCode = generateRandomString(8); 
        const referralLink = `https://t.me/leul50_bot?start=${userId}`;
        await collection.insertOne({ userId, chatId, referralLink });
        bot.sendMessage(chatId, `Welcome! Your referral link: ${referralLink}`);
    } else {
        bot.sendMessage(chatId, `Welcome back! Your referral link: ${user.referralLink}`);
    }
});

bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    // Check if the user already exists in the database
    let user = await collection.findOne({ userId });
    if (!user) {
        // Create a new user with a dynamic referral link
        const referralCode = generateRandomString(8); 
        const referralLink = `https://t.me/leul50_bot?start=${userId}`;
        await collection.insertOne({ userId, chatId, referralLink });

        // Send a message with two buttons
        bot.sendMessage(chatId, 'Welcome! Choose an action:', {
            reply_markup: {
                keyboard: [
                    [{ text: 'Generate URL' }, { text: 'Explore' }]
                ],
                resize_keyboard: true,
                one_time_keyboard: true
            }
        });
    } else {
        bot.sendMessage(chatId, `Welcome back! Your referral link: ${user.referralLink}`);
    }
});


bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    const helpMessage = `
    Commands:
    /start - Get your referral link.
    /referrals - List all referrals (for admin use).
    `;
    bot.sendMessage(chatId, helpMessage);
});

process.on('SIGINT', async () => {
    console.log('Shutting down...');
    await client.close();
    process.exit();
});
