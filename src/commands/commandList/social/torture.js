/*
 * OwO Bot for Discord
 * Copyright (C) 2019 Christopher Thai
 * This software is licensed under Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International
 * For more information, see README.md and LICENSE
 */

const CommandInterface = require('../../CommandInterface.js');

const TORTURE_GIF = 'https://wimg.rule34.xxx//images/958/73020521fe1768f414e5681f85db562a7aa3efb2.gif?958039';

const cooldowns = new Map();
const channelDisabled = new Set();

module.exports = new CommandInterface({
    alias: ['torture', 'tort'],

    args: '{@user}',

    desc: 'NSFW interactive torture command with confirmation prompts and custom GIF banner.',

    example: ['delta torture @User'],

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

        // 1. LOGIKA SUB-COMMAND: enable / disable channel
        if (firstArg === 'enable' || firstArg === 'disable') {
            if (!isServerOwner && !isBotOwner) {
                p.errorMsg(', This sub-command can only be used by the **Server Owner** or **Bot Owner**!', 3000);
                return;
            }

            let targetChannelId = currentChannelId;
            let secondArg = p.args[1];

            if (secondArg) {
                let cleanChannelId = secondArg.replace(/[^0-9]/g, '');
                if (cleanChannelId.length >= 17 && cleanChannelId.length <= 19) {
                    targetChannelId = cleanChannelId;
                }
            }

            if (firstArg === 'disable') {
                channelDisabled.add(targetChannelId);
                p.send(`**🔒 |** Torture command has been **disabled** for <#${targetChannelId}>.`);
            } else {
                channelDisabled.delete(targetChannelId);
                p.send(`**🔓 |** Torture command has been **enabled** for <#${targetChannelId}>!`);
            }
            return;
        }

        if (channelDisabled.has(currentChannelId)) {
            p.errorMsg(', This command is currently **disabled** in this channel!', 3000);
            return;
        }

        let currentTime = Date.now();
        let cooldownTime = 5000;

        if (cooldowns.has(authorId)) {
            let expirationTime = cooldowns.get(authorId) + cooldownTime;
            if (currentTime < expirationTime) {
                let timeLeft = ((expirationTime - currentTime) / 1000).toFixed(1);
                p.errorMsg(`⏳ **| Cooldown!** Please wait **${timeLeft}s**.`, 3000);
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
            } catch (e) {}
            return { id: userId, name: `User_${userId.slice(-4)}` };
        }

        let authorUser = await fetchRealUser(authorId);
        let fieldsList = [];
        let descriptionText = '';

        if (targets.length >= 1) {
            let user1 = await fetchRealUser(targets[0]);
            descriptionText = `**${authorUser.name}** is ruthlessly torturing **${user1.name}**! ⚡⛓️\n\n` +
                              `------------------------------------\n` +
                              `*This feature is strictly for **NSFW Only** content!*`;
            fieldsList = [
                { name: `👤 Torturer`, value: `**${authorUser.name}**\n(<@${authorUser.id}>)`, inline: true },
                { name: `🎯 Victim`, value: `**${user1.name}**\n(<@${user1.id}>)`, inline: true }
            ];
        } else {
            descriptionText = `**${authorUser.name}** is undergoing intense self-torture! ⛓️\n\n` +
                              `------------------------------------\n` +
                              `*This feature is strictly for **NSFW Only** content!*`;
            fieldsList = [
                { name: `👤 Subject`, value: `**${authorUser.name}**\n(<@${authorUser.id}>)`, inline: true }
            ];
        }

        let confirmEmbed = {
            title: '⚠️ NSFW CONTENT WARNING',
            description: `**${authorUser.name}**, you are about to trigger an **NSFW Torture** command.\n\n` +
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

        let filter = (emoji, userId) => userId === authorId && (emoji.name === '✅' || emoji.name === '❌');
        
        if (p.reactionCollector && typeof p.reactionCollector.create === 'function') {
            let collector = p.reactionCollector.create(sentMsg, filter, { time: 15000, max: 1 });
            
            collector.on('collect', async (emoji, userId) => {
                await sentMsg.delete().catch(() => {});
                if (emoji.name === '✅') {
                    let finalEmbed = {
                        title: '💀 NSFW - TORTURE ROOM 💀',
                        description: descriptionText,
                        color: 0xFF1493,
                        fields: fieldsList,
                        image: { url: TORTURE_GIF },
                        footer: { text: `Requested by ${p.getName()} • Delta System` },
                        timestamp: new Date()
                    };
                    p.send({ embed: finalEmbed });
                } else {
                    p.msg.channel.createMessage(`❌ **|** Command cancelled by **${authorUser.name}**.`);
                }
            });

            collector.on('end', async (collected) => {
                if (!collected || collected.size === 0) {
                    await sentMsg.delete().catch(() => {});
                }
            });
        } else {
            setTimeout(async () => {
                await sentMsg.delete().catch(() => {});
                let finalEmbed = {
                    title: '💀 NSFW - TORTURE ROOM 💀',
                    description: descriptionText,
                    color: 0xFF1493,
                    fields: fieldsList,
                    image: { url: TORTURE_GIF },
                    footer: { text: `Requested by ${p.getName()}` },
                    timestamp: new Date()
                };
                p.send({ embed: finalEmbed });
            }, 3000);
        }
    },
});