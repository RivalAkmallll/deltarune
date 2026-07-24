/*
 * OwO Bot for Discord - Upgraded Embed Leaderboard System
 * Copyright (C) 2019 Christopher Thai & Custom Additions
 */

const CommandInterface = require('../../CommandInterface.js');

const global = require('../../../utils/global.js');
const animalUtil = require('../battle/util/animalUtil.js');
const WeaponInterface = require('../battle/WeaponInterface.js');
const weaponUtil = require('../battle/util/weaponUtil.js');

const weaponArgs = Object.keys(WeaponInterface.weapons || {}).map((id) => {
    return 'w' + (100 + parseInt(id));
});

function getUserName(p, user) {
    if (!user) return 'User Left Discord';
    if (p.global && typeof p.global.getUniqueName === 'function') {
        return p.global.getUniqueName(user);
    }
    if (p.global && typeof p.global.getName === 'function') {
        return p.global.getName(user);
    }
    return user.username || user.name || 'User';
}

module.exports = new CommandInterface({
    alias: ['top', 'rank', 'ranking', 'lb'],

    args: 'points|guild|zoo|money|coin|coins|cookie|pet|huntbot|luck|curse|battle|daily|power|shard|crystal|w|w{wid} [global] {count}',

    desc: 'Displays the top ranking of each category with a gorgeous Discord Embed interface!',

    example: ['delta top power', 'delta top coin global', 'delta top crystal', 'delta top pet'],

    related: ['delta my'],

    permissions: ['sendMessages', 'embedLinks'],

    group: ['rankings'],

    cooldown: 5000,
    half: 20,
    six: 200,
    bot: true,

    execute: async function (p) {
        await display(p, p.con, p.msg, p.args);
    },
});

async function display(p, con, msg, args) {
    let globala = false;

    let points = false;
    let guild = false;
    let money = false;
    let zoo = false;
    let rep = false;
    let pet = false;
    let huntbot, luck, curse, daily, battle, power, shard, tt;

    let invalid = false;
    let count = 10;

    for (let i = 0; i < args.length; i++) {
        if (
            !points && !guild && !money && !zoo && !rep && !pet &&
            !huntbot && !luck && !curse && !daily && !battle &&
            !power && !shard && !tt
        ) {
            if (args[i] === 'points' || args[i] === 'point' || args[i] === 'p' || args[i] === 'cmd' || args[i] === 'delta') points = true;
            else if (args[i] === 'guild' || args[i] === 'server' || args[i] === 's' || args[i] === 'g') guild = true;
            else if (args[i] === 'zoo' || args[i] === 'z') zoo = true;
            else if (['shards', 'shard', 'ws', 'weaponshard', 'crystal', 'crystals', 'gem', 'gems', 'c'].includes(args[i])) shard = true;
            else if (['coin', 'coins', 'money', 'm', 'cash', 'credit'].includes(args[i])) money = true;
            else if (['cookies', 'cookie', 'rep', 'r'].includes(args[i])) rep = true;
            else if (args[i] === 'pets' || args[i] === 'pet') pet = true;
            else if (['huntbot', 'hb', 'autohunt', 'ah'].includes(args[i])) huntbot = true;
            else if (args[i] === 'luck' || args[i] === 'pray') luck = true;
            else if (args[i] === 'curse') curse = true;
            else if (args[i] === 'battle' || args[i] === 'streak') battle = true;
            else if (args[i] === 'daily') daily = true;
            else if (['power', 'pwr', 'strength', 'str'].includes(args[i])) power = true;
            else if (['tt', 'takedown', 'takdowntracker', 'tracker', 'weapon', 'w'].includes(args[i]) || weaponArgs.includes(args[i])) tt = args[i];
            else if (args[i] === 'global' || args[i] === 'g') globala = true;
            else if (global.isInt(args[i])) count = parseInt(args[i]);
            else invalid = true;
        } else if (args[i] === 'global' || args[i] === 'g') globala = true;
        else if (global.isInt(args[i])) count = parseInt(args[i]);
        else invalid = true;
    }

    if (count > 25) count = 25;
    else if (count < 1) count = 5;

    if (invalid) {
        p.errorMsg(', Invalid ranking category! Usage: `delta top [category] [global] [count]`');
    } else {
        if (points) getRanking(globala, con, msg, count, p);
        else if (guild) getGuildRanking(con, msg, count, p);
        else if (zoo) getZooRanking(globala, con, msg, count, p);
        else if (money) getMoneyRanking(globala, con, msg, count, p);
        else if (rep) getRepRanking(globala, con, msg, count, p);
        else if (pet) getPetRanking(globala, con, msg, count, p);
        else if (huntbot) getHuntbotRanking(globala, con, msg, count, p);
        else if (luck) getLuckRanking(globala, con, msg, count, p);
        else if (curse) getCurseRanking(globala, con, msg, count, p);
        else if (battle) getBattleRanking(globala, con, msg, count, p);
        else if (daily) getDailyRanking(globala, con, msg, count, p);
        else if (power) await getPowerRanking(globala, con, msg, count, p);
        else if (shard) getShardRanking(globala, con, msg, count, p);
        else if (tt) getTTRanking(globala, con, msg, count, p, tt);
        else getRanking(globala, con, msg, count, p);
    }
}

