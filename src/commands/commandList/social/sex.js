/*
 * OwO Bot for Discord
 * Copyright (C) 2019 Christopher Thai
 * This software is licensed under Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International
 * For more information, see README.md and LICENSE
 */

const CommandInterface = require('../../CommandInterface.js');

// Pemetaan banner GIF lengkap dengan URL GIF jerk yang diminta secara spesifik
const banners = {   
    sex_solo: 'https://tbib.org//images/1996/4268c780fc73333ba85333a80e780d32e27ef03b.gif',
    sex_standard: 'https://imagex1.sx.cdn.live/images/pinporn/2013/08/01/3327374.gif?width=460',
    sex_gangbang: 'https://imagex1.sx.cdn.live/images/pinporn/2016/09/30/16643283.gif?width=460',
    masturbate: 'https://cdn.hentaigifz.com/102980/suguha-kirigaya-masturbation.gif',
    grab: 'https://cdn.hentaigifz.com/69162/great-titeh-grab.gif',
    jerk: 'https://imagex1.sx.cdn.live/images/pinporn/2021/07/11/25538646.gif?width=460' // GIF exact yang diminta user
};

const cooldowns = new Map();
const channelDisabled = new Set();

module.exports = new CommandInterface({
    alias: ['sex', 'dsex', 'masturbate', 'mastur', 'grab', 'boobs', 'jerk'],

    args: '{@user1} {@user2} {@user3}',

    desc: 'NSFW interactive commands (Sex, Masturbate, Grab Boobs, Jerk) with confirmation prompts, dynamic banners, and cooldowns.',

    example: ['delta sex @User1', 'delta masturbate @User', 'delta grab boobs @User', 'delta jerk @User', 'delta sex enable'],

    related: ['delta marry', 'delta daily'],

    permissions: ['sendMessages', 'embedLinks', 'addReactions'],

    group: ['nsfw', 'fun'],

    cooldown: 5000,

    execute: async function (p) {
        let authorId = p.msg.author.id;
        let guildOwnerId = p.msg.channel.guild ? p.msg.channel.guild.ownerID : null;
        let isServerOwner = guildOwnerId && authorId === guildOwnerId;

        let botOwnerId = (p.config && p.config.ownerId) ? p.config.ownerId : null;
        let isBotOwner = authorId === botOwnerId || authorId === '391800933480398850' || authorId === '708218077413769257';

        let currentChannelId = p.msg.channel.id;
        let firstArg = (p.args && p.args[0]) ? p.args[0].toLowerCase() : '';

        // DETEKSI KATA KUNCI UTAMA SECARA MUTLAK
        let fullContent = p.msg.content ? p.msg.content.toLowerCase() : '';
        let invokedCommand = 'sex';

        if (fullContent.includes('masturbate') || fullContent.includes('mastur')) {
            invokedCommand = 'masturbate';
        } else if (fullContent.includes('jerk')) {
            invokedCommand = 'jerk';
        } else if (fullContent.includes('grab') || fullContent.includes('boobs')) {
            invokedCommand = 'grab';
        } else {
            invokedCommand = 'sex';
        }

        // 1. LOGIKA SUB-COMMAND: enable / disable channel
        if (firstArg === 'enable' || firstArg === 'disable') {
            if (!isServerOwner && !isBotOwner) {
                if (typeof p.errorMsg === 'function') {
                    p.errorMsg(', This sub-command can only be used by the **Server Owner** or **Bot Owner**!', 3000);
                } else {
                    p.msg.channel.createMessage('❌ **|** This sub-command can only be used by the **Server Owner** or **Bot Owner**!').catch(() => {});
                }
                return;
            }

            let targetChannelId = currentChannelId;
            let secondArg = p.args[1];

            if (secondArg) {
                let cleanChannelId = secondArg.replace(/[^0-9]/g, '');
                if (cleanChannelId.length >= 17 && cleanChannelId.length <= 19) {
                    targetChannelId = cleanChannelId;
                } else if (p.msg.channel.guild && p.msg.channel.guild.channels) {
                    let foundChannel = p.msg.channel.guild.channels.find(c => c.name.toLowerCase() === secondArg.replace('#', '').toLowerCase());
                    if (foundChannel) {
                        targetChannelId = foundChannel.id;
                    }
                }
            }

            if (firstArg === 'disable') {
                channelDisabled.add(targetChannelId);
                p.send(`**🔒 |** The command has been successfully **disabled** for <#${targetChannelId}>.`);
            } else {
                channelDisabled.delete(targetChannelId);
                p.send(`**🔓 |** The command has been successfully **enabled** and unlocked for <#${targetChannelId}>!`);
            }
            return;
        }

        // 2. CEK APAKAH FITUR DI-DISABLE DI CHANNEL INI
        if (channelDisabled.has(currentChannelId)) {
            if (typeof p.errorMsg === 'function') {
                p.errorMsg(', This command is currently **disabled** in this channel!', 3000);
            } else {
                p.msg.channel.createMessage('❌ **|** This command is currently **disabled** in this channel!').catch(() => {});
            }
            return;
        }

        let currentTime = Date.now();
        let cooldownTime = 5000;

        if (cooldowns.has(authorId)) {
            let expirationTime = cooldowns.get(authorId) + cooldownTime;
            if (currentTime < expirationTime) {
                let timeLeft = ((expirationTime - currentTime) / 1000).toFixed(1);
                let cdMsg = `⏳ **| This command is on cooldown!** Please wait **${timeLeft}s** before using it again.`;
                if (typeof p.errorMsg === 'function') {
                    p.errorMsg(cdMsg, 3000);
                } else {
                    p.msg.channel.createMessage(cdMsg).catch(() => {});
                }
                return;
            }
        }

        cooldowns.set(authorId, currentTime);
        setTimeout(() => cooldowns.delete(authorId), cooldownTime);

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

        if (p.msg.mentions && p.msg.mentions.length > 0) {
            for (let m of p.msg.mentions) {
                if (!targets.includes(m.id)) {
                    targets.push(m.id);
                }
            }
        }

        async function fetchRealUser(userId) {
            try {
                if (p.msg && p.msg.channel && p.msg.channel.guild) {
                    let member = p.msg.channel.guild.members.get(userId);
                    if (member) {
                        return { id: userId, name: member.globalName || member.username };
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
                        return { id: userId, name: fetchedUser.globalName || fetchedUser.username };
                    }
                }

                if (typeof p.fetchUser === 'function') {
                    let u = await p.fetchUser(userId).catch(() => null);
                    if (u) {
                        return { id: userId, name: u.globalName || u.username };
                    }
                }
            } catch (e) {}
            return { id: userId, name: `User_${userId.slice(-4)}` };
        }

        let authorUser = await fetchRealUser(authorId);
        let fieldsList = [];
        let descriptionText = '';
        let activeBanner = banners.sex_standard;
        let embedTitle = '🔥 NSFW - DELTA SEX 🔥';

        // 3. PEMISAHAN LOGIKA BERDASARKAN COMMAND
        if (invokedCommand === 'masturbate') {
            activeBanner = banners.masturbate;
            embedTitle = '🔥 NSFW - MASTURBATE 🔥';

            if (targets.length >= 1) {
                let user1 = await fetchRealUser(targets[0]);
                descriptionText = `**${authorUser.name}** is masturbating thinking about **${user1.name}**! 💦\n\n` +
                                  `------------------------------------\n` +
                                  `*This feature is strictly for **NSFW Only** content!*`;
                fieldsList = [
                    { name: `👤 User`, value: `**${authorUser.name}**\n(<@${authorUser.id}>)`, inline: true },
                    { name: `🎯 Target`, value: `**${user1.name}**\n(<@${user1.id}>)`, inline: true }
                ];
            } else {
                descriptionText = `**${authorUser.name}** is masturbating by themselves! 💦\n\n` +
                                  `------------------------------------\n` +
                                  `*This feature is strictly for **NSFW Only** content!*`;
                fieldsList = [
                    { name: `👤 User`, value: `**${authorUser.name}**\n(<@${authorUser.id}>)`, inline: true }
                ];
            }

        } else if (invokedCommand === 'jerk') {
            activeBanner = banners.jerk; // Memakai GIF persis dari link yang kamu berikan
            embedTitle = '🔥 NSFW - JERK OFF 🔥';

            if (targets.length >= 1) {
                let user1 = await fetchRealUser(targets[0]);
                descriptionText = `**${authorUser.name}** is furiously jerking off looking at **${user1.name}**! 🍆💦\n\n` +
                                  `------------------------------------\n` +
                                  `*This feature is strictly for **NSFW Only** content!*`;
                fieldsList = [
                    { name: `👤 User`, value: `**${authorUser.name}**\n(<@${authorUser.id}>)`, inline: true },
                    { name: `🎯 Target`, value: `**${user1.name}**\n(<@${user1.id}>)`, inline: true }
                ];
            } else {
                descriptionText = `**${authorUser.name}** is jerking off by themselves! 🍆💦\n\n` +
                                  `------------------------------------\n` +
                                  `*This feature is strictly for **NSFW Only** content!*`;
                fieldsList = [
                    { name: `👤 User`, value: `**${authorUser.name}**\n(<@${authorUser.id}>)`, inline: true }
                ];
            }

        } else if (invokedCommand === 'grab') {
            activeBanner = banners.grab;
            embedTitle = '🔥 NSFW - BOOBS GRAB 🔥';

            if (targets.length >= 1) {
                let user1 = await fetchRealUser(targets[0]);
                descriptionText = `**${authorUser.name}** happily grabs **${user1.name}**'s boobs! 🍈🍈\n\n` +
                                  `------------------------------------\n` +
                                  `*This feature is strictly for **NSFW Only** content!*`;
                fieldsList = [
                    { name: `👤 User`, value: `**${authorUser.name}**\n(<@${authorUser.id}>)`, inline: true },
                    { name: `🎯 Target`, value: `**${user1.name}**\n(<@${user1.id}>)`, inline: true }
                ];
            } else {
                descriptionText = `**${authorUser.name}** grabs their own chest! 🍈\n\n` +
                                  `------------------------------------\n` +
                                  `*This feature is strictly for **NSFW Only** content!*`;
                fieldsList = [
                    { name: `👤 User`, value: `**${authorUser.name}**\n(<@${authorUser.id}>)`, inline: true }
                ];
            }

        } else {
            embedTitle = '🔥 NSFW - DELTA SEX 🔥';

            if (targets.length >= 2) {
                let user1 = await fetchRealUser(targets[0]);
                let user2 = await fetchRealUser(targets[1]);
                let user3 = targets[2] ? await fetchRealUser(targets[2]) : null;

                activeBanner = banners.sex_gangbang;

                if (user3) {
                    descriptionText = `**${authorUser.name}** and **${user1.name}** are taking turns dominating **${user3.name}** alongside **${user2.name}**! 💦🔥\n\n` +
                                      `------------------------------------\n` +
                                      `*This feature is strictly for **NSFW Only** content!*`;
                    fieldsList = [
                        { name: `👥 Dominants (Side 1)`, value: `• **${authorUser.name}** (<@${authorUser.id}>)\n• **${user1.name}** (<@${user1.id}>)\n• **${user2.name}** (<@${user2.id}>)`, inline: true },
                        { name: `👤 Target (Side 2)`, value: `• **${user3.name}** (<@${user3.id}>)`, inline: true }
                    ];
                } else {
                    descriptionText = `**${authorUser.name}** and **${user1.name}** are taking turns dominating **${user2.name}**! 💦🔥\n\n` +
                                      `------------------------------------\n` +
                                      `*This feature is strictly for **NSFW Only** content!*`;
                    fieldsList = [
                        { name: `👥 Dominants (Side 1)`, value: `• **${authorUser.name}** (<@${authorUser.id}>)\n• **${user1.name}** (<@${user1.id}>)`, inline: true },
                        { name: `👤 Target (Side 2)`, value: `• **${user2.name}** (<@${user2.id}>)`, inline: true }
                    ];
                }

            } else if (targets.length === 1) {
                let user1 = await fetchRealUser(targets[0]);
                activeBanner = banners.sex_standard;

                descriptionText = `**${authorUser.name}** is intimately interacting with **${user1.name}**! 💦\n\n` +
                                  `------------------------------------\n` +
                                  `*This feature is strictly for **NSFW Only** content!*`;

                fieldsList = [
                    { name: `👤 User 1`, value: `**${authorUser.name}**\n(<@${authorUser.id}>)`, inline: true },
                    { name: `👤 User 2`, value: `**${user1.name}**\n(<@${user1.id}>)`, inline: true }
                ];

            } else {
                activeBanner = banners.sex_solo;

                descriptionText = `**${authorUser.name}** is playing with themselves! 💦\n\n` +
                                  `------------------------------------\n` +
                                  `*This feature is strictly for **NSFW Only** content!*`;

                fieldsList = [
                    { name: `👤 User`, value: `**${authorUser.name}**\n(<@${authorUser.id}>)`, inline: true }
                ];
            }
        }

        let confirmEmbed = {
            title: '⚠️ NSFW CONTENT WARNING',
            description: `**${authorUser.name}**, you are about to trigger an **NSFW** command.\n\n` +
                         `Do you want to proceed with this content? Click **✅ Agree** to execute or **❌ Cancel** to abort.`,
            color: 0xFFA500,
            footer: { text: `Requested by ${p.getName()} • Confirmation Required` },
            timestamp: new Date()
        };

        let sentMsg = await p.msg.channel.createMessage({ embed: confirmEmbed }).catch(() => null);
        if (!sentMsg) return;

        try {
            await sentMsg.addReaction('✅');
            await sentMsg.addReaction('❌');
        } catch (e) {}

        let filter = (msg, emoji, userId) => userId === authorId && (emoji.name === '✅' || emoji.name === '❌');
        
        if (p.client && typeof p.client.addMessageReactionCollector === 'function') {
            let collector = new p.client.MessageReactionCollector(p.client, sentMsg, filter, { time: 15000, max: 1 });
            collector.on('collect', async (reaction, userId, emoji) => {
                if (emoji.name === '✅') {
                    await sentMsg.delete().catch(() => {});
                    let finalEmbed = {
                        title: embedTitle,
                        description: descriptionText,
                        color: 0xFF1493,
                        fields: fieldsList,
                        image: { url: activeBanner },
                        footer: { text: `Requested by ${p.getName()} • Delta System` },
                        timestamp: new Date()
                    };
                    p.send({ embed: finalEmbed });
                } else {
                    await sentMsg.delete().catch(() => {});
                    p.msg.channel.createMessage(`❌ **|** Command cancelled by **${authorUser.name}**.`);
                }
            });
            collector.on('end', async (collected) => {
                if (collected.size === 0) {
                    await sentMsg.delete().catch(() => {});
                    p.msg.channel.createMessage(`⏰ **|** Confirmation timeout! Command cancelled.`);
                }
            });
        } else {
            setTimeout(async () => {
                await sentMsg.delete().catch(() => {});
                let finalEmbed = {
                    title: embedTitle,
                    description: descriptionText,
                    color: 0xFF1493,
                    fields: fieldsList,
                    image: { url: activeBanner },
                    footer: { text: `Requested by ${p.getName()}` },
                    timestamp: new Date()
                };
                p.send({ embed: finalEmbed });
            }, 3000);
        }
    },
});