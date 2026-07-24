const CommandInterface = require('../../CommandInterface.js');

const settingEmoji = '🎉';

// --- CUSTOMIZATION CONFIG (Ubah teks, emoji, atau warna di sini sesuka lu) ---
const CONFIG = {
    embedColor: 5814783,          // Warna embed (Blurple / Biru Discord)
    endedColor: 15158332,         // Warna embed saat selesai (Merah)
    footerText: 'Giveaway System', // Teks di bawah embed
    messages: {
        newGiveawayTitle: '🎉 **GIVEAWAY STARTED** 🎉',
        newGiveawayContent: '🎉 **NEW GIVEAWAY IS LIVE!** 🎉',
        endedContent: '🎉 **GIVEAWAY HAS ENDED!** 🎉',
        endedTitle: '🎉 **GIVEAWAY ENDED** 🎉',
        reactInstruction: 'React with 🎉 on this message to enter!',
        noParticipants: '❌ No valid participants entered this giveaway!',
        winnerAnnouncement: (winnerId, prize) => `🎉 Congratulations to <@${winnerId}> for winning **${prize}**!`,
        winnerText: (winnerId) => `🏆 **Winner:** <@${winnerId}>!\nCongratulations!`
    }
};

module.exports = new CommandInterface({
    alias: ['giveaway', 'gstart'],

    args: '{duration} {prize}',

    desc: 'Start a customizable giveaway in the current channel.',

    example: ['delta giveaway 1h Discord Nitro', 'delta giveaway 30m 50k Cash'],

    related: ['gdrop', 'gend'],

    permissions: ['sendMessages'],

    group: ['utility', 'social'],

    cooldown: 10000,

    execute: async function (p) {
        try {
            const sendText = async (text) => {
                if (typeof p.replyMsg === 'function') {
                    return p.replyMsg(settingEmoji, text);
                } else if (p.msg && p.msg.channel && typeof p.msg.channel.createMessage === 'function') {
                    return p.msg.channel.createMessage(`${settingEmoji} ${text}`);
                }
            };

            const userId = p.msg?.author?.id || p.msg?.member?.id;

            if (!p.args || p.args.length < 2) {
                await sendText('Invalid format! Use: `delta giveaway <duration> <prize>`\nExample: `delta giveaway 10m Discord Nitro`');
                return;
            }

            const durationStr = p.args[0];
            const prize = p.args.slice(1).join(' ');

            const ms = parseDuration(durationStr);
            if (!ms || ms <= 0) {
                await sendText('Invalid time format! Use `s` (seconds), `m` (minutes), `h` (hours), or `d` (days). Example: `10m`, `1h`.');
                return;
            }

            const endsAt = Date.now() + ms;
            const unixTimestamp = Math.floor(endsAt / 1000);

            const embed = {
                title: CONFIG.messages.newGiveawayTitle,
                description: `Prize: **${prize}**\n\n` +
                             `Hosted by: <@${userId}>\n` +
                             `Ends: <t:${unixTimestamp}:R> (<t:${unixTimestamp}:f>)\n\n` +
                             CONFIG.messages.reactInstruction,
                color: CONFIG.embedColor,
                footer: {
                    text: CONFIG.footerText
                },
                timestamp: new Date().toISOString()
            };

            let giveawayMsg;
            if (p.msg && p.msg.channel && typeof p.msg.channel.createMessage === 'function') {
                giveawayMsg = await p.msg.channel.createMessage({
                    content: CONFIG.messages.newGiveawayContent,
                    embed: embed
                });
                await giveawayMsg.addReaction('🎉').catch(() => {});
            } else {
                return;
            }

            // Timer untuk mengakhiri giveaway secara otomatis
            setTimeout(async () => {
                try {
                    if (giveawayMsg && typeof giveawayMsg.getReaction === 'function') {
                        const reactors = await giveawayMsg.getReaction('🎉', 100).catch(() => []);
                        const validReactors = reactors.filter(user => !user.bot);

                        let resultDescription = '';
                        let chosenWinner = null;

                        if (validReactors.length === 0) {
                            resultDescription = CONFIG.messages.noParticipants;
                        } else {
                            chosenWinner = validReactors[Math.floor(Math.random() * validReactors.length)];
                            resultDescription = CONFIG.messages.winnerText(chosenWinner.id);
                        }

                        const endedEmbed = {
                            title: CONFIG.messages.endedTitle,
                            description: `Prize: **${prize}**\n\n` +
                                         `Hosted by: <@${userId}>\n\n` +
                                         `${resultDescription}`,
                            color: CONFIG.endedColor,
                            footer: { text: CONFIG.footerText }
                        };

                        if (typeof giveawayMsg.edit === 'function') {
                            await giveawayMsg.edit({
                                content: CONFIG.messages.endedContent,
                                embed: endedEmbed
                            });
                        }

                        if (chosenWinner && p.msg && p.msg.channel) {
                            await p.msg.channel.createMessage(CONFIG.messages.winnerAnnouncement(chosenWinner.id, prize));
                        }
                    }
                } catch (endErr) {
                    console.error('Error completing the giveaway:', endErr);
                }
            }, ms);

        } catch (error) {
            console.error('CRITICAL ERROR in giveaway command:', error);
            if (typeof p.errorMsg === 'function') {
                p.errorMsg(', an unexpected error occurred.', 5000);
            }
        }
    },
});

function parseDuration(str) {
    if (!str) return null;
    const match = str.toString().match(/^(\d+)([smhd])$/);
    if (!match) return null;
    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
        case 's': return value * 1000;
        case 'm': return value * 60 * 1000;
        case 'h': return value * 60 * 60 * 1000;
        case 'd': return value * 24 * 60 * 60 * 1000;
        default: return null;
    }
}