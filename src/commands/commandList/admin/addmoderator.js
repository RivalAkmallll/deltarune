const CommandInterface = require('../../CommandInterface.js');
const fs = require('fs');
const path = require('path');

module.exports = new CommandInterface({
    alias: ['addmod', 'makemod', 'setmoderator', 'addmoderator'],

    owner: true,
    admin: true,

    desc: 'Adds a user to the bot moderator list (Owner/Admin Only)',

    example: ['del addmod @user', 'del addmod 391800933480398850'],

    permissions: ['sendMessages'],

    group: ['admin'],

    cooldown: 2000,

    execute: async function (p) {
        const executorId = String(p.msg.author ? p.msg.author.id : '');
        const ownerId = String(p.config?.owner || '');
        const adminList = (p.config?.role?.admin || []).map(id => String(id));

        const isAuthorized = executorId === ownerId || adminList.includes(executorId) || p.isOwner || p.isAdmin;

        if (!isAuthorized) {
            await p.send('**🚫 | Access Denied!** Only Bot Owners or Admins can add new moderators.');
            return;
        }

        if (!p.args || p.args.length === 0) {
            await p.send('**🚫 | Invalid Argument!** Usage: `del addmod <@user|userID>`');
            return;
        }

        let targetId = null;
        let match = p.args[0].match(/[0-9]+/);
        if (match) {
            targetId = String(match[0]);
        }

        if (!targetId) {
            await p.send('**🚫 | Invalid User!** Please provide a valid user mention or ID.');
            return;
        }

        let targetUser = await p.fetch.getUser(targetId);
        if (!targetUser) {
            await p.send('**🚫 | User Not Found!** Could not fetch user data.');
            return;
        }

        if (!p.config.role) p.config.role = {};
        if (!Array.isArray(p.config.role.moderator)) p.config.role.moderator = [];

        let currentMods = p.config.role.moderator.map(id => String(id));

        if (currentMods.includes(targetId)) {
            await p.send(`**⚠️ | Notice:** **${targetUser.username}** (\`${targetId}\`) is already a registered moderator.`);
            return;
        }

        // 1. Update In-Memory RAM
        p.config.role.moderator.push(targetId);

        if (p.main && p.main.config) {
            if (!p.main.config.role) p.main.config.role = {};
            if (!Array.isArray(p.main.config.role.moderator)) p.main.config.role.moderator = [];
            let mainMods = p.main.config.role.moderator.map(id => String(id));
            if (!mainMods.includes(targetId)) {
                p.main.config.role.moderator.push(targetId);
            }
        }

        // 2. Save to Database (MySQL)
        try {
            await p.query(`CREATE TABLE IF NOT EXISTS bot_moderators (id VARCHAR(32) PRIMARY KEY);`);
            await p.query(`INSERT IGNORE INTO bot_moderators (id) VALUES ('${targetId}');`);
        } catch (dbErr) {
            console.error('[ADDMOD DB WRITE ERROR]', dbErr);
        }

        // 3. Save to config.json
        try {
            const configPath = path.join(process.cwd(), 'src', 'config.json');
            if (fs.existsSync(configPath)) {
                const currentConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                if (!currentConfig.role) currentConfig.role = {};
                if (!Array.isArray(currentConfig.role.moderator)) currentConfig.role.moderator = [];

                let fileMods = currentConfig.role.moderator.map(id => String(id));
                if (!fileMods.includes(targetId)) {
                    currentConfig.role.moderator.push(targetId);
                    fs.writeFileSync(configPath, JSON.stringify(currentConfig, null, 4));
                }
            }
        } catch (err) {
            console.error('[ADDMOD CONFIG WRITE ERROR]', err);
        }

        await p.send(`🛡️ **| Success!** **${targetUser.username}** (\`${targetId}\`) has been added as a Bot Moderator (Permissions: **warn, ban** [Protected against Owner/Admin]).`);
    },
});