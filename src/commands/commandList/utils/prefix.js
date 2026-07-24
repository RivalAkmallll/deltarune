const CommandInterface = require('../../CommandInterface.js');

const regex = /^[\x00-\x7F]{1,25}$/i;
const mentions = /<(?:@[!&]?|#)\d+>/g;
const settingEmoji = '⚙️';
const comments = [
    'I like it!',
    'Fancy!',
    'nice.',
    ';)',
    'I love it <3',
    "It's perfect!",
    'amazing.',
    'wow',
    'Wonderful',
    '10/10',
    '🎉',
];

module.exports = new CommandInterface({
    alias: ['prefix'],

    args: '{newPrefix}',

    desc: 'Change the prefix for the server! Only Server admins are able to use this command.',

    example: ['delta prefix d', 'delta prefix owo'],

    related: [],

    permissions: ['sendMessages'],

    group: ['utility'],

    cooldown: 10000,

    execute: async function (p) {
        try {
            const sendText = async (emoji, text) => {
                const content = `${emoji} ${text}`;
                if (typeof p.replyMsg === 'function') {
                    return p.replyMsg(emoji, text);
                } else if (p.msg && p.msg.channel && typeof p.msg.channel.createMessage === 'function') {
                    return p.msg.channel.createMessage(content);
                }
            };

            const guildId = p.msg?.channel?.guild?.id;
            if (!guildId) return;

            if (!p.args || !p.args.length) {
                let currentPrefix = null;
                try {
                    if (p.redis && typeof p.redis.hget === 'function') {
                        currentPrefix = await p.redis.hget(guildId, 'prefix');
                    }
                } catch (err) {
                    console.error("Redis HGET Error:", err);
                }

                const activePrefix = currentPrefix || p.config?.prefix || 'delta';
                await sendText(settingEmoji, `the current prefix for this server is set to **\`${activePrefix}\`**!`);
                return;
            }

            const member = p.msg?.member;
            if (member && member.permissions && typeof member.permissions.has === 'function') {
                if (!member.permissions.has('manageChannels')) {
                    if (typeof p.errorMsg === 'function') {
                        p.errorMsg(", you're not an admin! >:c", 3000);
                    }
                    return;
                }
            }

            let newPrefix = p.args.join('').toLowerCase();
            if (!regex.test(newPrefix)) {
                if (typeof p.errorMsg === 'function') {
                    p.errorMsg(', invalid prefix! Custom prefix must be under 25 characters and exclude special characters', 5000);
                }
                return;
            } else if (mentions.test(newPrefix)) {
                if (typeof p.errorMsg === 'function') {
                    p.errorMsg(', invalid prefix! Custom prefix must exclude mentions', 5000);
                }
                return;
            }

            const defaultPrefix = p.config?.prefix || 'delta';
            if (newPrefix === defaultPrefix) {
                if (p.redis && typeof p.redis.hdel === 'function') {
                    await p.redis.hdel(guildId, 'prefix');
                }
                if (p.msg.channel.guild) {
                    p.msg.channel.guild.prefix = null;
                }
            } else {
                if (p.redis && typeof p.redis.hset === 'function') {
                    await p.redis.hset(guildId, 'prefix', newPrefix);
                }
                if (p.msg.channel.guild) {
                    p.msg.channel.guild.prefix = newPrefix;
                }
            }

            const randomComment = comments[Math.floor(Math.random() * comments.length)];
            await sendText(settingEmoji, `you successfully changed my server prefix to **\`${newPrefix}\`**! ${randomComment}`);

        } catch (error) {
            console.error("CRITICAL ERROR in prefix command:", error);
        }
    },
});