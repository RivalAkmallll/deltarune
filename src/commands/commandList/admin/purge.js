const CommandInterface = require('../../CommandInterface.js');

module.exports = new CommandInterface({
    alias: ['purge', 'clear', 'clean'],

    owner: false,
    admin: true,

    desc: 'Purges a specified number of messages from the current channel',

    example: ['delta purge 50', 'delta clear 10'],

    permissions: ['manageMessages', 'sendMessages'],

    group: ['moderation'],

    cooldown: 3000,

    execute: async function (p) {
        // Ambil angka dari teks input secara langsung biar gak peduli format p.args
        let amount = 10;
        const fullText = (p.msg.content || '').trim();
        const parts = fullText.split(/\s+/);
        
        if (parts.length > 2) {
            let parsed = parseInt(parts[2]);
            if (!isNaN(parsed) && parsed > 0) {
                amount = Math.min(parsed, 100);
            }
        } else if (p.args && p.args.length > 0) {
            let parsed = parseInt(p.args[0]);
            if (!isNaN(parsed) && parsed > 0) {
                amount = Math.min(parsed, 100);
            }
        }

        try {
            let channel = p.msg.channel;
            const channelId = String(p.msg.channel_id || channel?.id || '');

            if (!channel && typeof p.fetch?.getChannel === 'function') {
                channel = await p.fetch.getChannel(channelId);
            }

            if (!channel) {
                await p.send('**🚫 | Error:** Channel object not found.');
                return;
            }

            // Hapus pesan command dari user
            if (p.msg && typeof p.msg.delete === 'function') {
                await p.msg.delete().catch(() => {});
            }

            if (typeof channel.bulkDelete === 'function') {
                const fetched = await channel.messages.fetch({ limit: amount }).catch(() => null);
                if (fetched && fetched.size > 0) {
                    await channel.bulkDelete(fetched, true);
                    const sentMsg = await channel.send(`🧹 **| Successfully purged ${fetched.size} messages!**`).catch(() => null);
                    if (sentMsg && typeof sentMsg.delete === 'function') {
                        setTimeout(() => sentMsg.delete().catch(() => {}), 3000);
                    }
                } else {
                    await p.send('**⚠️ | Notice:** No messages found or messages are older than 14 days.');
                }
            } else {
                await p.send('**❌ | Error:** `bulkDelete` is not supported in this environment.');
            }

        } catch (err) {
            console.error('[PURGE ERROR]', err);
            await p.send('**❌ | Failed to purge.** Ensure bot has `Manage Messages` permission.');
        }
    },
});