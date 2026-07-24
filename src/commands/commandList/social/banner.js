/*
 * OwO Bot for Discord
 * Copyright (C) 2019 Christopher Thai
 * This software is licensed under Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International
 * For more information, see README.md and LICENSE
 */

const CommandInterface = require('../../CommandInterface.js');

module.exports = new CommandInterface({
    alias: ['banner', 'getbanner'],

    args: '{@user/id}',

    desc: 'Check a user Discord profile banner with proper full user fetch and non-nitro fallback support.',

    example: ['delta banner @User', 'delta banner 708218077413769257'],

    related: ['delta profile', 'delta avatar'],

    permissions: ['sendMessages', 'embedLinks', 'addReactions'],

    group: ['utility', 'fun'],

    cooldown: 5000,

    execute: async function (p) {
        let args = p.args;
        let targetId = null;

        if (args[0]) {
            let cleanId = args[0].replace(/[^0-9]/g, '');
            if (cleanId.length >= 17 && cleanId.length <= 19) {
                targetId = cleanId;
            }
        }

        if (!targetId && p.msg.mentions && p.msg.mentions.length > 0) {
            targetId = p.msg.mentions[0].id;
        }

        if (!targetId) {
            targetId = p.msg.author.id;
        }

        // Fungsi fetch lengkap menggunakan rest / client fetch agar properti banner / profile lengkap ke-load
        async function fetchFullDiscordUser(userId) {
            try {
                if (p.client) {
                    if (p.client.users && typeof p.client.users.fetch === 'function') {
                        let u = await p.client.users.fetch(userId, { force: true }).catch(() => null);
                        if (u) return u;
                    }
                    if (typeof p.client.fetchUser === 'function') {
                        let u = await p.client.fetchUser(userId).catch(() => null);
                        if (u) return u;
                    }
                }

                if (typeof p.fetchUser === 'function') {
                    let u = await p.fetchUser(userId).catch(() => null);
                    if (u) return u;
                }

                if (p.msg && p.msg.channel && p.msg.channel.guild) {
                    let member = p.msg.channel.guild.members.get(userId);
                    if (member) return member;
                }
            } catch (e) {
                // Ignore
            }
            return null;
        }

        let userObj = await fetchFullDiscordUser(targetId);
        let realUsername = userObj ? (userObj.globalName || userObj.username) : `User-${targetId}`;

        // Cek banner URL (Nitro / Custom Banner)
        let bannerUrl = null;
        if (userObj) {
            if (typeof userObj.bannerURL === 'function') {
                bannerUrl = userObj.bannerURL({ size: 1024, dynamic: true });
            } else if (userObj.banner) {
                let ext = userObj.banner.startsWith('a_') ? 'gif' : 'png';
                bannerUrl = `https://cdn.discordapp.com/banners/${targetId}/${userObj.banner}.${ext}?size=1024`;
            }
        }

        let embed = {};

        if (bannerUrl) {
            embed = {
                title: `🖼️ Profile Banner: ${realUsername}`,
                description: `Here is the custom profile banner for **${realUsername}** (<@${targetId}>).\n\n` +
                             `*Direct Link:* [Click Here to Open Banner](${bannerUrl})`,
                color: userObj && userObj.accentColor ? userObj.accentColor : 0x7289DA,
                image: {
                    url: bannerUrl
                },
                footer: {
                    text: `Requested by ${p.getName()} • Banner Utility (Custom Banner)`
                },
                timestamp: new Date()
            };
        } else {
            // Fallback jika tidak ada banner kustom (menggunakan warna aksen / tema profil)
            let accentColorHex = (userObj && userObj.accentColor) ? userObj.accentColor.toString(16).padStart(6, '0') : '7289da';
            let avatarUrl = '';
            
            if (userObj) {
                if (typeof userObj.avatarURL === 'function') {
                    avatarUrl = userObj.avatarURL({ size: 512 });
                } else if (userObj.avatar) {
                    let ext = userObj.avatar.startsWith('a_') ? 'gif' : 'png';
                    avatarUrl = `https://cdn.discordapp.com/avatars/${targetId}/${userObj.avatar}.${ext}?size=512`;
                }
            }
            if (!avatarUrl) {
                avatarUrl = `https://cdn.discordapp.com/embed/avatars/0.png`;
            }

            let fallbackBannerUrl = `https://singlebox.github.io/discord-banner-generator/?user=${targetId}&color=${accentColorHex}&avatar=${encodeURIComponent(avatarUrl)}`;

            embed = {
                title: `🖼️ Profile Banner: ${realUsername}`,
                description: `**${realUsername}** (<@${targetId}>) does not have a custom banner, so here is their generated profile banner based on their theme color!`,
                color: userObj && userObj.accentColor ? userObj.accentColor : 0x7289DA,
                image: {
                    url: fallbackBannerUrl
                },
                footer: {
                    text: `Requested by ${p.getName()} • Banner Utility (Theme Fallback)`
                },
                timestamp: new Date()
            };
        }

        p.send({ embed });
    },
});