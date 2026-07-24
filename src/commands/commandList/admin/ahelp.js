const CommandInterface = require('../../CommandInterface.js');

module.exports = new CommandInterface({
    alias: ['ahelp', 'adminhelp', 'cmdadmin'],

    owner: true,
    admin: true,

    desc: 'Displays the complete list of available admin commands split into multiple clean embeds',

    example: ['del ahelp'],

    permissions: ['sendMessages', 'embedLinks'],

    group: ['admin'],

    cooldown: 3000,

    execute: async function (p) {
        const executorId = String(p.msg.author ? p.msg.author.id : '');
        const ownerId = String(p.config?.owner || '');
        const adminList = (p.config?.role?.admin || []).map(id => String(id));

        const isAuthorized = executorId === ownerId || adminList.includes(executorId) || p.isOwner || p.isAdmin;

        if (!isAuthorized) {
            await p.send('**🚫 | Access Denied!** Only registered bot admins can view the admin command list.');
            return;
        }

        const adminCmds = p.adminCommands || {};
        const registeredObjects = new Set();
        const uniqueAdminCmds = [];

        for (let aliasKey in adminCmds) {
            const cmdObj = adminCmds[aliasKey];
            if (cmdObj && !registeredObjects.has(cmdObj)) {
                registeredObjects.add(cmdObj);
                uniqueAdminCmds.push(cmdObj);
            }
        }

        if (uniqueAdminCmds.length === 0) {
            await p.send('**🛠️ | Admin Help:** No admin commands registered in the loader.');
            return;
        }

        // Bagi command menjadi 3 bagian (chunks)
        const totalCmds = uniqueAdminCmds.length;
        const chunkSize = Math.ceil(totalCmds / 3);
        const chunks = [];

        for (let i = 0; i < totalCmds; i += chunkSize) {
            chunks.push(uniqueAdminCmds.slice(i, i + chunkSize));
        }

        // Hapus pesan command user agar chat tetap rapi
        if (p.msg && typeof p.msg.delete === 'function') {
            await p.msg.delete().catch(() => {});
        }

        // Kirim konfirmasi singkat di awal
        await p.send(`🛠️ **| BOT ADMINISTRATIVE COMMANDS (${totalCmds} Total)** — Sending in ${chunks.length} parts:`);

        // Loop dan kirim setiap bagian sebagai embed terpisah
        for (let idx = 0; idx < chunks.length; idx++) {
            const chunk = chunks[idx];
            let fields = [];

            for (let j = 0; j < chunk.length; j++) {
                const cmd = chunk[j];
                const mainAlias = Array.isArray(cmd.alias) ? cmd.alias[0] : cmd.alias;
                const aliases = Array.isArray(cmd.alias) ? cmd.alias.join(', ') : (cmd.alias || 'N/A');
                const description = cmd.desc || 'No description provided.';

                let usage = `del ${mainAlias}`;
                if (cmd.args) usage += ` ${cmd.args}`;

                fields.push({
                    name: `#${(idx * chunkSize) + j + 1} | ${usage}`,
                    value: `• **Aliases:** \`${aliases}\`\n• **Info:** ${description}`,
                    inline: false,
                });
            }

            const embed = {
                title: `👑 Admin Commands Directory (Part ${idx + 1} of ${chunks.length})`,
                description: `Showing commands ${(idx * chunkSize) + 1} to ${(idx * chunkSize) + chunk.length} of ${totalCmds}.`,
                color: 0x3498db,
                fields: fields,
                footer: {
                    text: `Requested by ${p.msg.author.username}`,
                    icon_url: p.msg.author.avatarURL,
                },
            };

            await p.send({ embed });
        }
    },
});