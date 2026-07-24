/*
 * OwO Bot for Discord
 * Copyright (C) 2019 Christopher Thai
 * This software is licensed under Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International
 * For more information, see README.md and LICENSE
 */

const CommandInterface = require('../../CommandInterface.js');

const quotes = [
    '💖 Absolute soulmates made in heaven!',
    '✨ Wonderful chemistry together!',
    '💛 Not bad! There is definitely potential!',
    '🌧️ A bit rocky... gonna take effort!',
    '💔 Disaster couple! Run away fast!',
    '🥰 Too cute to handle!',
    '🔥 Sparks are flying everywhere!',
];

module.exports = new CommandInterface({
    alias: ['propose', 'marry', 'marriage', 'wife', 'husband', 'jodohin', 'love'],

    args: '{@user1/id1} {@user2/id2}',

    desc: 'Calculate love compatibility between two users with custom banner and fully loaded usernames!',

    example: ['delta marry @User1 @User2', 'delta marry @User 708218077413769257', 'delta marry 708218077413769257 369111303563902986'],

    related: ['delta daily', 'delta shop'],

    permissions: ['sendMessages', 'embedLinks', 'addReactions'],

    group: ['social'],

    cooldown: 5000,

    execute: async function (p) {
        let args = p.args;
        let targets = [];

        for (let i = 0; i < args.length; i++) {
            let arg = args[i];
            let cleanId = arg.replace(/[^0-9]/g, '');
            if (cleanId.length >= 17 && cleanId.length <= 19) {
                if (!targets.includes(cleanId)) {
                    targets.push(cleanId);
                }
            }
        }

        if (targets.length === 1) {
            targets.unshift(p.msg.author.id);
        }

        if (targets.length < 2 && p.msg.mentions && p.msg.mentions.length > 0) {
            for (let m of p.msg.mentions) {
                if (!targets.includes(m.id)) targets.push(m.id);
            }
        }

        if (targets.length < 2) {
            sendError(p, 'Please specify **two users** (mentions or raw IDs) to test their love compatibility!\n*Example:* `delta marry @User1 @User2` or `delta marry @User 708218077413769257`');
            return;
        }

        let id1 = targets[0];
        let id2 = targets[1];

        // Memperbaiki pengambilan user agar langsung narik username asli dari cache/guild member / API client
        async function fetchRealUser(userId) {
            try {
                if (p.msg && p.msg.channel && p.msg.channel.guild) {
                    let member = p.msg.channel.guild.members.get(userId);
                    if (member) {
                        return { username: member.globalName || member.username };
                    }
                }

                if (p.client) {
                    let fetchedUser = null;
                    if (p.client.users && typeof p.client.users.fetch === 'function') {
                        fetchedUser = await p.client.users.fetch(userId).catch(() => null);
                    }
                    if (!fetchedUser && typeof p.client.fetchUser === 'function') {
                        fetchedUser = await p.client.fetchUser(userId).catch(() => null);
                    }
                    if (fetchedUser) {
                        return { username: fetchedUser.globalName || fetchedUser.username };
                    }
                }

                if (typeof p.fetchUser === 'function') {
                    let u = await p.fetchUser(userId).catch(() => null);
                    if (u) {
                        return { username: u.globalName || u.username };
                    }
                }
            } catch (e) {
                // Ignore API lookup errors
            }

            return { username: `<@${userId}>` };
        }

        let user1 = await fetchRealUser(id1);
        let user2 = await fetchRealUser(id2);

        let lovePercentage = Math.floor(Math.random() * 101);

        let quoteChoice = quotes[Math.floor(Math.random() * quotes.length)];
        if (lovePercentage === 100) {
            quoteChoice = '💍 **PERFECT MATCH!** Wedding bells are ringing instantly! 🔔';
        } else if (lovePercentage === 0) {
            quoteChoice = '💀 **Absolute zero!** Total emotional damage!';
        }

        let embed = {
            title: '💞 Love Test & Marriage Compatibility 💞',
            description: `**${user1.username}** 💕 **${user2.username}**\n\n` +
                         `❤️ **Love Score: \`${lovePercentage}%\`**\n` +
                         `------------------------------------\n` +
                         `${quoteChoice}\n\n` +
                         `🎉 *Congratulations on this wonderful match!*`,
            color: p.config.embed_color,
            fields: [
                {
                    name: `👤 User 1`,
                    value: `**${user1.username}**\n(<@${id1}>)`,
                    inline: true
                },
                {
                    name: `👤 User 2`,
                    value: `**${user2.username}**\n(<@${id2}>)`,
                    inline: true
                }
            ],
            image: {
                url: 'https://i.pinimg.com/originals/cb/ae/3c/cbae3ca6352a6a05e0b0008e0a487a1a.gif'
            },
            footer: {
                text: `Requested by ${p.getName()} • Love Calculator`
            },
            timestamp: new Date()
        };

        p.send({ embed });
    },
});

function sendError(p, text, timeout = 3000) {
    if (typeof p.errorMsg === 'function') {
        p.errorMsg(text, timeout);
    } else if (p.msg && p.msg.channel) {
        p.msg.channel.createMessage(`❌ **|** ${text}`).catch(() => {});
    }
}