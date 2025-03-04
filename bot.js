import TelegramBot from 'node-telegram-bot-api';
import { MongoClient,ServerApiVersion,ObjectId } from 'mongodb';
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
const client = new MongoClient(mongoUri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    }
  });

// Connect to MongoDB
async function connectToMongo() {
    try {
        await client.connect();
        await client.db("admin").command({ ping: 1 });

        console.log('Connected to MongoDB');
                // Get the MongoDB database and collections
                const db = client.db(dbName);
                const usersCollection = db.collection(collectionName);
                //const tasksCollection = db.collection(collectionName2);
        
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
        enterPhone: "Please enter your phone number:"
    ,        language: "Language"
},
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
        enterPhone: "እባኮትን የስልክ ቁጥርዎን ያስገቡ፡",
        language: "ቋንቋ"
    },
}
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

    //if (userId.toString() !== adminId) return;
    if (!adminId.includes(Number(userId))) {
        console.log("User is not an admin."); // Log if the user is not an admin
        return;
    }

    if (text && text.includes("|")) {
        let parts = text.split('|').map(part => part.trim());
        if (parts.length < 3) {
            return bot.sendMessage(chatId, "⚠️ Invalid format! Use: `Title | URL | Reward`");
        }

        let title = parts[0].trim();
        let url = parts[1].trim();
        let reward = parseInt(parts[2].trim());
        //console.log(`Parsed - Title: ${title}, URL: ${url}, Reward: ${reward}`);
        try {
            const result = await tasksCollection.insertOne({ title, url, reward });
            console.log("Task inserted:", result.insertedId); // Log the inserted task ID
            return bot.sendMessage(chatId, `✅ New task added:\n\n*${title}*\n[Open Task](${url})\n💰 Reward: ${reward} Birr`, { parse_mode: "Markdown" });
        } catch (err) {
            console.error("Failed to insert task:", err); // Log any errors
            return bot.sendMessage(chatId, "⚠️ Failed to add the task. Please try again.");
        }
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
                userId:Number(userId), 
                chatId, 
                referralLink:`https://t.me/leul50_bot?start=${userId}`,
                language: 'en',
                referralCount: 0,
                balance: 0,
                referrerId: referrerId ? parseInt(referrerId) : null, 
                //taskCompleted: { task1: false, task2: false },
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
                    keyboard: [[{ text: 'English' }, { text: 'Amharic' }]],
                    resize_keyboard: true,
                    one_time_keyboard: true
                }
            });
        } 
        // If user exists, skip language prompt
        let userLang = user.language || 'en'; 
        console.log(`User ${userId} current language: ${userLang}`);
// Default to 'en' if no language is set
       
// ... rest of the code remains the same ...
        // Send welcome message
        //sendWelcomeMessage(chatId, user);
        bot.sendMessage(chatId, `${messages[userLang].welcome}\n\nReferral link: ${user.referralLink}`);



        // Proceed to main menu
        return bot.sendMessage(chatId, "Choose an option:", {
            reply_markup: {
                keyboard: [
                    [{ text: 'Unlock Course' }, { text: 'Competitions' }],
                    [{ text: 'Referral Progress' }, { text: 'language' }],
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


// 🔹 Language selection handler
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text.toLowerCase();

    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    let user = await collection.findOne({ userId });

    if (!user) {
        return bot.sendMessage(chatId, "Please select your language: English, Amharic, or Oromo.");
    }

    if (text === "language") {
        return bot.sendMessage(chatId, "🌍 Select your preferred language:", {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "🇬🇧 English", callback_data: "set_lang_en" }],
                    [{ text: "🇪🇹 Amharic", callback_data: "set_lang_am" }]
                    
                ]
            }
        });
    }
});


bot.on('callback_query', async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const userId = callbackQuery.from.id;
    const data = callbackQuery.data;

    console.log("Callback Data:", data); // Debugging

    await bot.answerCallbackQuery(callbackQuery.id);

    if (data.startsWith("set_lang_")) {
        const selectedLang = data.replace("set_lang_", "");
        const langText = selectedLang === "en" ? "English" : selectedLang === "am" ? "Amharic" : "Oromo";

        const db = client.db(dbName);
        const collection = db.collection(collectionName);

        await collection.updateOne(
            { userId },
            { $set: { language: selectedLang } },
            { upsert: true }
        );
        const messages = {
            en: {
                welcome: "Welcome! 🎉",
                unlockCourse: "Unlock Course",
                competitions: "Competitions",
                referralProgress: "Referral Progress",
                support: "Support",
                cashout: "Cashout",
                completeTask: "Complete Task",
                checkBalance: "Check Balance",
                language: "Language"
            },
            am: {
                welcome: "እንኳን ደህና መጡ! 🎉",
                unlockCourse: "ትምህርት ይከፍቱ",
                competitions: "ውድድር",
                referralProgress: "ሪፈራል ሂደት",
                support: "ድጋፍ",
                cashout: "የገንዘብ ውጪ",
                completeTask: "ተግባር ይጨርሱ",
                checkBalance: "ሂሳብ ይመልከቱ",
                language: "ቋንቋ"
            },
            
        };

        await bot.sendMessage(chatId, `✅ Language updated to ${langText}! 🎉`);
        return bot.sendMessage(chatId, messages[selectedLang].welcome, {
            reply_markup: {
                keyboard: [
                    [{ text: messages[selectedLang].unlockCourse }, { text: messages[selectedLang].competitions }],
                    [{ text: messages[selectedLang].referralProgress }, { text: messages[selectedLang].language }],
                    [{ text: messages[selectedLang].support }, { text: messages[selectedLang].cashout }],
                    [{ text: messages[selectedLang].completeTask }, { text: messages[selectedLang].checkBalance }]
                ],
                resize_keyboard: true,
                one_time_keyboard: false
            }
        });
    }
});