function displayRanking(con, msg, count, globalRank, sql, title, subText, p) {
    con.query(sql, async function (err, rows) {
        if (err) {
            console.error('[DATABASE ERROR in top.js]', err);
            await p.send('**🚫 | Database Error:** Failed to query leaderboard data.');
            return;
        }

        let description = '';
        let myStatusText = '';

        if (rows && rows[1] && rows[1][0] !== undefined && rows[1][0] !== null) {
            const myRank = rows[1][0].rank ? `#${rows[1][0].rank}` : 'Unranked';
            myStatusText = `👤 **Your Status:** ${myRank} ${subText(rows[1][0], 0, true)}`;
        }

        if (rows && rows[0] && rows[0].length > 0) {
            let rank = 1;
            for (let ele of rows[0]) {
                let id = String(ele.id);
                let user = await p.fetch.getUser(id, true);
                let name = getUserName(p, user);

                let badge = `**#${rank}**`;
                if (rank === 1) badge = '🥇';
                else if (rank === 2) badge = '🥈';
                else if (rank === 3) badge = '🥉';

                description += `${badge} **<@${id}>** (${name})\n↳ ${subText(ele, rank, false)}\n\n`;
                rank++;
            }
        } else {
            description = '*No records found in this category yet.*';
        }

        let embedFields = [];
        if (myStatusText) {
            embedFields.push({
                name: 'Your Standing',
                value: myStatusText,
                inline: false
            });
        }

        let embed = {
            color: 0x8b0000,
            title: `🏆 ${title.toUpperCase()}`,
            description: description,
            fields: embedFields,
            footer: {
                text: `Requested by ${msg.author.username || 'Adventurer'}`,
                icon_url: msg.author.avatarURL
            },
            timestamp: new Date()
        };

        await p.send({ embed: embed });
    });
}

function getRanking(globalRank, con, msg, count, p) {
    let sql;
    if (globalRank) {
        sql = 'SELECT id, count FROM user ORDER BY count DESC LIMIT ' + count + ';';
        sql += 'SELECT id, count, (SELECT COUNT(*)+1 FROM user WHERE count > u.count) AS `rank` FROM user u WHERE u.id = ' + msg.author.id + ';';
    } else {
        let userids = global.getids(msg.channel.guild.members);
        sql = 'SELECT id, count FROM user WHERE id IN (' + userids + ') ORDER BY count DESC LIMIT ' + count + ';';
        sql += 'SELECT id, count, (SELECT COUNT(*)+1 FROM user WHERE id IN (' + userids + ') AND count > u.count) AS `rank` FROM user u WHERE u.id = ' + msg.author.id + ';';
    }

    displayRanking(
        con, msg, count, globalRank, sql,
        `Top ${count} ${globalRank ? 'Global' : msg.channel.guild.name} Delta Command Leaderboard`,
        function (query, rank, isSelf) {
            const formatted = global.toFancyNum(query.count || 0);
            return isSelf ? `— Executed \`delta\` **${formatted}** times` : `Executed \`delta\` **${formatted}** times`;
        },
        p
    );
}

