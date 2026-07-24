/*
 * OwO Bot for Discord - Enable Command (Restricted Access)
 * Copyright (C) 2019 Christopher Thai
 */

const CommandInterface = require('../../CommandInterface.js');

const enabledUtil = require('./utils/enabledUtil.js');
const settingEmoji = '⚙️';

module.exports = new CommandInterface({
    alias: ['enable', 'en'],

    args: '{command|all}',

    desc: 'Enable a command or a command group in the current channel. Strictly restricted to Server Owner and Bot Owner only.',

    example: ['del enable hunt', 'del enable all'],

    related: ['del disable'],

    permissions: ['sendMessages'],

    group: ['utility'],

    cooldown: 1000,
    half: 100,
    six: 500,

    execute: async function (p) {
        /* Cek apakah yang menjalankan adalah Server Owner atau Bot Owner */
        let authorId = p.msg.author.id;
        let guildOwnerId = p.msg.channel.guild ? p.msg.channel.guild.ownerID : null;
        
        // Ambil ID Bot Owner dari config jika ada, atau sesuaikan dengan ID kamu
        let botOwnerId = (p.config && p.config.ownerId) ? p.config.ownerId : '708218077413769257'; 

        let isServerOwner = guildOwnerId && authorId === guildOwnerId;
        let isBotOwner = authorId === botOwnerId || authorId === '708218077413769257'; // Tambahkan ID kamu di sini

        if (!isServerOwner && !isBotOwner) {
            if (typeof p.errorMsg === 'function') {
                p.errorMsg(', This command can only be used by the **Server Owner** or **Bot Owner**!', 3000);
            } else {
                p.msg.channel.createMessage('❌ **|** This command can only be used by the **Server Owner** or **Bot Owner**!').catch(() => {});
            }
            return;
        }

        // 1. Validate input arguments
        if (!p.args || p.args.length === 0) {
            await p.send('**🚫 | Invalid argument!** Usage: `del enable <command|group|all>`');
            return;
        }

        /* Parse commands */
        let commands = p.args.slice();
        for (let i = 0; i < commands.length; i++) commands[i] = commands[i].toLowerCase();

        const channelId = p.msg.channel.id;

        /* If the user wants to enable all commands */
        if (commands.includes('all')) {
            let sql = `DELETE FROM disabled WHERE channel = '${channelId}';`;
            try {
                await p.query(sql);
            } catch (err) {
                console.error('[DATABASE ERROR in enable.js]', err);
            }
            
            if (typeof p.replyMsg === 'function') {
                await p.replyMsg(settingEmoji, ', **All** commands and lockdowns have been completely **unlocked and enabled** for this channel!');
            } else {
                await p.send(`${settingEmoji} **| ${p.getName()}**, **All** commands and lockdowns have been completely **unlocked and enabled** for this channel!`);
            }
            return;
        }

        // Parse which commands to enable (termasuk handle alias dan command utama agar bersih total dari database)
        let remove = new Set();
        for (let i = 0; i < commands.length; i++) {
            let inputCmd = commands[i];

            // Remove group
            if (p.commandGroups && p.commandGroups[inputCmd]) {
                remove.add(inputCmd);
                for (let j in p.commandGroups[inputCmd]) {
                    remove.add(p.commandGroups[inputCmd][j]);
                }
            } 
            // Remove individual command / alias
            else {
                let mainCmd = p.aliasToCommand ? (p.aliasToCommand[inputCmd] || inputCmd) : inputCmd;
                remove.add(inputCmd); // Masukkan input mentah (bisa jadi alias)
                remove.add(mainCmd);  // Masukkan command utama

                if (mainCmd && mainCmd !== 'disabled' && mainCmd !== 'enable') {
                    if (p.commands && p.commands[mainCmd] && p.commands[mainCmd].group) {
                        let group = p.commands[mainCmd].group;
                        for (let k in group) {
                            remove.add(group[k]);
                        }
                    }
                }
            }
        }

        if (remove.size > 0) {
            const commandListStr = Array.from(remove).join("','");
            // Hapus baris 'all' juga jika user spesifik enable command tertentu agar command tersebut tembus kembali
            const sql = `DELETE FROM disabled WHERE channel = '${channelId}' AND command IN ('all', '${commandListStr}');`;
            
            try {
                await p.query(sql);
            } catch (err) {
                console.error('[DATABASE ERROR in enable.js]', err);
            }
        }

        // Display updated channel settings
        if (enabledUtil && typeof enabledUtil.createEmbed === 'function') {
            await p.send(await enabledUtil.createEmbed(p));
        } else {
            await p.send(`${settingEmoji} **| ${p.getName()}**, Selected command(s) have been **enabled**!`);
        }
    },
});