//complate task
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    const userId = msg.from.id;

    const db = client.db(dbName);
    const tasksCollection = db.collection(collectionName2); // Ensure this is your "tasks" collection
    const usersCollection = db.collection(collectionName); // Users collection

    if (text === "Complete Task") {
        // Fetch available tasks from database
        const tasks = await tasksCollection.find().toArray();
        if (tasks.length === 0) {
            return bot.sendMessage(chatId, "⚠️ No tasks available.");
        }

        let inline_keyboard = tasks.map(task => [{
            text: `📌 ${task.title} - 💰 ${task.reward} Birr`,
            url: task.url ? task.url : "https://example.com",
            //callback_data: `complete_${task._id}`
        },     {
            text: "Done",
            callback_data: `done_${task._id}`
        }
    
    ]);

        return bot.sendMessage(chatId, "📋 Available Tasks:", {
            reply_markup: { inline_keyboard }
        });
    }
});
//handle tasck complate
// Handle callback query for "Done" button
bot.on('callback_query', async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const userId = callbackQuery.from.id;
    const data = callbackQuery.data;

    if (data.startsWith('done_')) {
        const taskId = data.split('_')[1];

        const db = client.db(dbName);
        const usersCollection = db.collection(collectionName);
        const tasksCollection = db.collection(collectionName2);

        const user = await usersCollection.findOne({ userId: Number(userId) });
        const task = await tasksCollection.findOne({ _id: new ObjectId(taskId) });

        if (!task) {
            return bot.answerCallbackQuery(callbackQuery.id, {
                text:"⚠️ Task not found.",
                show_alert: false
            
            });
        }

        if (user.taskCompleted && user.taskCompleted[taskId]) {
            return bot.answerCallbackQuery(callbackQuery.id, 
                {  text:"✅ You have already completed this task.",
                    show_alert: false
                });
        }

        // Check if task is a "Join Channel" type
        let isTaskCompleted = false;

        if (task.type === "join_channel") {
            const channelUsername = task.url.replace("https://t.me/", ""); // Extract channel username

            try {
                const chatMember = await bot.getChatMember(`@${channelUsername}`, userId);

                if (chatMember.status === "member" || chatMember.status === "administrator" || chatMember.status === "creator") {
                    
                    
                    isTaskCompleted = true;
                } else {
                    return bot.answerCallbackQuery(callbackQuery.id, 
                        {text:"⚠️ You have not joined the channel yet. Please join first and try again.",
                            show_alert: true
                        });
                }
            } catch (error) {
                console.error("Error checking chat member:", error);
                return bot.answerCallbackQuery(callbackQuery.id, 
                    { text:"⚠️ Unable to verify membership. Make sure the bot is an admin in the channel.",
                             show_alert: true

                    }
                );
            }
        } else if (task.type === "like_post") {
            // Example: Verify if the user has liked a post (you need to implement this logic)
            isTaskCompleted = await verifyPostLike(task, userId); // Implement this function
        } else {
            // Handle other task types
            return bot.answerCallbackQuery(callbackQuery.id, {text:"⚠️ This task type is not supported yet.",
                show_alert: true
            });
        }

        if (!isTaskCompleted) {
            return bot.answerCallbackQuery(callbackQuery.id, {text:"⚠️ Task not completed. Please complete the task first.",
                show_alert: true
            });
        }
 
                    // User is a member, reward them
                    await usersCollection.updateOne(
                        { userId: Number(userId) },
                        {
                            $set: { [`taskCompleted.${taskId}`]: true },
                            $inc: { balance: task.reward, taskDoneBalance: task.reward }
                        }
                    );

                    return bot.answerCallbackQuery(callbackQuery.id, {text:`🎉 Task completed!\n💰 You earned ${task.reward} Birr.`,
                    show_alert: true});
                }  
            
        

       
});

    
// Handle "Balance" option clicked by the user
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text.toLowerCase();

    if (text === 'check balance') {
        const db = client.db(dbName);
        const collection = db.collection(collectionName);

        const user = await collection.findOne({ userId: msg.from.id });

        if (user) {
            const totalBalance = user.balance || 0;
            const referralBalance = user.referralBalance || 0;
            const taskDoneBalance = user.taskDoneBalance || 0; // Fetch task earnings

            return bot.sendMessage(chatId, `
                📊 **Your Balance Overview:**
                - 💰 Total Balance: ${totalBalance} Birr
                - 🏆 Task Earnings: ${taskDoneBalance} Birr
                - 🎁 Referral Earnings: ${referralBalance} Birr
            `);
        } else {
            return bot.sendMessage(chatId, "⚠️ Sorry, we couldn't find your balance. Please try again later.");
        }
    }
});


// Handle user messages ()
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text;

    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    try {
        let user = await collection.findOne({ userId });

        if (['English', 'Amharic'].includes(text)) {
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