async function getPowerRanking(globalRank, con, msg, count, p) {
    let usersFilter = globalRank ? '' : `WHERE u.id IN (${global.getids(msg.channel.guild.members)})`;
    
    // Power murni dihitung dari: (Command * 2) + (Total item inventory aktual user * 30). Jika belum ada item di inventory, item bernilai 0.
    let sql = `
        SELECT 
            u.id, 
            (
                (COALESCE(u.count, 0) * 2) + 
                (COALESCE(inv_cnt.total_items, 0) * 30)
            ) AS power,
            COALESCE(u.count, 0) AS cmds,
            COALESCE(inv_cnt.total_items, 0) AS items
        FROM user u
        LEFT JOIN (
            SELECT uid, SUM(COALESCE(count, 0)) AS total_items FROM inventory GROUP BY uid
        ) inv_cnt ON inv_cnt.uid = u.uid
        ${usersFilter}
        ORDER BY power DESC 
        LIMIT ${count};
    `;

    sql += `
        SELECT rank_data.rank, rank_data.power FROM (
            SELECT 
                u.id, 
                (
                    (COALESCE(u.count, 0) * 2) + 
                    (COALESCE(inv_cnt.total_items, 0) * 30)
                ) AS power,
                (SELECT COUNT(*) + 1 FROM user u2 
                 LEFT JOIN (SELECT uid, SUM(COALESCE(count, 0)) AS total_items FROM inventory GROUP BY uid) inv2 ON inv2.uid = u2.uid
                 WHERE ((COALESCE(u2.count, 0) * 2) + (COALESCE(inv2.total_items, 0) * 30)) > 
                       ((COALESCE(u.count, 0) * 2) + (COALESCE(inv_cnt.total_items, 0) * 30))
                ) AS \`rank\`
            FROM user u
            LEFT JOIN (SELECT uid, SUM(COALESCE(count, 0)) AS total_items FROM inventory GROUP BY uid) inv_cnt ON inv_cnt.uid = u.uid
            ${usersFilter}
        ) rank_data WHERE rank_data.id = '${msg.author.id}';
    `;

    displayRanking(
        con, msg, count, globalRank, sql,
        `Top ${count} ${globalRank ? 'Global' : msg.channel.guild.name} Adventurer Power Leaderboard`,
        function (query) {
            return `⚡ Power: **${global.toFancyNum(query.power || 0)}** (Cmds: ${global.toFancyNum(query.cmds || 0)} | Inventory Items: ${global.toFancyNum(query.items || 0)})`;
        },
        p
    );
}

function getZooRanking(globalRank, con, msg, count, p) {
    let users = globalRank ? null : global.getids(msg.channel.guild.members);
    let sql = `SELECT * FROM animal_count ${globalRank ? '' : `WHERE id IN (${users})`} ORDER BY total DESC LIMIT ${count};`;
    sql += `SELECT *, (SELECT COUNT(*) + 1 FROM animal_count WHERE total > a.total ${globalRank ? '' : `AND id IN (${users})`}) AS \`rank\` FROM animal_count a WHERE a.id = ${p.msg.author.id};`;

    displayRanking(
        con, msg, count, globalRank, sql,
        `Top ${count} ${globalRank ? 'Global' : msg.channel.guild.name} Zoo Rankings`,
        function (query) {
            return `Zoo Score: **${global.toFancyNum(query.total || 0)}** pts`;
        },
        p
    );
}

function getMoneyRanking(globalRank, con, msg, count, p) {
    let sql;
    const coinEmoji = '🪙';
    if (globalRank) {
        sql = 'SELECT id, money FROM cowoncy ORDER BY money DESC LIMIT ' + count + ';';
        sql += 'SELECT id, money, (SELECT COUNT(*)+1 FROM cowoncy WHERE money > c.money) AS `rank` FROM cowoncy c WHERE c.id = ' + msg.author.id + ';';
    } else {
        let users = global.getids(msg.channel.guild.members);
        sql = 'SELECT id, money FROM cowoncy WHERE id IN (' + users + ') ORDER BY money DESC LIMIT ' + count + ';';
        sql += 'SELECT id, money, (SELECT COUNT(*)+1 FROM cowoncy WHERE id IN (' + users + ') AND money > c.money) AS `rank` FROM cowoncy c WHERE c.id = ' + msg.author.id + ';';
    }

    displayRanking(
        con, msg, count, globalRank, sql,
        `Top ${count} ${globalRank ? 'Global' : msg.channel.guild.name} Coin Leaderboard`,
        function (query) {
            return `Coins: ${coinEmoji} **${global.toFancyNum(query.money || 0)}**`;
        },
        p
    );
}

