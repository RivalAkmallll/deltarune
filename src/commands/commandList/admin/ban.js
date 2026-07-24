/*
 * OwO Bot Admin Ban Command (Fixed Parser)
 */

const CommandInterface = require('../../CommandInterface.js');

const banEmoji = '<:ban:444365501708107786>';

module.exports = new CommandInterface({
    alias: ['ban', 'botban'],

    owner: true,
    admin: true,

    desc: 'Bans a user with custom duration and reason',

    execute: async function (p) {
        // 1. Permisssion Check (Owner / Admin Only)
        const executorId = p.msg.author.id;
        const ownerId = p.config?.owner;
        const adminList = p.config?.role?.admin || [];
        const isAuthorized = executorId === ownerId || adminList.includes(executorId) || p.isOwner || p.isAdmin;

        if (!isAuthorized) {
            await p.send('**🚫 | Access Denied!** Only registered bot admins can execute this command.');
            return;
        }

        // 2. Argument Validation
        if (!p.args || p.args.length === 0) {
            await p.send('**🚫 | Invalid usage!** Format: `del ban <@User/UserID> [duration] [reason]`\n*Example:* `del ban @Bryan 7d Spamming` or `del ban 391800933480398850 perm`');
            return;
        }

        // 3. Extract Target User ID
        const rawTarget = p.args.shift();
        const targetUserId = rawTarget.replace(/[^0-9]/g, '');

        if (!targetUserId || targetUserId.length < 15) {
            await p.send('**🚫 | Error:** Please provide a valid user mention or numeric User ID.');
            return;
        }

        // 4. Extract Duration (Default: 999999 days if omitted or set to 'perm')
        let banHours = 999999 * 24; // Default permanent limit
        let durationText = 'Permanently';

        if (p.args.length > 0) {
            const maybeDuration = p.args[0].toLowerCase();

            // Match days (e.g. '7d', '999d')
            if (maybeDuration.endsWith('d')) {
                const days = parseInt(maybeDuration.replace('d', ''));
                if (!isNaN(days) && days > 0 && days <= 999999) {
                    banHours = days * 24;
                    durationText = `for **${days} day(s)**`;
                    p.args.shift(); // Remove duration argument
                }
            } 
            // Match hours (e.g. '12h', '24h')
            else if (maybeDuration.endsWith('h')) {
                const hours = parseInt(maybeDuration.replace('h', ''));
                if (!isNaN(hours) && hours > 0) {
                    banHours = hours;
                    durationText = `for **${hours} hour(s)**`;
                    p.args.shift();
                }
            }
            // Match 'perm' / 'permanent'
            else if (maybeDuration === 'perm' || maybeDuration === 'permanent') {
                p.args.shift();
            }
        }

        // 5. Extract Reason
        const reason = p.args.join(' ').trim() || 'No reason provided by Admin.';

        // 6. Execute SQL Query
        const sql = `
            INSERT INTO timeout (id, time, count, penalty) 
            VALUES (${targetUserId}, NOW(), 1, ${banHours}) 
            ON DUPLICATE KEY UPDATE time = NOW(), count = count + 1, penalty = ${banHours};
        `;

        try {
            await p.query(sql);
        } catch (dbErr) {
            console.error('[DATABASE ERROR in ban.js]', dbErr);
            await p.send('**🚫 | Database Error:** Failed to save ban status.');
            return;
        }

        // 7. DM Notification
        let dmStatus = '✅ Notification Sent';
        const dmMessage = `☠ **| You have been banned ${durationText} from the bot!**\n**Reason:** ${reason}`;

        try {
            const userObj = await p.sender.msgUser(targetUserId, dmMessage);
            if (!userObj || userObj.dmError) {
                dmStatus = '⚠️ Could not DM User (DMs Closed)';
            }
        } catch (e) {
            dmStatus = '⚠️ Could not DM User';
        }

        // 8. Output Response
        let text = `${banEmoji} **| User Banned Successfully!**\n`;
        text += `• **Target User:** <@${targetUserId}> (\`${targetUserId}\`)\n`;
        text += `• **Duration:** ${durationText}\n`;
        text += `• **Reason:** ${reason}\n`;
        text += `• **Status:** ${dmStatus}`;

        await p.send(text);
    },
});