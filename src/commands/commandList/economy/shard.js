/*
 * OwO Bot for Discord
 * Copyright (C) 2019 Christopher Thai
 * This software is licensed under Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International
 * For more information, see README.md and LICENSE
 */

const CommandInterface = require('../../CommandInterface.js');

module.exports = new CommandInterface({
    alias: ['money', 'currency', 'cash', 'credit', 'balance', 'crystals', 'crystal', 'coins', 'coin', 'shards', 'shard'],

    args: '',

    desc: 'Check your coin and crystal balance!',

    example: [ 'delta cash', 'delta shard', 'delta balance' ],

    related: ['del give', 'del daily', 'del vote'],

    permissions: ['sendMessages'],

    group: ['economy'],

    cooldown: 5000,
    half: 100,
    six: 500,

    execute: async function (p) {
        const userId = p.msg.author.id;

        // Query JOIN untuk mengambil data Coin (money) dan Crystal/Diamond (shards) sekaligus
        const sql = `
            SELECT 
                c.money AS money, 
                s.count AS crystals 
            FROM user u
            LEFT JOIN cowoncy c ON c.id = u.id
            LEFT JOIN shards s ON s.uid = u.uid
            WHERE u.id = '${userId}';
        `;

        let result = [];
        try {
            result = await p.query(sql);
        } catch (err) {
            console.error('[DATABASE ERROR in balance command]', err);
        }

        const rawMoney = result[0] && result[0].money ? result[0].money : 0;
        const rawCrystals = result[0] && result[0].crystals ? result[0].crystals : 0;

        const moneyFormatted = p.global.toFancyNum(rawMoney);
        const crystalsFormatted = p.global.toFancyNum(rawCrystals);

        // Paksa pakai emoji standar secara mutlak tanpa membaca config bot
        const coinEmoji = '🪙';
        const crystalEmoji = '💎';

        // Tampilkan kedua mata uang
        let text = `${p.getName()}** you currently have ${coinEmoji} **__${moneyFormatted}__ Coins** and ${crystalEmoji} **__${crystalsFormatted}__ Crystals!`;

        await p.send(text);
    },
});