function getRepRanking(globalRank, con, msg, count, p) {
    let sql;
    if (globalRank) {
        sql = 'SELECT id, count FROM rep ORDER BY count DESC LIMIT ' + count + ';';
        sql += 'SELECT id, count, (SELECT COUNT(*)+1 FROM rep WHERE count > c.count) AS `rank` FROM rep c WHERE c.id = ' + msg.author.id + ';';
    } else {
        let users = global.getids(msg.channel.guild.members);
        sql = 'SELECT id, count FROM rep WHERE id IN (' + users + ') ORDER BY count DESC LIMIT ' + count + ';';
        sql += 'SELECT id, count, (SELECT COUNT(*)+1 FROM rep WHERE id IN (' + users + ') AND count > c.count) AS `rank` FROM rep c WHERE c.id = ' + msg.author.id + ';';
    }

    displayRanking(
        con, msg, count, globalRank, sql,
        `Top ${count} ${globalRank ? 'Global' : msg.channel.guild.name} Cookie Rankings`,
        function (query) {
            return `Cookies Collected: 🍪 **${global.toFancyNum(query.count || 0)}**`;
        },
        p
    );
}

function getShardRanking(globalRank, con, msg, count, p) {
    let sql;
    const crystalEmoji = '💎';

    if (globalRank) {
        sql = 'SELECT id, shards.count FROM shards INNER JOIN user ON user.uid = shards.uid ORDER BY shards.count DESC LIMIT ' + count + ';';
        sql += 'SELECT id, s.count, (SELECT COUNT(*)+1 FROM shards INNER JOIN user ON user.uid = shards.uid WHERE shards.count > s.count) AS `rank` FROM shards s INNER JOIN user u ON u.uid = s.uid WHERE u.id = ' + msg.author.id + ';';
    } else {
        let users = global.getids(msg.channel.guild.members);
        sql = 'SELECT id, shards.count FROM shards INNER JOIN user ON user.uid = shards.uid WHERE id IN (' + users + ') ORDER BY shards.count DESC LIMIT ' + count + ';';
        sql += 'SELECT id, s.count, (SELECT COUNT(*)+1 FROM shards INNER JOIN user ON user.uid = shards.uid WHERE id IN (' + users + ') AND shards.count > s.count) AS `rank` FROM shards s INNER JOIN user u ON u.uid = s.uid WHERE u.id = ' + msg.author.id + ';';
    }

    displayRanking(
        con, msg, count, globalRank, sql,
        `Top ${count} ${globalRank ? 'Global' : msg.channel.guild.name} Crystal Leaderboard`,
        function (query) {
            return `Crystals: ${crystalEmoji} **${global.toFancyNum(query.count || 0)}**`;
        },
        p
    );
}

function getPetRanking(globalRank, con, msg, count, p) {
    let sql;
    if (globalRank) {
        sql = 'SELECT * FROM animal ORDER BY xp DESC LIMIT ' + count + ';';
        sql += 'SELECT *, (SELECT COUNT(*)+1 FROM animal WHERE xp > c.xp) AS `rank` FROM animal c WHERE c.id = ' + msg.author.id + ' ORDER BY xp DESC LIMIT 1;';
    } else {
        let users = global.getids(msg.channel.guild.members);
        sql = 'SELECT * FROM animal WHERE id IN (' + users + ') ORDER BY xp DESC LIMIT ' + count + ';';
        sql += 'SELECT *, (SELECT COUNT(*)+1 FROM animal WHERE id IN (' + users + ') AND xp > c.xp) AS `rank` FROM animal c WHERE c.id = ' + msg.author.id + ' ORDER BY xp DESC LIMIT 1;';
    }

    displayRanking(
        con, msg, count, globalRank, sql,
        `Top ${count} ${globalRank ? 'Global' : msg.channel.guild.name} Pet Rankings`,
        function (query) {
            let lvl = animalUtil.toLvl(query.xp || 0);
            let nickname = query.nickname ? `"${query.nickname}" ` : '';
            return `Pet: **${nickname}**— Lvl ${lvl.lvl} (${global.toFancyNum(lvl.currentXp)} XP)`;
        },
        p
    );
}

