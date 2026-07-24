/*
 * OwO Bot for Discord - Avatar Command (Fixed UniqueName & Guild Checks)
 * Copyright (C) 2019 Christopher Thai
 */

const CommandInterface = require('../../CommandInterface.js');

// Safe helper function to resolve user display name
function getUserName(p, user) {
    if (!user) return 'User';
    if (p.global && typeof p.global.getUniqueName === 'function') {
        return p.global.getUniqueName(user);
    }
    if (p.global && typeof p.global.getName === 'function') {
        return p.global.getName(user);
    }
    return user.username || user.name || 'User';
}

module.exports = new CommandInterface({
    alias: ['avatar', 'user', 'av', 'pfp'],

    args: '{@user}',

    desc: "Look at your or other people's avatar!",

    example: ['del avatar @OwO', 'del av'],

    related: [],

    permissions: ['sendMessages', 'embedLinks', 'attachFiles'],

    group: ['social'],

    appCommands: [
        {
            'name': 'avatar',
            'type': 1,
            'description': 'Display your avatar',
            'options': [
                {
                    'type': 6,
                    'name': 'user',
                    'description': "Display a user's avatar",
                },
            ],
            'integration_types': [0, 1],
            'contexts': [0, 1, 2],
        },
        {
            'type': 2,
            'name': 'Display avatar',
            'dm_permission': true,
            'integration_types': [0, 1],
            'contexts': [0, 1, 2],
        },
    ],

    cooldown: 2000,
    half: 100,
    six: 500,

    execute: async function (p) {
        let user;

        // 1. Resolve Target User Safely
        if (p.options && p.options.user) {
            user = p.options.user;
        } else if (!p.args || p.args.length === 0) {
            user = p.msg.author;
        } else if (p.global && (p.global.isUser(p.args[0]) || p.global.isInt(p.args[0]))) {
            let match = p.args[0].match(/[0-9]+/);
            if (match) {
                let id = match[0];
                user = await p.fetch.getUser(id);
            }
        }

        if (!user) {
            if (typeof p.errorMsg === 'function') {
                p.errorMsg(', I failed to fetch user information... sowwy', 3000);
            } else {
                await p.send('**🚫 | Error:** Failed to fetch user information.');
            }
            return;
        }

        // 2. Resolve Avatar URL
        let avatarURL = '';
        if (typeof user.dynamicAvatarURL === 'function') {
            avatarURL = user.dynamicAvatarURL(null, 1024);
        } else if (typeof user.avatarURL === 'string') {
            avatarURL = user.avatarURL;
        } else {
            avatarURL = `https://cdn.discordapp.com/embed/avatars/0.png`;
        }

        // 3. Construct Embed Object
        let userName = getUserName(p, user);
        let isBot = user.bot ? ' <:bot:489278383646048286>' : '';

        let embed = {
            fields: [
                {
                    name: userName + isBot,
                    value: '`ID: ' + user.id + '`',
                },
            ],
            color: p.config?.embed_color || 0x3498db,
            image: { url: avatarURL },
        };

        // 4. Safely Fetch Guild Member Details if Available
        const guild = p.msg.channel ? p.msg.channel.guild : (p.msg.guild || null);
        if (guild && p.fetch && typeof p.fetch.getMember === 'function') {
            try {
                let member = await p.fetch.getMember(guild, user.id);
                if (member) {
                    let hex = (p.global && typeof p.global.getRoleColor === 'function') 
                        ? p.global.getRoleColor(member) 
                        : null;
                    let memberStatus = !member.status ? 'offline' : member.status;

                    embed.fields[0].value =
                        (member.nick ? '`Nickname: ' + member.nick + '`\n' : '') +
                        '`ID: ' + member.id + '`' +
                        (hex ? '\n`RoleColor: ' + hex + '`' : '');
                    embed.fields[0].name += ' `' + memberStatus + '`';
                }
            } catch (err) {
                // Ignore member fetch errors on DMs / missing permissions
            }
        }

        // 5. Send Embed Response
        await p.send({ embed });
    },
});