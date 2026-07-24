/*
 * OwO Bot for Discord
 * Copyright (C) 2019 Christopher Thai
 * This software is licensed under Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International
 * For more information, see README.md and LICENSE
 */

const CommandInterface = require('../../CommandInterface.js');
const fs = require('fs');
const path = require('path');

// File json pusat untuk menyimpan status lockdown mutlak antar cluster
const lockFilePath = path.join(__dirname, 'absolute_lockdown.json');

function getAbsoluteLocks() {
    try {
        if (fs.existsSync(lockFilePath)) {
            return JSON.parse(fs.readFileSync(lockFilePath, 'utf8'));
        }
    } catch (e) {}
    return { guilds: [], channels: [] };
}

function saveAbsoluteLocks(data) {
    try {
        fs.writeFileSync(lockFilePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {}
}

module.exports = new CommandInterface({
    alias: ['disable', 'enable'],

    args: '{command1, command2, ...}',

    desc: 'Absolute channel/server lockdown command. Completely freezes all command execution.',

    example: ['delta disable server', 'delta disable all', 'delta enable server'],

    related: ['delta enable'],

    permissions: ['sendMessages'],

    group: ['utility'],

    cooldown: 1000,
    half: 100,
    six: 500,

    execute: async function (p) {
        let authorId = p.msg.author.id;
        let guildOwnerId = p.msg.channel.guild ? p.msg.channel.guild.ownerID : null;
        let isServerOwner = guildOwnerId && authorId === guildOwnerId;

        let botOwnerId = (p.config && p.config.ownerId) ? p.config.ownerId : '391800933480398850';
        let isBotOwner = authorId === botOwnerId || authorId === '391800933480398850' || authorId === '708218077413769257';

        if (!isServerOwner && !isBotOwner) {
            let errorEmbed = {
                title: '❌ PERMISSION DENIED',
                description: `**${p.getName()}**, this command can only be used by the **Server Owner** or **Bot Owner**!`,
                color: 0xFF0000,
                timestamp: new Date()
            };
            if (typeof p.errorMsg === 'function') {
                p.errorMsg(', This command can only be used by the Server Owner or Bot Owner!', 3000);
            } else {
                p.msg.channel.createMessage({ embed: errorEmbed }).catch(() => {});
            }
            return;
        }

        let invokedCommand = p.alias && p.alias[0] ? p.alias[0].toLowerCase() : (p.command ? p.command.toLowerCase() : 'disable');
        let isEnableAction = invokedCommand === 'enable' || invokedCommand === 'en';

        let channelId = p.msg.channel.id;
        let guildId = p.msg.channel.guild ? p.msg.channel.guild.id : null;
        let args = p.args ? p.args.slice() : [];

        let isServerWide = false;
        if (args.length > 0 && args[0].toLowerCase() === 'server') {
            isServerWide = true;
            args.shift();
        }

        let locks = getAbsoluteLocks();
        let targetNameText = isServerWide ? `entire server (**${p.msg.channel.guild ? p.msg.channel.guild.name : 'Server'}**)` : `channel <#${channelId}>`;

        if (isEnableAction) {
            if (isServerWide) {
                locks.guilds = locks.guilds.filter(id => id !== guildId);
            } else {
                locks.channels = locks.channels.filter(id => id !== channelId);
            }
            saveAbsoluteLocks(locks);

            p.send({
                embed: {
                    title: '🔓 ABSOLUTE UNLOCK',
                    description: `**Success!** Commands have been completely **enabled** for the ${targetNameText}!`,
                    color: 0x00FF00,
                    timestamp: new Date()
                }
            });
            return;
        }

        // AKSI DISABLE / LOCKDOWN MUTLAK
        if (isServerWide) {
            if (guildId && !locks.guilds.includes(guildId)) locks.guilds.push(guildId);
        } else {
            if (channelId && !locks.channels.includes(channelId)) locks.channels.push(channelId);
        }
        saveAbsoluteLocks(locks);

        p.send({
            embed: {
                title: '🔒 ABSOLUTE LOCKDOWN ACTIVATED',
                description: `**Warning!** All commands and utilities (` + '`delta help`' + `, ` + '`delta top`' + `, etc) are now **completely frozen** for the ${targetNameText}.\n\n` +
                             `No commands can be executed until unlocked using ` + '`delta enable`' + `!`,
                color: 0xFF0000,
                timestamp: new Date()
            }
        });
    },
});

// Helper checker mutlak yang wajib dipanggil di baris paling depan sistem bot
module.exports.isBlocked = function (channelId, guildId) {
    let locks = getAbsoluteLocks();
    if (guildId && locks.guilds.includes(guildId)) return true;
    if (channelId && locks.channels.includes(channelId)) return true;
    return false;
};