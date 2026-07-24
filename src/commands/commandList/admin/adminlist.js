const CommandInterface = require('../../CommandInterface.js');

module.exports = new CommandInterface({
    alias: ['adminlist', 'listadmin', 'admins', 'modlist'],

    owner: true,
    admin: true,

    desc: 'Displays the modern interactive list of bot administrators and moderators',

    example: ['del adminlist'],

    permissions: ['sendMessages', 'embedLinks'],

    group: ['admin'],

    cooldown: 3000,

    execute: async function (p) {
        const executorId = String(p.msg.author ? p.msg.author.id : '');
        const ownerId = String(p.config?.owner || '');
        const configAdmins = (p.config?.role?.admin || []).map(id => String(id));
        const configMods = (p.config?.role?.moderator || []).map(id => String(id));

        const isAuthorized = executorId === ownerId || configAdmins.includes(executorId) || p.isOwner || p.isAdmin;

        if (!isAuthorized) {
            await p.send('**🚫 | Access Denied!** Only registered bot admins can view the personnel list.');
            return;
        }

        // 1. Kumpulkan Admin dari Config & DB
        let adminSet = new Set([ownerId, ...configAdmins]);
        try {
            await p.query(`CREATE TABLE IF NOT EXISTS bot_admins (id VARCHAR(32) PRIMARY KEY);`);
            const adminRows = await p.query(`SELECT id FROM bot_admins;`);
            if (adminRows && adminRows.length > 0) {
                for (let row of adminRows) {
                    if (row.id) adminSet.add(String(row.id));
                }
            }
        } catch (dbErr) {
            console.error('[ADMINLIST DB FETCH ERROR]', dbErr);
        }

        // 2. Kumpulkan Moderator dari Config & DB
        let modSet = new Set([...configMods]);
        try {
            await p.query(`CREATE TABLE IF NOT EXISTS bot_moderators (id VARCHAR(32) PRIMARY KEY);`);
            const modRows = await p.query(`SELECT id FROM bot_moderators;`);
            if (modRows && modRows.length > 0) {
                for (let row of modRows) {
                    if (row.id) modSet.add(String(row.id));
                }
            }
        } catch (dbErr) {
            console.error('[MODLIST DB FETCH ERROR]', dbErr);
        }

        const allAdminIds = Array.from(adminSet).filter(id => id && id.trim() !== '');
        const allModIds = Array.from(modSet).filter(id => id && id.trim() !== '');

        if (allAdminIds.length === 0 && allModIds.length === 0) {
            await p.send({
                embed: {
                    title: '🛠️ | Bot Personnel Directory',
                    description: 'No administrators or moderators registered in the system.',
                    color: 0xe74c3c,
                }
            });
            return;
        }

        let fields = [];

        // Helper untuk cek status user (Online/Offline) dan buat format tampilan
        async function formatPersonnel(userId, roleType, index) {
            let userObj = await p.fetch.getUser(userId);
            let username = userObj ? userObj.username : 'Unknown User';
            let tag = userObj && userObj.discriminator && userObj.discriminator !== '0' ? `#${userObj.discriminator}` : '';
            
            // Cek status kehadiran jika guild/client mendukung cache presence
            let statusBadge = '⚫ Offline';
            try {
                const member = p.msg.guild ? p.msg.guild.members.get(userId) : null;
                if (member && member.status && member.status !== 'offline') {
                    statusBadge = '🟢 Online';
                } else if (userObj && userObj.presence && userObj.presence.status && userObj.presence.status !== 'offline') {
                    statusBadge = '🟢 Online';
                }
            } catch (e) {
                // Fallback jika status tidak terdeteksi
                statusBadge = '⚪ Active / Status Hidden';
            }

            let badge = '';
            let permissionsText = '';

            if (roleType === 'owner') {
                badge = '👑 **Bot Owner (Root)**';
                permissionsText = 'Full Access (All Permissions)';
            } else if (roleType === 'admin') {
                badge = '🛡️ **Bot Administrator**';
                permissionsText = 'Administrative Commands Access';
            } else {
                badge = '⚔️ **Bot Moderator**';
                permissionsText = 'Permissions: `warn`, `ban` (Protected against Admin/Owner)';
            }

            let reportLink = `[DM to Report](https://discord.com/users/${userId})`;

            return {
                name: `#${index} | ${username}${tag}`,
                value: `${badge}\n• **Status:** ${statusBadge}\n• **Permissions:** ${permissionsText}\n• **Contact:** ${reportLink}`,
                inline: false,
            };
        }

        // Masukkan Administrator & Owner ke Fields
        let counter = 1;
        for (let adminId of allAdminIds) {
            let roleType = (adminId === ownerId) ? 'owner' : 'admin';
            let formattedField = await formatPersonnel(adminId, roleType, counter++);
            fields.push(formattedField);
        }

        // Masukkan Moderator ke Fields (Tampil di bawah Admin)
        for (let modId of allModIds) {
            let formattedField = await formatPersonnel(modId, 'mod', counter++);
            fields.push(formattedField);
        }

        const embed = {
            title: `👑 Bot Management & Staff Directory`,
            description: `Official directory of authorized bot administrators and moderators. You can click **"DM to Report"** to reach out directly.`,
            color: 0x3498db,
            fields: fields,
            footer: {
                text: `Requested by ${p.msg.author.username}`,
                icon_url: p.msg.author.avatarURL,
            },
            timestamp: new Date().toISOString(),
        };

        await p.send({ embed });
    },
});