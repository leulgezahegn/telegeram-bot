import TelegramBot from 'node-telegram-bot-api';
import { MongoClient } from 'mongodb';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN;
const mongoUri = process.env.MONGO_URI;
const dbName = process.env.DB_NAME;
const collectionName = process.env.COLLECTION_NAME;
const collectionName2 = process.env.COLLECTION_NAME2;

const adminId = process.env.ADMIN_ID;


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
         referralProgressMessage: "You have referred {count} people.",
        help: "Help",
        support: "Contact Support",
        cashout: "Cashout",
        needReferral: "You need to refer 5 people to unlock the course.",
        selectBank: "Please choose your bank:",
        enterAccount: "Please enter your account number:",
        enterPhone: "Please enter your phone number:" },
    am: { welcome: "እንኳን ወደ በቀላሉ ገንዘብ መሰብሰቢያ ቦት በደህና መጡ! 🎉",
        selectLanguage: "እባኮትን የሚወዷቸውን ቋንቋ ይምረጡ፡",
        referralLink: "የእርስዎ ልዩ የማጋረያ አገናኝ፡ ",
        unlockCourse: "ኮርስ ይክፈቱ",
        competitions: "ውድድሮች",
        referralProgress: "የማጋረያ ሂደት",
        referralProgressMessage: "እስካሁን ያስመረቀዎት ሰዎች {count} ናቸው።",
        help: "እርዳታ",
        support: "የድጋፍፍ መረጃ",
        cashout: "ገንዘብ ያውጡ",
        needReferral: "ኮርሱን ለመክፈት 5 ሰዎችን ማጋረጃ አለቦት።",
        selectBank: "እባኮትን የሚወዷቸውን ባንክ ይምረጡ፡",
        enterAccount: "እባኮትን የባንክ መለያ ቁጥር ያስገቡ፡",
        enterPhone: "እባኮትን የስልክ ቁጥርዎን ያስገቡ፡" },
    or: { welcome: "Baga nagaan dhuftan! 🎉",selectLanguage: "Mee afaan filadhu:",
        referralLink: "Linkii kee addaa: ",
        unlockCourse: "Koorso banuu",
        competitions: "Tapha dorgommii",
        referralProgress: "Sadarkaa maqa-gaggeessuu",
        referralProgressMessage: "Namoota {count} affeerte.",
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

function checkIfAdmin(userId) {
    return adminId.includes(userId);
}


// Handle /start command
bot.onText(/\/admin/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id; 


    if (!checkIfAdmin(userId)) {
        bot.sendMessage(chatId, "❌ You are not authorized to access the admin panel.");
        return;
    }
    bot.sendMessage(chatId, "🔧 Admin Panel", {
        reply_markup: {
            inline_keyboard: [
                [{ text: '📊 View Stats', callback_data: 'view_stats' }],
                [{ text: '🚫 Ban User', callback_data: 'ban_user' }],
                [{ text: '✅ Approve Payment', callback_data: 'approve_payment' }],
                [{ text: '📢 Send Notification', callback_data: 'send_notification' }],
                [{ text: '🛑 Approve Only YouTube Tasks', callback_data: 'approve_youtube' }],
                [{ text: "➕ Add Task", callback_data: "admin_add_task" }],
                [{ text: "📋 View Tasks", callback_data: "admin_view_tasks" }],
                [{ text: "❌ Delete Task", callback_data: "admin_delete_task" }]
            
            ]
        }
    });
   
});


let pendingAction = null;


bot.on('callback_query', async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const userId = callbackQuery.from.id;
    const data = callbackQuery.data;
    if (!checkIfAdmin(userId)) return; // Ensure only admin can proceed



    const db = client.db(dbName);
    const tasksCollection = db.collection(collectionName2)
    const collection = db.collection(collectionName);


    if (data === 'view_stats') {
        const userCount = await collection.countDocuments();
        bot.sendMessage(chatId, `👥 Total Users: ${userCount}`);
    } else if (data === 'ban_user') {
        bot.sendMessage(chatId, "Send the user ID to ban:");
    } else if (data === 'approve_payment') {
        bot.sendMessage(chatId, "Send the user ID for payment approval:");
    } else if (data === 'send_notification') {
        bot.sendMessage(chatId, "Send the message to broadcast:");
    } else if (data === 'approve_youtube') {
        bot.sendMessage(chatId, "🔹 YouTube tasks approval enabled.");
    }   
       else if (data === 'admin_add_task') {
        bot.sendMessage(chatId, "Send the task details in the format: `Title | URL | Reward`");
    } else if (data === 'admin_view_tasks') {

        const tasks = await tasksCollection.find().toArray();
        if (tasks.length === 0) {
            return bot.sendMessage(chatId, "⚠️ No tasks available.");
        }
        let taskList = tasks.map((task, index) => `*${index + 1}.* ${task.title} - [Open](${task.url}) - 💰 ${task.reward} Birr`).join("\n\n");
        return bot.sendMessage(chatId, `📋 *Task List:*\n\n${taskList}`, { parse_mode: "Markdown" });
        
    }if (data === "admin_delete_task") {
            const tasks = await tasksCollection.find().toArray();
            if (tasks.length === 0) {
                return bot.sendMessage(chatId, "⚠️ No tasks to delete.");
            }
    
            let inline_keyboard = tasks.map(task => [{ text: `🗑️ Delete ${task.title}`, callback_data: `delete_${task._id}` }]);
            return bot.sendMessage(chatId, "Select a task to delete:", { reply_markup: { inline_keyboard } });
        }
        if (data.startsWith("delete_")) {
            let taskId = data.replace("delete_", "");
            await tasksCollection.deleteOne({ _id: new ObjectId(taskId) });
            return bot.sendMessage(chatId, "✅ Task deleted successfully.");
        }
});

