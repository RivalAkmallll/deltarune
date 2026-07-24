const CommandInterface = require('../../CommandInterface.js');
const fs = require('fs');
const path = require('path');

module.exports = new CommandInterface({
    alias: ['addadmin', 'makeadmin', 'setadmin'],

    owner: true,

    desc: 'Adds a user to the bot admin list (Owner Only)',

    example: ['del addadmin @user', 'del addadmin 391800933480398850'],

    permissions: ['sendMessages'],

    group: ['admin'],

    cooldown: 2000,

    execute: async function (p) {
        const executorId = String(p.msg.author ? p.msg.author.id : '');
        const ownerId = String(p.config?.owner || '');

        if (executorId !== ownerId && !p.isOwner) {
            await p.send('**🚫 | Access Denied!** Only the Bot Owner can add new admins.');
            return;
        }

        if (!p.args || p.args.length === 0) {
            await p.send('**🚫 | Invalid Argument!** Usage: `del addadmin <@user|userID>`');
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
        if (!Array.isArray(p.config.role.admin)) p.config.role.admin = [];

        let currentAdmins = p.config.role.admin.map(id => String(id));

        if (currentAdmins.includes(targetId)) {
            await p.send(`**⚠️ | Notice:** **${targetUser.username}** (\`${targetId}\`) is already a registered admin.`);
            return;
        }

        // 1. Update In-Memory RAM
        p.config.role.admin.push(targetId);

        if (p.main && p.main.config) {
            if (!p.main.config.role) p.main.config.role = {};
            if (!Array.isArray(p.main.config.role.admin)) p.main.config.role.admin = [];
            let mainAdmins = p.main.config.role.admin.map(id => String(id));
            if (!mainAdmins.includes(targetId)) {
                p.main.config.role.admin.push(targetId);
            }
        }

        // 2. Save to Database (MySQL)
        try {
            await p.query(`CREATE TABLE IF NOT EXISTS bot_admins (id VARCHAR(32) PRIMARY KEY);`);
            await p.query(`INSERT IGNORE INTO bot_admins (id) VALUES ('${targetId}');`);
        } catch (dbErr) {
            console.error('[ADDADMIN DB WRITE ERROR]', dbErr);
        }

        // 3. Save to config.json
        try {
            const configPath = path.join(process.cwd(), 'src', 'config.json');
            if (fs.existsSync(configPath)) {
                const currentConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                if (!currentConfig.role) currentConfig.role = {};
                if (!Array.isArray(currentConfig.role.admin)) currentConfig.role.admin = [];

                let fileAdmins = currentConfig.role.admin.map(id => String(id));
                if (!fileAdmins.includes(targetId)) {
                    currentConfig.role.admin.push(targetId);
                    fs.writeFileSync(configPath, JSON.stringify(currentConfig, null, 4));
                }
            }
        } catch (err) {
            console.error('[ADDADMIN CONFIG WRITE ERROR]', err);
        }

        await p.send(`✅ **| Success!** **${targetUser.username}** (\`${targetId}\`) has been added as a Bot Admin and saved to Database!`);
    },
});