function getHuntbotRanking(globalRank, con, msg, count, p) {
    let sql;
    if (globalRank) {
        sql = 'SELECT id, total FROM autohunt ORDER BY total DESC LIMIT ' + count + ';';
        sql += 'SELECT id, total, (SELECT COUNT(*)+1 FROM autohunt WHERE autohunt.total > c.total) AS `rank` FROM autohunt c WHERE c.id = ' + msg.author.id + ' ORDER BY total DESC LIMIT 1;';
    } else {
        let users = global.getids(msg.channel.guild.members);
        sql = 'SELECT id, total FROM autohunt WHERE id IN (' + users + ') ORDER BY total DESC LIMIT ' + count + ';';
        sql += 'SELECT id, total, (SELECT COUNT(*)+1 FROM autohunt WHERE id IN (' + users + ') AND autohunt.total > c.total) AS `rank` FROM autohunt c WHERE c.id = ' + msg.author.id + ' ORDER BY total DESC LIMIT 1;';
    }

    displayRanking(
        con, msg, count, globalRank, sql,
        `Top ${count} ${globalRank ? 'Global' : msg.channel.guild.name} HuntBot Essence Leaderboard`,
        function (query) {
            return `HuntBot Essence: **${global.toFancyNum(query.total || 0)}**`;
        },
        p
    );
}

function getLuckRanking(globalRank, con, msg, count, p) {
    let sql;
    if (globalRank) {
        sql = 'SELECT * FROM luck ORDER BY lcount DESC LIMIT ' + count + ';';
        sql += 'SELECT *, (SELECT COUNT(*)+1 FROM luck WHERE lcount > c.lcount) AS `rank` FROM luck c WHERE c.id = ' + msg.author.id + ' ORDER BY lcount DESC LIMIT 1;';
    } else {
        let users = global.getids(msg.channel.guild.members);
        sql = 'SELECT * FROM luck WHERE id IN (' + users + ') ORDER BY lcount DESC LIMIT ' + count + ';';
        sql += 'SELECT *, (SELECT COUNT(*)+1 FROM luck WHERE id IN (' + users + ') AND lcount > c.lcount) AS `rank` FROM luck c WHERE c.id = ' + msg.author.id + ' ORDER BY lcount DESC LIMIT 1;';
    }

    displayRanking(
        con, msg, count, globalRank, sql,
        `Top ${count} ${globalRank ? 'Global' : msg.channel.guild.name} Pray / Luck Leaderboard`,
        function (query) {
            return `Luck Count: 🍀 **${global.toFancyNum(query.lcount || 0)}**`;
        },
        p
    );
}

function getCurseRanking(globalRank, con, msg, count, p) {
    let sql;
    if (globalRank) {
        sql = 'SELECT * FROM luck ORDER BY lcount ASC LIMIT ' + count + ';';
        sql += 'SELECT *, (SELECT COUNT(*)+1 FROM luck WHERE lcount < c.lcount) AS `rank` FROM luck c WHERE c.id = ' + msg.author.id + ' ORDER BY lcount DESC LIMIT 1;';
    } else {
        let users = global.getids(msg.channel.guild.members);
        sql = 'SELECT * FROM luck WHERE id IN (' + users + ') ORDER BY lcount ASC LIMIT ' + count + ';';
        sql += 'SELECT *, (SELECT COUNT(*)+1 FROM luck WHERE id IN (' + users + ') AND lcount < c.lcount) AS `rank` FROM luck c WHERE c.id = ' + msg.author.id + ' ORDER BY lcount DESC LIMIT 1;';
    }

    displayRanking(
        con, msg, count, globalRank, sql,
        `Top ${count} ${globalRank ? 'Global' : msg.channel.guild.name} Curse Leaderboard`,
        function (query) {
            return `Curse Level: 💀 **${global.toFancyNum(query.lcount || 0)}**`;
        },
        p
    );
}

