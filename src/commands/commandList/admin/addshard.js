/*
 * Delta Rune Bot for Discord - Admin Currency Management
 * Copyright (C) 2026 Custom Edition
 */

const CommandInterface = require('../../CommandInterface.js');

module.exports = new CommandInterface({
    alias: ['add', 'give', 'addmoney', 'givemoney'],

    owner: true,
    admin: true,

    desc: 'Adds coins or crystals to a targeted user (Admin Only)',

    example: ['delta give coin @user 1000', 'delta give crystal @user 50'],

    execute: async function (p) {
        const userId = p.msg.author.id;
        const ownerId = p.config && p.config.owner;
        const adminList = (p.config && p.config.role && p.config.role.admin) || [];
        const isAuthorized = userId === ownerId || adminList.includes(userId) || p.isAdmin || p.isOwner;

        if (!isAuthorized) {
            p.send('**🚫 | Access Denied!** Only registered bot admins can execute this command.');
            return;
        }

        // Cek argumen minimal: [tipe] [@user] [jumlah] -> 3 argumen
        if (!p.args || p.args.length < 3) {
            p.send('**🚫 | Invalid arguments!**\nUsage:\n• `delta give coin @user <amount>`\n• `delta give crystal @user <amount>`');
            return;
        }

        let type = p.args[0].toLowerCase();
        let targetId = p.args[1].replace(/[^0-9]/g, '');
        let amount = parseInt(p.args[2]);

        if (type !== 'coin' && type !== 'coins' && type !== 'crystal' && type !== 'crystals' && type !== 'cash') {
            p.send('**🚫 | Error:** Invalid type! Please specify either `coin` or `crystal`.');
            return;
        }

        if (!targetId) {
            p.send('**🚫 | Error:** User not found! Please tag a valid user.');
            return;
        }

        if (isNaN(amount) || amount <= 0) {
            p.send('**🚫 | Error:** Please enter a valid positive number!');
            return;
        }

        // Proses penambahan Coin
        if (type === 'coin' || type === 'coins' || type === 'cash') {
            let checkUserSql = `SELECT id FROM cowoncy WHERE id = '${targetId}';`;

            p.con.query(checkUserSql, function (err, rows) {
                if (err) {
                    console.error('[DATABASE ERROR]', err);
                    p.send('**🚫 | Database Error:** Failed to query user coin data.');
                    return;
                }

                let updateSql = '';
                if (!rows || rows.length === 0) {
                    updateSql = `INSERT INTO cowoncy (id, money) VALUES ('${targetId}', ${amount});`;
                } else {
                    updateSql = `UPDATE cowoncy SET money = money + ${amount} WHERE id = '${targetId}';`;
                }

                p.con.query(updateSql, function (updateErr) {
                    if (updateErr) {
                        console.error('[DATABASE ERROR]', updateErr);
                        p.send('**🚫 | Database Error:** Failed to update coins.');
                        return;
                    }
                    p.send(`**🪙 | Success!** Added **${p.global.toFancyNum(amount)}** Coins to <@${targetId}>!`);
                });
            });
        } 
        // Proses penambahan Crystal
        else {
            let getUidSql = `SELECT uid FROM user WHERE id = '${targetId}';`;

            p.con.query(getUidSql, function (err, rows) {
                if (err || !rows || rows.length === 0) {
                    console.error('[DATABASE ERROR]', err);
                    p.send('**🚫 | Error:** Target user is not registered in the database.');
                    return;
                }

                let uid = rows[0].uid;
                let updateSql = `INSERT INTO shards (uid, count) VALUES (${uid}, ${amount}) ON DUPLICATE KEY UPDATE count = count + ${amount};`;

                p.con.query(updateSql, function (updateErr) {
                    if (updateErr) {
                        console.error('[DATABASE ERROR]', updateErr);
                        p.send('**🚫 | Database Error:** Failed to update crystals.');
                        return;
                    }
                    p.send(`**💎 | Success!** Added **${p.global.toFancyNum(amount)}** Crystals to <@${targetId}>!`);
                });
            });
        }
    },
});