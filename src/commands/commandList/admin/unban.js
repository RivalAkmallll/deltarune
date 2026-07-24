/*
 * OwO Bot Admin Unban All Command with Clean Reason Handling
 */

const CommandInterface = require('../../CommandInterface.js');

module.exports = new CommandInterface({
    alias: ['unban', 'unbanall', 'botunban'],

    owner: true,
    admin: true,

    desc: 'Unbans all currently banned users from the database and sends them a DM notification',

    example: ['del unban Spamming cleanup', 'del unbanall'],

    execute: async function (p) {
        // 1. Strict Owner & Admin Authorization Check
        const executorId = p.msg.author.id;
        const ownerId = p.config?.owner;
        const adminList = p.config?.role?.admin || [];
        const isAuthorized = executorId === ownerId || adminList.includes(executorId) || p.isOwner || p.isAdmin;

        if (!isAuthorized) {
            await p.send('**🚫 | Access Denied!** Only registered bot admins can execute this command.');
            return;
        }

        // 2. Extract Reason argument & Filter out user mentions/IDs
        if (p.args && p.args.length > 0) {
            // Jika argumen pertama berupa Tag Mention (@user) atau ID Angka, buang dari p.args
            if (p.args[0].startsWith('<@') || /^\d+$/.test(p.args[0])) {
                p.args.shift();
            }
        }

        const hasReason = p.args && p.args.length > 0;
        const reason = hasReason ? p.args.join(' ').trim() : 'None';

        // 3. Fetch list of banned user IDs before deletion
        const fetchSql = `SELECT id FROM timeout;`;
        let bannedUsers = [];

        try {
            bannedUsers = await p.query(fetchSql);
        } catch (err) {
            console.error('[DATABASE ERROR in unban.js - Fetch]', err);
            await p.send('**🚫 | Database Error:** Failed to fetch banned users list.');
            return;
        }

        if (!bannedUsers || bannedUsers.length === 0) {
            await p.send('**ℹ️ | Information:** There are currently no banned users in the database.');
            return;
        }

        // 4. Delete all records from 'timeout' table
        const deleteSql = `DELETE FROM timeout;`;

        try {
            await p.query(deleteSql);
        } catch (dbErr) {
            console.error('[DATABASE ERROR in unban.js - Delete]', dbErr);
            await p.send('**🚫 | Database Error:** Failed to clear banned users from the database.');
            return;
        }

        // 5. Send Second Chance DM Notification
        let dmSuccessCount = 0;
        let dmFailedCount = 0;

        const dmMessage = 
            `🎉 **| You have been unbanned from the bot!**\n` +
            `You have been granted a **second chance** to access the bot features. Please make sure to follow the rules and refrain from breaking them again, as future bans may be permanent.\n\n` +
            `**Reason:** ${reason}`;

        for (const userRow of bannedUsers) {
            const targetUserId = userRow.id;
            try {
                const userObj = await p.sender.msgUser(targetUserId, dmMessage);
                if (userObj && !userObj.dmError) {
                    dmSuccessCount++;
                } else {
                    dmFailedCount++;
                }
            } catch (dmErr) {
                dmFailedCount++;
            }
        }

        // 6. Output Summary Message
        let text = `✅ **| Mass Unban Executed Successfully!**\n`;
        text += `• **Total Unbanned:** **${bannedUsers.length}** user(s)\n`;
        text += `• **Reason:** ${reason}\n`;
        text += `• **DM Notifications:** Sent to **${dmSuccessCount}** user(s) (${dmFailedCount} failed/DMs closed)\n`;
        text += `• **Executed By:** <@${executorId}>`;

        await p.send(text);
    },
});