function getGuildRanking(con, msg, count, p) {
    let sql = 'SELECT * FROM guild ORDER BY count DESC LIMIT ' + count + ';';
    sql += 'SELECT id, count, (SELECT COUNT(*)+1 FROM guild WHERE count > g.count) AS `rank` FROM guild g WHERE g.id = ' + msg.channel.guild.id + ';';

    con.query(sql, async function (err, rows) {
        if (err) {
            console.error(err);
            return;
        }

        let description = '';
        let myStatusText = '';

        if (rows && rows[1] && rows[1][0] !== undefined && rows[1][0] !== null) {
            myStatusText = `👤 **Your Guild Rank:** #${rows[1][0].rank} — Total commands: **${global.toFancyNum(rows[1][0].count || 0)}**`;
        }

        if (rows && rows[0] && rows[0].length > 0) {
            let rank = 1;
            for (let ele of rows[0]) {
                let id = String(ele.id);
                let guildObj = await p.fetch.getGuild(id, true);
                let guildName = guildObj ? guildObj.name : 'Guild Left Bot';

                let badge = `**#${rank}**`;
                if (rank === 1) badge = '🥇';
                else if (rank === 2) badge = '🥈';
                else if (rank === 3) badge = '🥉';

                description += `${badge} **${guildName}**\n↳ Total commands: **${global.toFancyNum(ele.count || 0)}**\n\n`;
                rank++;
            }
        }

        let embedFields = [];
        if (myStatusText) {
            embedFields.push({ name: 'Your Guild Standing', value: myStatusText, inline: false });
        }

        let embed = {
            color: 0x8b0000,
            title: `🏰 TOP ${count} GUILD LEADERBOARD`,
            description: description,
            fields: embedFields,
            footer: { text: `Requested by ${msg.author.username || 'Adventurer'}` },
            timestamp: new Date()
        };

        await p.send({ embed: embed });
    });
}

function getBattleRanking(globalRank, con, msg, count, p) {
    let sql;
    if (globalRank) {
        sql = `SELECT * FROM pet_team INNER JOIN user ON user.uid = pet_team.uid ORDER BY streak DESC LIMIT ${count};`;
        sql += `SELECT pt.tname, u.id, pt.streak, (SELECT COUNT(*)+1 FROM pet_team WHERE streak > pt.streak) AS \`rank\` FROM user u INNER JOIN pet_team pt ON pt.uid = u.uid LEFT JOIN pet_team_active pt_act ON pt.pgid = pt_act.pgid WHERE u.id = ${p.msg.author.id} ORDER BY pt_act.pgid DESC, pt.pgid ASC LIMIT 1;`;
    } else {
        let users = global.getids(msg.channel.guild.members);
        sql = `SELECT * FROM pet_team INNER JOIN user ON pet_team.uid = user.uid WHERE id IN (${users}) ORDER BY streak DESC LIMIT ${count};`;
        sql += `SELECT pt.tname, u.id, pt.streak, (SELECT COUNT(*)+1 FROM user INNER JOIN pet_team ON user.uid = pet_team.uid WHERE id IN (${users}) AND streak > pt.streak) AS \`rank\` FROM user u INNER JOIN pet_team pt ON pt.uid = u.uid LEFT JOIN pet_team_active pt_act ON pt.pgid = pt_act.pgid WHERE u.id = ${p.msg.author.id} ORDER BY pt_act.pgid DESC, pt.pgid ASC LIMIT 1;`;
    }

    displayRanking(
        con, msg, count, globalRank, sql,
        `Top ${count} ${globalRank ? 'Global' : msg.channel.guild.name} Battle Streak Leaderboard`,
        function (query) {
            let team = query.tname ? `[${query.tname}] ` : '';
            return `Team: **${team}**— Streak: ⚔️ **${global.toFancyNum(query.streak || 0)}**`;
        },
        p
    );
}