// Handle New Task Input
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text;

    const db = client.db(dbName);
    const tasksCollection = db.collection(collectionName2)
    console.log("Using Collection:", collectionName2);

    //const collection = db.collection(collectionName);

    if (userId.toString() !== adminId) return;

    if (text.includes("|")) {
        let parts = text.split('|');
        if (parts.length < 3) {
            return bot.sendMessage(chatId, "⚠️ Invalid format! Use: `Title | URL | Reward`");
        }

        let title = parts[0].trim();
        let url = parts[1].trim();
        let reward = parseInt(parts[2].trim());

        await tasksCollection.insertOne({ title, url, reward });

        return bot.sendMessage(chatId, `✅ New task added:\n\n*${title}*\n[Open Task](${url})\n💰 Reward: ${reward} Birr`, { parse_mode: "Markdown" });
    }
});
bot.onText(/\/start(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const referrerId = match && match[1] ? parseInt(match[1]) : null; // Extract referrer ID if present
    console.log(`User ${userId} started bot with referrerId: ${referrerId}`);
    const db = client.db(dbName);
    const collection = db.collection(collectionName)
    let user = await collection.findOne({ userId: Number(userId) });

    try {

        if (!user) {
            
            await collection.insertOne({ 
                userId, 
                chatId, 
                referralLink:`https://t.me/leul50_bot?start=${userId}`,
                language: 'en',
                referralCount: 0,
                balance: 0,
                referrerId: referrerId ? parseInt(referrerId) : null, 
                taskCompleted: { task1: false, task2: false },
            });
            if (referrerId && referrerId !== userId) {
                console.log(`Processing referral reward for referrer: ${referrerId}`);
    
                const referrer = await collection.findOne({ userId: referrerId });
    
                if (referrer) {
                    await collection.updateOne(
                        { userId: referrerId },
                        { $inc: { referralCount: 1, balance: 5 } }
                    );
    
                    console.log(`Referral count updated for referrer ${referrerId}`);
    
                    bot.sendMessage(referrer.chatId, `🎉 You earned 5 Birr! Your referral count: ${referrer.referralCount + 1}`);
                } else {
                    console.log(`Referrer ${referrerId} not found in database`);
                }
            }
            //bot.sendMessage(chatId, "✅ Welcome to the bot!");
            // Ask user to select language
            return bot.sendMessage(chatId, "Please select your preferred language:", {
                reply_markup: {
                    keyboard: [[{ text: 'English' }, { text: 'Amharic' }, { text: 'Oromo' }]],
                    resize_keyboard: true,
                    one_time_keyboard: true
                }
            });
        } 
        // If user exists, skip language prompt
        let userLang = user.language || 'en'; // Default to 'en' if no language is set
       
// ... rest of the code remains the same ...
        // Send welcome message
        //sendWelcomeMessage(chatId, user);
        bot.sendMessage(chatId, `${messages[userLang].welcome}\n\nReferral link: ${user.referralLink}`);



        // Proceed to main menu
        return bot.sendMessage(chatId, "Choose an option:", {
            reply_markup: {
                keyboard: [
                    [{ text: 'Unlock Course' }, { text: 'Competitions' }],
                    [{ text: 'Referral Progress' }, { text: 'Language' }],
                    [{ text: 'Support' }, { text: 'Cashout' }],
                    [{ text: 'Complete Task' }, { text: 'Check Balance' }]
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

    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    // 🔹 Check if user already has a language set
    let user = await collection.findOne({ userId });

    if (!user) {
        // New user, ask for language selection
        return bot.sendMessage(chatId, "Please select your language: English, Amharic, or Oromo.");
    }

    let userLang = user.language || 'en'; // Default to English if missing

    if (languages[text]) {
        // Update the selected language
        const selectedLang = languages[text];

        await collection.updateOne(
            { userId },
            { $set: { language: selectedLang } },
            { upsert: true }
        );

        userLang = selectedLang;
        bot.sendMessage(chatId, `Language set to ${text.charAt(0).toUpperCase() + text.slice(1)}! 🎉`);
    }

    // ✅ Proceed to main menu without asking for language again
    return bot.sendMessage(chatId, messages[userLang].welcome, {
        reply_markup: {
            keyboard: [
                [{ text: messages[userLang].unlockCourse}, { text: messages[userLang].competitions }],
                [{ text: messages[userLang].referralProgress }, { text: 'Language' }],
                [{ text: messages[userLang].support }, { text: messages[userLang].cashout }],
                [{ text: 'Complete Task' }, { text: 'Check Balance' }]
            ],
            resize_keyboard: true,
            one_time_keyboard: false
        }
    });
});
    




// Handle "button"  click for task completion
bot.on('callback_query', async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const userId = callbackQuery.from.id;
    const data = callbackQuery.data;

    const db = client.db(dbName);
   const usersCollection = db.collection(collectionName);
    const tasksCollection = db.collection(collectionName2);

   
    let user = await usersCollection.findOne({ userId });
    if (!user) return;


    if (data.startsWith("task_done")) {
        let taskId=data.replace("task_done","");
   
         // Check if task exists
         let task = await tasksCollection.findOne({ _id: new ObjectId(taskId) });
         if (!task) {
             return bot.answerCallbackQuery(callbackQuery.id, { text: "❌ Task not found." });
         }

        if (user.CompletedTasks.includes(taskId)) {
            return bot.answerCallbackQuery(callbackQuery.id, { text: "✅ You have already completed this task." });
        }
              // Mark task as completed
        await usersCollection.updateOne(
            { userId },
            { $push: { completedTasks: taskId }, $inc: { balance: task.reward } }
        );
        bot.answerCallbackQuery(callbackQuery.id, { text: `🎉 Task completed! You earned ${task.reward} Birr.` });
        
       // Check if user completed all tasks
       let allTasks = await tasksCollection.find().toArray();
       let updatedUser = await usersCollection.findOne({ userId });

       if (updatedUser.completedTasks.length === allTasks.length) {
           await usersCollection.updateOne({ userId }, { $set: { taskCompleted: true } });
           bot.sendMessage(chatId, "🎉 All tasks completed! You earned a total of your rewards. 💰");
       }
    }
});
// Handle "Balance" option clicked by the user
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text.toLowerCase();

    // Check if user selected the 'Balance' option
    if (text === 'check balance') {
        const db = client.db(dbName);
        const collection = db.collection(collectionName);

        // Find the user in the database using their userId
        const user = await collection.findOne({ userId: msg.from.id });

        if (user) {
            // Retrieve balance details
            const totalBalance = user.balance || 0;
            const referralBalance = user.referralBalance || 0;
            const taskDoneBalance = user.taskDoneBalance || 0;

            // Send the balance details to the user
            return bot.sendMessage(chatId, `
                📊 **Your Balance Overview:**
                
                - Total Balance: ${totalBalance} Birr
                
            `);
        } else {
            // If user is not found in database
            return bot.sendMessage(chatId, "Sorry, we couldn't find your balance. Please try again later.");
        }
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
            let selectedLang = text === 'Amharic' ? 'am' : text === 'Oromo' ? 'or' : 'en';
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
            bot.sendMessage(chatId, 'comming soon', { parse_mode: 'Markdown' });
        } else if (text === 'Referral Progress') {
            const db = client.db(dbName);
        const collection = db.collection(collectionName);
        const userId = msg.from.id;
        console.log(`Checking referral progress for userId: ${userId}`);

        let user = await collection.findOne({ userId });
        console.log("User data from DB:", user);
        if (user) {

            let userLang = user?.language && messages[user.language] ? user.language : 'en';
            let messageTemplate = messages[userLang]?.referralProgressMessage || "You have referred {count} people.";
            const referralCount = user.referralCount || 0;
            
            // Build the message
            let referralProgressMessage = messageTemplate.replace("{count}", referralCount);
        referralProgressMessage += `\n\nYour referral link: ${user.referralLink}`; // Add referral link

        bot.sendMessage(chatId, referralProgressMessage);
        } else {
            bot.sendMessage(chatId, "Sorry, we couldn't find your referral progress. Please try again later.");
        }
            //let referralProgressMessage = messageTemplate.replace("{count}", referralCount);
            //referralProgressMessage += `\n\nYour referral link: ${user.referralLink}`; 


        //let userLang = user?.language && messages[user.language] ? user.language : 'en';
        //let messageTemplate = messages[userLang]?.referralProgressMessage || "You have referred {count} people.";
        //const referralCount = user && user.referralCount ? user.referralCount : 0;
        //bot.sendMessage(chatId, messageTemplate.replace("{count}", referralCount));
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