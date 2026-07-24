const CommandInterface = require('../../CommandInterface.js');

const settingEmoji = '🔓';

module.exports = new CommandInterface({
    alias: ['serverunban', 'sunban'],

    args: '{serverID}',

    desc: 'Unban a specific Discord server by its ID to allow bot usage again.',

    example: ['owo serverunban 123456789012345678'],

    related: ['serverban'],

    permissions: ['sendMessages'],

    group: ['admin'],

    cooldown: 0,

    execute: async function (p) {
        try {
            const sendText = async (emoji, text) => {
                const content = `${emoji} ${text}`;
                if (typeof p.replyMsg === 'function') {
                    return p.replyMsg(emoji, text);
                } else if (p.msg && p.msg.channel && typeof p.msg.channel.createMessage === 'function') {
                    return p.msg.channel.createMessage(content);
                }
            };

            const userId = p.msg?.author?.id || p.msg?.member?.id;
            const owners = p.config?.role?.admin || [];
            const botOwner = p.config?.owner;

            const isOwner = owners.includes(userId) || userId === botOwner;
            if (!isOwner) {
                if (typeof p.errorMsg === 'function') {
                    p.errorMsg(", you don't have permission to use this command! >:c", 3000);
                }
                return;
            }

            if (!p.args || p.args.length < 1) {
                await sendText(settingEmoji, 'Please provide a valid server ID! Usage: `serverunban <serverID>`');
                return;
            }

            const targetServerId = p.args[0];

            if (!/^\d{17,20}$/.test(targetServerId)) {
                await sendText(settingEmoji, 'Invalid server ID format!');
                return;
            }

            if (!p.redis || typeof p.redis.hdel !== 'function') {
                await sendText(settingEmoji, 'Database connection error.');
                return;
            }

            const exists = typeof p.redis.hexists === 'function' ? await p.redis.hexists('bot:banned_servers', targetServerId) : true;
            if (!exists) {
                await sendText(settingEmoji, `Server ID **\`${targetServerId}\`** is not in the ban list.`);
                return;
            }

            await p.redis.hdel('bot:banned_servers', targetServerId);

            let guild = null;
            if (p.msg && p.msg.channel && p.msg.channel.guild && p.msg.channel.guild.shard && p.msg.channel.guild.shard.client) {
                guild = p.msg.channel.guild.shard.client.guilds.get(targetServerId);
            }

            if (guild && guild.ownerID) {
                try {
                    let clientInstance = guild.shard ? guild.shard.client : null;
                    if (!clientInstance && p.msg && p.msg.channel && p.msg.channel.guild && p.msg.channel.guild.shard) {
                        clientInstance = p.msg.channel.guild.shard.client;
                    }
                    if (clientInstance) {
                        let ownerUser = clientInstance.users.get(guild.ownerID);
                        if (!ownerUser && typeof clientInstance.getRESTUser === 'function') {
                            ownerUser = await clientInstance.getRESTUser(guild.ownerID).catch(() => null);
                        }
                        if (ownerUser && typeof ownerUser.getDMChannel === 'function') {
                            const dmChannel = await ownerUser.getDMChannel();
                            if (dmChannel && typeof dmChannel.createMessage === 'function') {
                                await dmChannel.createMessage(`🎉 Your server **${guild.name}** (\`${targetServerId}\`) has been unbanned by the bot administrators! You can use the bot again.`);
                            }
                        }
                    }
                } catch (dmErr) {
                    console.error('Failed to DM server owner about unban:', dmErr);
                }
            }

            await sendText(settingEmoji, `Successfully unbanned server ID **\`${targetServerId}\`**.`);

        } catch (error) {
            console.error('CRITICAL ERROR in serverunban command:', error);
            if (typeof p.errorMsg === 'function') {
                p.errorMsg(', an unexpected error occurred.', 5000);
            }
        }
    },
});