function getDailyRanking(globalRank, con, msg, count, p) {
    let sql;
    if (globalRank) {
        sql = 'SELECT id, daily_streak FROM cowoncy ORDER BY daily_streak DESC LIMIT ' + count + ';';
        sql += 'SELECT id, daily_streak, (SELECT COUNT(*)+1 FROM cowoncy WHERE daily_streak > c.daily_streak) AS `rank` FROM cowoncy c WHERE c.id = ' + msg.author.id + ';';
    } else {
        let users = global.getids(msg.channel.guild.members);
        sql = 'SELECT id, daily_streak FROM cowoncy WHERE id IN (' + users + ') ORDER BY daily_streak DESC LIMIT ' + count + ';';
        sql += 'SELECT id, daily_streak, (SELECT COUNT(*)+1 FROM cowoncy WHERE id IN (' + users + ') AND daily_streak > c.daily_streak) AS `rank` FROM cowoncy c WHERE c.id = ' + msg.author.id + ';';
    }

    displayRanking(
        con, msg, count, globalRank, sql,
        `Top ${count} ${globalRank ? 'Global' : msg.channel.guild.name} Daily Streak Leaderboard`,
        function (query) {
            return `Daily Streak: 🔥 **${global.toFancyNum(query.daily_streak || 0)}** days`;
        },
        p
    );
}

function getTTRanking(globalRank, con, msg, count, p, tt) {
    let wid;
    if (/^w\d{3}$/gi.test(tt)) {
        wid = parseInt(tt.substring(1)) - 100;
    }
    let sql;
    if (globalRank) {
        sql = `SELECT uwk.kills, uw.wid, uw.uwid, uw.avg, uw.wear, u.id FROM user_weapon_kills uwk LEFT JOIN user_weapon uw ON uwk.uwid = uw.uwid LEFT JOIN user u ON uw.uid = u.uid ${wid ? `WHERE wid = ${wid}` : ''} ORDER BY uwk.kills DESC LIMIT ${count};`;
        sql += `SELECT uwk.kills, uw.wid, uw.uwid, uw.avg, uw.wear, u.id, (SELECT COUNT(*) + 1 FROM user_weapon_kills WHERE user_weapon_kills.kills > uwk.kills) AS \`rank\` FROM user_weapon_kills uwk LEFT JOIN user_weapon uw ON uwk.uwid = uw.uwid LEFT JOIN user u ON uw.uid = u.uid WHERE u.id = ${p.msg.author.id} ${wid ? `AND wid = ${wid}` : ''} ORDER BY uwk.kills DESC LIMIT 1;`;
    } else {
        let users = global.getids(msg.channel.guild.members);
        sql = `SELECT uwk.kills, uw.wid, uw.uwid, uw.avg, uw.wear, u.id FROM user_weapon_kills uwk LEFT JOIN user_weapon uw ON uwk.uwid = uw.uwid LEFT JOIN user u ON uw.uid = u.uid WHERE u.id IN (${users}) ${wid ? `AND wid = ${wid}` : ''} ORDER BY uwk.kills DESC LIMIT ${count};`;
        sql += `SELECT uwk.kills, uw.wid, uw.uwid, uw.avg, uw.wear, u.id, (SELECT COUNT(*) + 1 FROM user_weapon_kills LEFT JOIN user_weapon ON user_weapon.uwid = user_weapon_kills.uwid LEFT JOIN user ON user_weapon.uid = user.uid WHERE user_weapon_kills.kills > uwk.kills AND user.id IN (${users}) ${wid ? `AND user_weapon.wid = ${wid}` : ''}) AS \`rank\` FROM user_weapon_kills uwk LEFT JOIN user_weapon uw ON uwk.uwid = uw.uwid LEFT JOIN user u ON uw.uid = u.uid WHERE u.id = ${p.msg.author.id} ${wid ? `AND wid = ${wid}` : ''} ORDER BY uwk.kills DESC LIMIT 1;`;
    }

    displayRanking(
        con, msg, count, globalRank, sql,
        `Top ${count} ${globalRank ? 'Global' : msg.channel.guild.name} Weapon Kills Leaderboard`,
        function (query) {
            const weaponName = WeaponInterface.weapons[`${query.wid}`] ? WeaponInterface.weapons[`${query.wid}`].getName : 'Unknown Weapon';
            const uwid = weaponUtil.shortenUWID(query.uwid || 0);
            const wear = query.wear > 1 ? WeaponInterface.getWear(query.wear).name + ' ' : '';
            return `[${uwid}] **${wear}${weaponName}** — Kills: 🗡️ **${global.toFancyNum(query.kills || 0)}** (${query.avg || 0}% avg)`;
        },
        p
    );
}