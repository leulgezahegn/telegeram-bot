const TelegramBot = require('node-telegram-bot-api');
const { MongoClient } = require('mongodb');
const axios = require('axios');
require('dotenv').config(); 

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
let cashoutData = {};
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    const db = client.db(dbName);
    const collection = db.collection(collectionName);

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
            6. **Cashout**: Convert your rewards to cash.
            
            Your unique referral link: ${referralLink}
            
            To get started, just tap on the buttons below and explore the options. If you need help, type /help anytime.
            
            Happy referring and coding! 🚀`);
    } else {
        bot.sendMessage(chatId, `Welcome back to CodeReferrer Bot! 🎉\n\nHere's your referral link: ${user.referralLink}\n\nUse the buttons below to:\n- Unlock a programming course\n- Find programming competitions\n- Check your referral progress\n- Get help or contact support`);
    }

    bot.sendMessage(chatId, 'Choose an option:', {
        reply_markup: {
            keyboard: [
                [{ text: 'Unlock Course' }, { text: 'Competitions' }],
                [{ text: 'Referral Progress' }, { text: 'Help' }],
                [{ text: 'Contact Support' }, { text: 'Cashout' }]
            ],
            resize_keyboard: true,
            one_time_keyboard: true
        }
    });
});


bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    if (text === 'Cashout') {
      
        bot.sendMessage(chatId, 'Please choose your bank:', {
            reply_markup: {
                keyboard: [
                    [{ text: 'CBEBirr' }, { text: 'Commercial Bank of Ethiopia (CBE)' }],
                    [{ text: 'M-Pesa' }, { text: 'telebirr' }],
                ],
                one_time_keyboard: true,
            },
        });
        cashoutData = { chatId };  
    } else if (['CBEBirr', 'M-Pesa', 'telebirr', 'Commercial Bank of Ethiopia (CBE)'].includes(text)) {
        cashoutData.bank = text;

        if (text === 'Commercial Bank of Ethiopia (CBE)') {
            bot.sendMessage(chatId, 'Please enter your account number:');
        } else {
            bot.sendMessage(chatId, 'Please enter your phone number:');
        }
    } else if (cashoutData.bank) {
        cashoutData.accountNumber = text; 
        cashoutData.amount = 10;  
        cashoutData.currency = 'ETB';

     
        const bankCodes = {
            'CBEBirr': 128,
            'Commercial Bank of Ethiopia (CBE)': 946,
            'M-Pesa': 266,
            'telebirr': 855,
        };

        const bankCode = bankCodes[cashoutData.bank];
        const accountName = 'User';  

       
        const payload = {
            account_name: accountName,
            account_number: cashoutData.accountNumber,
            reference: `InviteBot${Math.floor(Math.random() * 1000)}`, 
            amount: cashoutData.amount,
            currency: cashoutData.currency,
            bank_code: bankCode,
        };

 
        try {
            axios.post('http://chapa.payment.api.codenilesolutions.com/api/transfer', payload)
            .then(response => {
              const responseData = response.data;
          
              if (responseData.message === 'Transfer successful') {
                const details = responseData.details;
                bot.sendMessage(chatId, `🎉 Congrats! Your cashout was successful! 🎉\n\n💸 *Transaction ID:* ${details}\n\nKeep inviting more friends to unlock bigger rewards and exclusive access to our programming courses. The more you invite, the more you earn! 🚀💡`);
              } else {
                bot.sendMessage(chatId, `Cashout failed: ${responseData.message}`);
              }
            })
            .catch(error => {
              if (error.response && error.response.data) {
                const errorMessage = error.response.data.error || 'An unknown error occurred';
                bot.sendMessage(chatId, `Cashout failed: ${errorMessage}`);
              } else {
                bot.sendMessage(chatId, 'Cashout failed: An unknown error occurred');
              }
            });
          
        }  catch (error) {
        
            console.error('Error occurred during cashout:', error);
            console.error('Payload:', payload);

            let errorMessage = 'An error occurred while processing your cashout. Please try again later.';
            
            if (error.response) {
           
                errorMessage += `\nError Details: ${error.response.data.message || 'Unknown error'}`;
                console.error('Response Data:', error.response.data);
            } else if (error.request) {
              
                errorMessage += '\nNo response from the server.';
                console.error('Request:', error.request);
            } else {
             
                errorMessage += `\nError Message: ${error.message}`;
            }

            bot.sendMessage(chatId, errorMessage);
        }

        cashoutData = {};
    }
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
    } else if (text == 'Help') {
        const helpMessage = `
    Welcome to CodeReferrer Bot! 🤖
    
    Here are the available commands and features to help you get the most out of this bot:
    
    **Commands:**
    - **/start**: Use this command to receive your unique referral link and access all the features of the bot.
    - **/help**: Displays this help message with details on how to use the bot.
    
    **Features:**
    1. **Get Your Referral Link**: You can start referring others to the bot using the link provided when you first start. The more people you refer, the closer you get to unlocking rewards! 🌟
    2. **Unlock a Programming Course**: Refer at least 5 people to gain exclusive access to a top-notch programming course for one week. Keep track of your progress using the 'Referral Progress' button. 📚
    3. **Find Programming Competitions**: Stay informed about upcoming programming competitions to participate in and show your skills. 🏆
    4. **Check Referral Progress**: Use this feature to see how many people you have referred so far and how close you are to unlocking the course. 📊
    5. **Contact Support**: If you have any issues or questions, reach out to our support team for assistance. 📧
    
    **Button Options:**
    - **Unlock Course**: Use this button to check if you've referred enough people to unlock the programming course.
    - **Competitions**: Click to view a list of upcoming programming competitions.
    - **Referral Progress**: Track how many people you've referred.
    - **Help**: Brings up this help message again.
    - **Contact Support**: Get support if you encounter any issues or need help with the bot.
    
    If you need further assistance, feel free to contact our support team at [support@example.com](mailto:support@example.com).
    
    Happy referring and coding! 🚀
        `;
        bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
    }
    else if (text === 'Contact Support') {
        bot.sendMessage(chatId, 'If you need assistance or have any questions, please contact our support team at @SupportTeamUsername or email us at support@codereferrer.com. We are here to help you!');
    }
    
});

process.on('SIGINT', async () => {
    console.log('Shutting down...');
    await client.close();
    process.exit();
});
