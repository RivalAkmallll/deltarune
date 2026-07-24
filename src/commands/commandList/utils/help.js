/*
 * OwO Bot for Discord
 * Copyright (C) 2019 Christopher Thai
 * This software is licensed under Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International
 * For more information, see README.md and LICENSE
 */

const CommandInterface = require('../../CommandInterface.js');

const battleHelpUtil = require('../battle/util/battleHelpUtil.js');
const emotes = require('../../../data/emotes.json');
let sEmotes = [];
for (let key in emotes.sEmote) sEmotes.push(key);
sEmotes = '`' + sEmotes.join('`  `') + '`';
let uEmotes = [];
for (let key in emotes.uEmote) uEmotes.push(key);
uEmotes.pop();
uEmotes.pop();
uEmotes = '`' + uEmotes.join('`  `') + '`';

module.exports = new CommandInterface({
    alias: ['help'],

    args: '{command}',

    desc: 'This displays the commands or more info on a specific command',

    example: ['del help cowoncy', 'del help'],

    permissions: ['sendMessages', 'embedLinks'],

    group: ['utility'],

    related: [],

    appCommands: [
        {
            'name': 'help',
            'type': 1,
            'description': 'OwO, do you need some help~?',
            'integration_types': [0, 1],
            'contexts': [0, 1, 2],
        },
    ],

    cooldown: 1000,
    half: 100,
    six: 500,

    execute: async function (p) {
        // Cek Pengecekan Admin/Owner secara langsung dari config & param
        const userId = p.msg.author.id;
        const adminList = (p.config && p.config.role && p.config.role.admin) || [];
        const ownerId = p.config && p.config.owner;
        
        const isAdmin = p.isAdmin || p.isOwner || userId === ownerId || adminList.includes(userId);

        if (!p.args || p.args.length === 0) {
            console.log(`[HELP LOG] User ${p.msg.author.username} (${userId}) membuka menu 'del help'. Status Admin: ${isAdmin}`);
            display(p, isAdmin);
        } else {
            let targetArg = p.args[0].toLowerCase();
            let command = p.aliasToCommand[targetArg];

            console.log(`[HELP LOG] User ${p.msg.author.username} (${userId}) mencari info spesifik command: "${targetArg}"`);

            if (!command || !p.commands[command]) {
                console.warn(`[HELP WARNING] Command "${targetArg}" TIDAK DITEMUKAN di database bot!`);
                p.send('**🚫 |** Could not find that command :c');
                return;
            }

            switch (command) {
                case 'battle':
                    await battleHelpUtil.help(p, 0);
                    break;
                case 'team':
                    await battleHelpUtil.help(p, 0);
                    break;
                case 'weapon':
                    await battleHelpUtil.help(p, 2);
                    break;
                case 'crate':
                    await battleHelpUtil.help(p, 1);
                    break;
                case 'battlesetting':
                    await battleHelpUtil.help(p, 5);
                    break;
                case 'weaponshard':
                    await battleHelpUtil.help(p, 6);
                    break;
                default:
                    describe(p, p.send, targetArg, p.commands[command]);
            }
        }
    },
});

function display(p, isAdmin) {
    let fields = [
        { name: '🎖 Rankings', value: '`top`  `my`' },
        {
            name: '💰 Economy',
            value: '`cowoncy`  `give`  `daily`  `vote`  `quest`  `checklist`  `shop`  `buy`',
        },
        {
            name: '🌱 Animals',
            value:
                '`zoo`  `hunt`  `sell`  `sacrifice`  `battle`  `inv`  `equip`  `autohunt`  `owodex`  `lootbox`  `crate`  `battlesetting`  `team`  `weapon`  `rename` `dismantle`',
        },
        {
            name: '🎲 Gambling',
            value: '`slots`  `coinflip`  `lottery`  `blackjack`',
        },
        {
            name: '🎱 Fun',
            value: '`8b`  `define`  `gif`  `pic`  `translate`  `roll`  `choose`  `bell`',
        },
        {
            name: '🎭 Social',
            value:
                '`cookie` `ship`  `pray`  `curse`  `marry`  `emoji`  `profile`  `level`  `wallpaper`  `owoify`  `avatar`',
        },
        {
            name: '😂 Meme Generation',
            value:
                '`spongebobchicken`  `slapcar`  `isthisa`  `drake`  `distractedbf`  `communismcat`  `eject`  `emergencymeeting`  `headpat`  `tradeoffer`  `waddle`',
        },
        { name: '🙂 Emotes', value: sEmotes },
        { name: '🤗 Actions', value: uEmotes + '  `bully`' },
        {
            name: '🔧 Utility',
            value:
                '`ping`  `stats`  `link`  `guildlink`  `disable`  `censor`  `patreon`  `announcement`  `rules`  `suggest`  `shards`  `math`  `color`  `prefix`',
        },
    ];

    // Jika user terdeteksi Admin/Owner, tambahkan Secret Only Commands di menu Help
    if (isAdmin) {
        fields.push({
            name: '🔒 Admin Commands (Secret)',
            value: '`adminprofile`  `ahelp`',
        });
    }

    let embed = {
        description:
            'Here is the list of commands!\nFor more info on a specific command, use `del help {command}`\nNeed more help? Come join our [guild](' +
            p.config.guildlink +
            ')',
        color: p.config.embed_color,
        author: { name: 'Command List' + (isAdmin ? ' (Admin View)' : ''), icon_url: p.msg.author.avatarURL },
        fields: fields,
    };

    p.send({ embed });
}

async function describe(p, send, commandName, command) {
    if (command == undefined) {
        console.warn(`[HELP WARNING] Gagal memberikan deskripsi. Command "${commandName}" undefined.`);
        send('**🚫 |** Could not find that command :c');
        return;
    }
    let desc = '\n# Description\n' + command.desc;
    let example = '';
    let related = '';
    let alias = '';
    let title = '< del ' + commandName + ' ';
    if (command.args != '') title += command.args + ' >';
    else title += '>';
    if (command.alias && command.alias[1] != undefined) {
        alias = '\n# Aliases\n';
        for (let i = 0; i < command.alias.length; i++) alias += command.alias[i] + ' , ';
        alias = alias.substr(0, alias.length - 3);
    }
    if (command.example && command.example[0] != undefined) {
        example = '\n# Example Command(s)\n';
        for (let i = 0; i < command.example.length; i++) example += command.example[i] + ' , ';
        example = example.substr(0, example.length - 3);
    }
    if (command.related && command.related[0] != undefined) {
        related = '\n# Related Command(s)\n';
        for (let i = 0; i < command.related.length; i++) related += command.related[i] + ' , ';
        related = related.substr(0, related.length - 3);
    }

    let ids = desc.match(/\?[0-9]+\?/g);
    for (let i in ids) {
        let descID = ids[i].match(/[0-9]+/);
        let tempUser = await p.fetch.getUser(descID[0]);
        desc = desc.replace('?' + descID + '?', tempUser ? tempUser.username : 'A User');
    }

    let text =
        '```md\n' +
        title +
        '``````md' +
        alias +
        desc +
        example +
        related +
        '``````md\n> Remove brackets when typing commands\n> [] = optional arguments\n> {} = optional user input```';
    send(text);
}