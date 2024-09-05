const { Bot } = require('grammy');

// Replace 'YOUR_BOT_TOKEN' with your actual bot token
const bot = new Bot('YOUR_BOT_TOKEN');

// Simple in-memory storage for tracking referrals
const userReferrals = {};

// Generate a referral link for a user
function generateReferralLink(userId) {
    return `https://t.me/YOUR_BOT_USERNAME?start=${userId}`;
}

// Start command - Handles new users and referrals
bot.command('start', (ctx) => {
    const referralId = ctx.message.text.split(' ')[1]; // Extract referral ID if exists
    const userId = ctx.from.id;

    if (referralId && referralId !== String(userId)) {
        if (!userReferrals[referralId]) {
            userReferrals[referralId] = [];
        }
        if (!userReferrals[referralId].includes(userId)) {
            userReferrals[referralId].push(userId);
            ctx.reply(`You were referred by user ID: ${referralId}`);
        }
    }

    ctx.reply(`Welcome! Your referral link is: ${generateReferralLink(userId)}`);
});

// Command to check how many users someone has referred
bot.command('referrals', (ctx) => {
    const userId = ctx.from.id;
    const referrals = userReferrals[userId] || [];
    ctx.reply(`You have referred ${referrals.length} user(s).`);
});

// Start the bot
bot.start();
