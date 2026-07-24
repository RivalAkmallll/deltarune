/*
 * OwO Bot for Discord - Personal Ranking Command (Fully Fixed & Upgraded)
 * Copyright (C) 2019 Christopher Thai
 */

const CommandInterface = require('../../CommandInterface.js');

const global = require('../../../utils/global.js');
const animalUtil = require('../battle/util/animalUtil.js');
const animalUtil2 = require('../zoo/animalUtil.js');
const levels = require('../../../utils/levels.js');
const WeaponInterface = require('../battle/WeaponInterface.js');
const weaponUtil = require('../battle/util/weaponUtil.js');

const weaponArgs = Object.keys(WeaponInterface.weapons || {}).map((id) => {
    return 'w' + (100 + parseInt(id));
});

// Safe helper function to get user's display name
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
    alias: ['my', 'me', 'guild'],

    args: 'points|guild|zoo|money|cookie|pet|huntbot|luck|curse|battle|daily|level|shard|crystal|weapon|w{wid} [global]',

    desc: 'Displays your ranking of each category!\nYou can choose your rank within the server or globally!',

    example: ['delta my zoo', 'delta me cowoncy global', 'delta my crystal', 'delta my level'],

    related: ['delta top'],

    permissions: ['sendMessages'],

    group: ['rankings'],

    cooldown: 5000,
    half: 20,
    six: 200,
    bot: true,

    execute: async function (p) {
        if (p.command === 'guild') await display(p, p.con, p.msg, ['guild']);
        else await display(p, p.con, p.msg, p.args);
    },
});

/**
 * Check for valid arguments to display leaderboards
 */
async function display(p, con, msg, args) {
    let aglobal = false;
    let invalid = false;
    let points = false;
    let guild = false;
    let zoo = false;
    let money = false;
    let rep = false;
    let pet = false;
    let huntbot, luck, curse, daily, battle, level, shard, tt;

    for (let i = 0; i < args.length; i++) {
        if (
            !points && !guild && !money && !zoo && !rep && !pet &&
            !huntbot && !luck && !curse && !daily && !battle &&
            !level && !shard && !tt
        ) {
            if (args[i] === 'points' || args[i] === 'point' || args[i] === 'p' || args[i] === 'del' || args[i] === 'cmd') points = true;
            else if (args[i] === 'guild' || args[i] === 'server' || args[i] === 'g' || args[i] === 's') guild = true;
            else if (args[i] === 'zoo' || args[i] === 'z') zoo = true;
            else if (['shards', 'shard', 'ws', 'weaponshard', 'crystal', 'crystals', 'gem', 'gems'].includes(args[i])) shard = true;
            else if (['cowoncy', 'money', 'c', 'm', 'cash', 'credit'].includes(args[i])) money = true;
            else if (['cookies', 'cookie', 'rep', 'r'].includes(args[i])) rep = true;
            else if (args[i] === 'pets' || args[i] === 'pet') pet = true;
            else if (['huntbot', 'hb', 'autohunt', 'ah'].includes(args[i])) huntbot = true;
            else if (args[i] === 'luck' || args[i] === 'pray') luck = true;
            else if (args[i] === 'curse') curse = true;
            else if (args[i] === 'battle' || args[i] === 'streak') battle = true;
            else if (['level', 'lvl', 'xp'].includes(args[i])) level = true;
            else if (args[i] === 'daily') daily = true;
            else if (['tt', 'takedown', 'takdowntracker', 'tracker', 'weapon', 'w'].includes(args[i]) || weaponArgs.includes(args[i])) tt = args[i];
            else if (args[i] === 'global' || args[i] === 'g') aglobal = true;
            else invalid = true;
        } else if (args[i] === 'global' || args[i] === 'g') aglobal = true;
        else invalid = true;
    }

    if (invalid) {
        if (typeof p.errorMsg === 'function') {
            p.errorMsg(', Invalid ranking category!', 3000);
        } else {
            await p.send('**🚫 | Error:** Invalid ranking category!');
        }
    } else {
        const guildId = msg.channel && msg.channel.guild ? msg.channel.guild.id : null;
        if (points) getPointRanking(aglobal, con, msg, p);
        else if (guild) getGuildRanking(con, msg, guildId || msg.channel.id, p);
        else if (zoo) getZooRanking(aglobal, con, msg, p);
        else if (money) getMoneyRanking(aglobal, con, msg, p);
        else if (rep) getRepRanking(aglobal, con, msg, p);
        else if (pet) getPetRanking(aglobal, con, msg, p);
        else if (huntbot) getHuntbotRanking(aglobal, con, msg, p);
        else if (luck) getLuckRanking(aglobal, con, msg, p);
        else if (curse) getCurseRanking(aglobal, con, msg, p);
        else if (battle) getBattleRanking(aglobal, con, msg, p);
        else if (daily) getDailyRanking(aglobal, con, msg, p);
        else if (level) await getLevelRanking(aglobal, p);
        else if (shard) getShardRanking(aglobal, con, msg, p);
        else if (tt) getTTRanking(aglobal, con, msg, p, tt);
        else getPointRanking(aglobal, con, msg, p);
    }
}

async function displayRanking(con, msg, sql, title, subText, p) {
    try {
        let rows = await p.query(sql);
        let above = (rows && rows[0]) ? rows[0] : [];
        let below = (rows && rows[1]) ? rows[1] : [];
        let me = (rows && rows[2] && rows[2][0]) ? rows[2][0] : null;

        if (!me) {
            await p.send("You're at the very bottom or have no records in this category c:");
            return;
        }

        let userRank = parseInt(me.rank || 1);
        let rank = userRank - above.length;
        let embed = '';

        // People above user
        for (let ele of above.reverse()) {
            let id = String(ele.id);
            if (id !== '' && id !== null && !isNaN(id)) {
                let user = await p.fetch.getUser(id, true).catch(() => null);
                let name = getUserName(p, user);
                name = name.replace('discord.gg', 'discord,gg').replace(/(```)/g, '`\u200b``');
                embed += '#' + p.global.toFancyNum(rank) + '\t' + name + '\n' + subText(ele) + '\n';
                rank++;
            } else if (rank === 0) rank = 1;
        }

        // Current user
        let myUserObj = await p.fetch.getUser(me.id, true).catch(() => null);
        let uname = getUserName(p, myUserObj || p.msg.author);
        uname = uname.replace('discord.gg', 'discord,gg').replace(/(```)/g, '`\u200b``');
        embed += '< ' + p.global.toFancyNum(rank) + '    ' + uname + ' >\n' + subText(me) + '\n';
        rank++;

        // People below user
        for (let ele of below) {
            let id = String(ele.id);
            if (id !== '' && id !== null && !isNaN(id)) {
                let user = await p.fetch.getUser(id, true).catch(() => null);
                let name = getUserName(p, user);
                name = name.replace('discord.gg', 'discord,gg');
                embed += '#' + p.global.toFancyNum(rank) + '\t' + name + '\n' + subText(ele) + '\n';
                rank++;
            }
        }

        // Add top and bottom box
        embed =
            '```md\n< ' +
            uname +
            "'s " +
            title +
            ' >\n> Your rank is: ' +
            p.global.toFancyNum(userRank) +
            '\n>' +
            subText(me) +
            '\n\n' +
            (userRank > 3 ? '>...\n' : '') +
            embed;
        if (rank - userRank === 3) embed += '>...\n';

        let date = new Date();
        embed +=
            '\n' +
            date.toLocaleString('en-US', {
                month: '2-digit',
                day: '2-digit',
                year: 'numeric',
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
            }) +
            '```';
        await p.send(embed);
    } catch (err) {
        console.error('[DATABASE ERROR in me.js displayRanking]', err);
        await p.send('**🚫 | Error:** Failed to fetch personal ranking data.');
    }
}

/**
 * Point / Command Count Ranking
 */
function getPointRanking(globalRank, con, msg, p) {
    let users = globalRank ? null : global.getids(msg.channel && msg.channel.guild ? msg.channel.guild.members : []);
    let sql = `
        SELECT id, count 
        FROM user
        WHERE count > (SELECT count FROM user WHERE id = ${p.msg.author.id})
            ${globalRank || !users ? '' : `AND id IN (${users})`}
        ORDER BY count ASC LIMIT 2;
    `;
    sql += `
        SELECT id, count  
        FROM user
        WHERE count < (SELECT count FROM user WHERE id = ${p.msg.author.id})
            ${globalRank || !users ? '' : `AND id IN (${users})`}
        ORDER BY count DESC LIMIT 2;
    `;
    sql += `
        SELECT id, count, (
            SELECT COUNT(*)+1
            FROM user
            WHERE count > u.count
                ${globalRank || !users ? '' : `AND user.id IN (${users})`}
        ) AS rank
        FROM user u
        WHERE u.id = ${p.msg.author.id};
    `;

    displayRanking(
        con, msg, sql,
        (globalRank ? 'Global ' : '') + "'delta' Command Ranking",
        function (query) {
            return '\t\texecuted delta ' + global.toFancyNum(query.count || 0) + ' times!';
        },
        p
    );
}

function getZooRanking(globalRank, con, msg, p) {
    let users = globalRank ? null : global.getids(msg.channel && msg.channel.guild ? msg.channel.guild.members : []);
    let sql = `
        SELECT *
        FROM animal_count
        WHERE total > (SELECT total FROM animal_count WHERE id = ${p.msg.author.id})
            ${globalRank || !users ? '' : `AND id IN (${users})`}
        ORDER BY total ASC LIMIT 2;
    `;
    sql += `
        SELECT *
        FROM animal_count
        WHERE total < (SELECT total FROM animal_count WHERE id = ${p.msg.author.id})
            ${globalRank || !users ? '' : `AND id IN (${users})`}
        ORDER BY total DESC LIMIT 2;
    `;
    sql += `
        SELECT *, (
            SELECT COUNT(*)+1
            FROM animal_count
            WHERE total > u.total
                ${globalRank || !users ? '' : `AND id IN (${users})`}
        ) AS rank
        FROM animal_count u
        WHERE u.id = ${p.msg.author.id};
    `;

    displayRanking(
        con, msg, sql,
        (globalRank ? 'Global ' : '') + 'Zoo Ranking',
        function (query) {
            return '\t\t' + global.toFancyNum(query.total || 0) + ' zoo points: ' + animalUtil2.zooScore(query);
        },
        p
    );
}

function getMoneyRanking(globalRank, con, msg, p) {
    let users = globalRank ? null : global.getids(msg.channel && msg.channel.guild ? msg.channel.guild.members : []);
    let sql = `
        SELECT id, money
        FROM cowoncy
        WHERE money > (SELECT money FROM cowoncy WHERE id = ${p.msg.author.id})
            ${globalRank || !users ? '' : `AND id IN (${users})`}
        ORDER BY money ASC LIMIT 2;
    `;
    sql += `
        SELECT id, money
        FROM cowoncy 
        WHERE money < (SELECT money FROM cowoncy WHERE id = ${p.msg.author.id})
            ${globalRank || !users ? '' : `AND id IN (${users})`}
        ORDER BY money DESC LIMIT 2;
    `;
    sql += `
        SELECT id, money, (
            SELECT COUNT(*)+1
            FROM cowoncy
            WHERE money > u.money
                ${globalRank || !users ? '' : `AND id IN (${users})`}
        ) AS rank
        FROM cowoncy u
        WHERE u.id = ${p.msg.author.id};
    `;

    displayRanking(
        con, msg, sql,
        (globalRank ? 'Global ' : '') + 'Money Ranking',
        function (query) {
            return '\t\tCowoncy: ' + global.toFancyNum(query.money || 0);
        },
        p
    );
}

function getRepRanking(globalRank, con, msg, p) {
    let users = globalRank ? null : global.getids(msg.channel && msg.channel.guild ? msg.channel.guild.members : []);
    let sql = `
        SELECT id, count
        FROM rep
        WHERE count > (SELECT count FROM rep WHERE id = ${p.msg.author.id})
            ${globalRank || !users ? '' : `AND id IN (${users})`}
        ORDER BY count ASC LIMIT 2;
    `;
    sql += `
        SELECT id, count
        FROM rep 
        WHERE count < (SELECT count FROM rep WHERE id = ${p.msg.author.id})
            ${globalRank || !users ? '' : `AND id IN (${users})`}
        ORDER BY count DESC LIMIT 2;
    `;
    sql += `
        SELECT id, count, (
            SELECT COUNT(*)+1
            FROM rep
            WHERE count > u.count
                ${globalRank || !users ? '' : `AND id IN (${users})`}
        ) AS rank
        FROM rep u
        WHERE u.id = ${p.msg.author.id};
    `;

    displayRanking(
        con, msg, sql,
        (globalRank ? 'Global ' : '') + 'Cookie Ranking',
        function (query) {
            return '\t\tCookies: ' + global.toFancyNum(query.count || 0);
        },
        p
    );
}

function getPetRanking(globalRank, con, msg, p) {
    let users = globalRank ? null : global.getids(msg.channel && msg.channel.guild ? msg.channel.guild.members : []);
    let sql = `
        SELECT *
        FROM animal
        WHERE xp > (SELECT xp FROM animal WHERE id = ${p.msg.author.id} ORDER BY xp DESC LIMIT 1)
            ${globalRank || !users ? '' : `AND id IN (${users})`}
        ORDER BY xp ASC LIMIT 2;
    `;
    sql += `
        SELECT *
        FROM animal
        WHERE xp < (SELECT xp FROM animal WHERE id = ${p.msg.author.id} ORDER BY xp DESC LIMIT 1)
            ${globalRank || !users ? '' : `AND id IN (${users})`}
        ORDER BY xp DESC LIMIT 2;
    `;
    sql += `
        SELECT *, (
            SELECT COUNT(*)+1
            FROM animal
            WHERE xp > u.xp
                ${globalRank || !users ? '' : `AND id IN (${users})`}
        ) AS rank
        FROM animal u
        WHERE u.id = ${p.msg.author.id}
        ORDER BY xp DESC LIMIT 1;
    `;

    displayRanking(
        con, msg, sql,
        (globalRank ? 'Global ' : '') + 'Pet Ranking',
        function (query) {
            let result = '\t\t';
            if (query.nickname) result += query.nickname + ' ';
            let lvl = animalUtil.toLvl(query.xp || 0);
            result += `Lvl. ${lvl.lvl} ${lvl.currentXp}xp`;
            return result;
        },
        p
    );
}

function getHuntbotRanking(globalRank, con, msg, p) {
    let users = globalRank ? null : global.getids(msg.channel && msg.channel.guild ? msg.channel.guild.members : []);
    let sql = `
        SELECT id, total 
        FROM autohunt
        WHERE total > (SELECT total FROM autohunt WHERE id = ${p.msg.author.id})
            ${globalRank || !users ? '' : `AND id IN (${users})`}
        ORDER BY total ASC LIMIT 2;
    `;
    sql += `
        SELECT id, total
        FROM autohunt
        WHERE total < (SELECT total FROM autohunt WHERE id = ${p.msg.author.id})
            ${globalRank || !users ? '' : `AND id IN (${users})`}
        ORDER BY total DESC LIMIT 2;
    `;
    sql += `
        SELECT id, total, (
            SELECT COUNT(*)+1
            FROM autohunt
            WHERE total > u.total
                ${globalRank || !users ? '' : `AND id IN (${users})`}
        ) AS rank
        FROM autohunt u
        WHERE u.id = ${p.msg.author.id};
    `;

    displayRanking(
        con, msg, sql,
        (globalRank ? 'Global ' : '') + 'HuntBot Ranking',
        function (query) {
            return '\t\tEssence: ' + global.toFancyNum(query.total || 0);
        },
        p
    );
}

function getLuckRanking(globalRank, con, msg, p) {
    let users = globalRank ? null : global.getids(msg.channel && msg.channel.guild ? msg.channel.guild.members : []);
    let sql = `
        SELECT id, lcount 
        FROM luck
        WHERE lcount > (SELECT lcount FROM luck WHERE id = ${p.msg.author.id})
            ${globalRank || !users ? '' : `AND id IN (${users})`}
        ORDER BY lcount ASC LIMIT 2;
    `;
    sql += `
        SELECT id, lcount
        FROM luck
        WHERE lcount < (SELECT lcount FROM luck WHERE id = ${p.msg.author.id})
            ${globalRank || !users ? '' : `AND id IN (${users})`}
        ORDER BY lcount DESC LIMIT 2;
    `;
    sql += `
        SELECT id, lcount, (
            SELECT COUNT(*)+1
            FROM luck
            WHERE lcount > u.lcount
                ${globalRank || !users ? '' : `AND id IN (${users})`}
        ) AS rank
        FROM luck u
        WHERE u.id = ${p.msg.author.id};
    `;

    displayRanking(
        con, msg, sql,
        (globalRank ? 'Global ' : '') + 'Luck Ranking',
        function (query) {
            return '\t\tLuck: ' + global.toFancyNum(query.lcount || 0);
        },
        p
    );
}

function getCurseRanking(globalRank, con, msg, p) {
    let users = globalRank ? null : global.getids(msg.channel && msg.channel.guild ? msg.channel.guild.members : []);
    let sql = `
        SELECT id, lcount 
        FROM luck
        WHERE lcount < (SELECT lcount FROM luck WHERE id = ${p.msg.author.id})
            ${globalRank || !users ? '' : `AND id IN (${users})`}
        ORDER BY lcount DESC LIMIT 2;
    `;
    sql += `
        SELECT id, lcount
        FROM luck
        WHERE lcount > (SELECT lcount FROM luck WHERE id = ${p.msg.author.id})
            ${globalRank || !users ? '' : `AND id IN (${users})`}
        ORDER BY lcount ASC LIMIT 2;
    `;
    sql += `
        SELECT id, lcount, (
            SELECT COUNT(*)+1
            FROM luck
            WHERE lcount < u.lcount
                ${globalRank || !users ? '' : `AND id IN (${users})`}
        ) AS rank
        FROM luck u
        WHERE u.id = ${p.msg.author.id};
    `;

    displayRanking(
        con, msg, sql,
        (globalRank ? 'Global ' : '') + 'Curse Ranking',
        function (query) {
            return '\t\tLuck: ' + global.toFancyNum(query.lcount || 0);
        },
        p
    );
}

function getGuildRanking(con, msg, id, p) {
    let sql =
        'SELECT g.id,g.count,g1.id,g1.count FROM guild AS g LEFT JOIN ( SELECT id,count FROM guild ORDER BY count ASC ) AS g1 ON g1.count > g.count WHERE g.id = ' +
        id +
        ' ORDER BY g1.count ASC LIMIT 2;';
    sql +=
        'SELECT g.id,g.count,g1.id,g1.count FROM guild AS g LEFT JOIN ( SELECT id,count FROM guild ORDER BY count DESC ) AS g1 ON g1.count < g.count WHERE g.id = ' +
        id +
        ' ORDER BY g1.count DESC LIMIT 2;';
    sql +=
        'SELECT id,count,(SELECT COUNT(*)+1 FROM guild WHERE count > g.count) AS rank FROM guild g WHERE g.id = ' +
        id +
        ';';

    con.query(sql, async function (err, rows) {
        if (err) {
            console.error('[DATABASE ERROR in getGuildRanking]', err);
            return;
        }
        let above = rows[0] || [];
        let below = rows[1] || [];
        let me = rows[2] ? rows[2][0] : null;

        if (!me) {
            await p.send("This guild hasn't executed commands yet!");
            return;
        }

        let guildRank = parseInt(me.rank || 1);
        let rank = guildRank - above.length;
        let embed = '';

        for (let ele of above.reverse()) {
            let eleId = String(ele.id);
            if (eleId !== '' && eleId !== null && !isNaN(eleId)) {
                let nameObj = await p.fetch.getGuild(eleId, true).catch(() => null);
                let name = nameObj ? nameObj.name : 'Guild Left Bot';
                name = name.replace('discord.gg', 'discord,gg');
                embed += '#' + rank + '\t' + name + '\n\t\tcollectively executed delta ' + global.toFancyNum(ele.count || 0) + ' times!\n';
                rank++;
            } else if (rank === 0) rank = 1;
        }

        let unameObj = await p.fetch.getGuild(me.id, true).catch(() => null);
        let uname = unameObj ? unameObj.name : 'Guild Left Bot';
        uname = uname.replace('discord.gg', 'discord,gg');
        embed += '< ' + rank + '    ' + uname + ' >\n\t\tcollectively executed delta ' + global.toFancyNum(me.count || 0) + ' times!\n';
        rank++;

        for (let ele of below) {
            let eleId = String(ele.id);
            if (eleId !== '' && eleId !== null && !isNaN(eleId)) {
                let nameObj = await p.fetch.getGuild(eleId, true).catch(() => null);
                let name = nameObj ? nameObj.name : 'Guild Left Bot';
                name = name.replace('discord.gg', 'discord,gg');
                embed += '#' + rank + '\t' + name + '\n\t\tcollectively executed delta ' + global.toFancyNum(ele.count || 0) + ' times!\n';
                rank++;
            }
        }

        embed =
            '```md\n< ' +
            uname +
            "'s Global Ranking >\n> Your guild rank is: " +
            guildRank +
            '\n>\t\tcollectively executed delta ' +
            global.toFancyNum(me.count || 0) +
            ' times!\n\n' +
            (guildRank > 3 ? '>...\n' : '') +
            embed;

        if (rank - guildRank === 3) embed += '>...\n';

        let date = new Date();
        embed +=
            '\n' +
            date.toLocaleString('en-US', {
                month: '2-digit',
                day: '2-digit',
                year: 'numeric',
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
            }) +
            '```';
        await p.send(embed);
    });
}

function getBattleRanking(globalRank, con, msg, p) {
    let sql;
    const teamSql = `SELECT pt_tmp.pgid FROM user u_tmp
            INNER JOIN pet_team pt_tmp ON pt_tmp.uid = u_tmp.uid
            LEFT JOIN pet_team_active pt_act ON pt_tmp.pgid = pt_act.pgid
            WHERE u_tmp.id = ${p.msg.author.id}
            ORDER BY pt_act.pgid DESC, pt_tmp.pgid ASC
            LIMIT 1`;

    let users = globalRank ? null : global.getids(msg.channel && msg.channel.guild ? msg.channel.guild.members : []);

    if (globalRank) {
        sql = `SELECT tmp.tname,tmp.id,tmp.streak
            FROM pet_team AS pt
                LEFT JOIN ( SELECT tname,id,streak FROM pet_team pt2 INNER JOIN user u2 ON pt2.uid = u2.uid ORDER BY streak ASC ) AS tmp ON tmp.streak > pt.streak
            WHERE pt.pgid = (${teamSql}) ORDER BY tmp.streak ASC LIMIT 2;`;
        sql += `SELECT tmp.tname,tmp.id,tmp.streak
            FROM pet_team AS pt
                LEFT JOIN ( SELECT tname,id,streak FROM pet_team pt2 INNER JOIN user u2 ON pt2.uid = u2.uid ORDER BY streak DESC ) AS tmp ON tmp.streak < pt.streak
            WHERE pt.pgid = (${teamSql}) ORDER BY tmp.streak DESC LIMIT 2;`;
        sql += `SELECT pt.tname,u.id,pt.streak,(SELECT COUNT(*)+1 FROM pet_team WHERE streak > pt.streak) AS rank
            FROM user u INNER JOIN pet_team pt ON pt.uid = u.uid LEFT JOIN pet_team_active pt_act ON pt.pgid = pt_act.pgid
            WHERE u.id = ${p.msg.author.id} ORDER BY pt_act.pgid DESC, pt.pgid ASC LIMIT 1;`;
    } else {
        sql = `SELECT tmp.tname,tmp.id,tmp.streak
            FROM pet_team AS pt
                LEFT JOIN ( SELECT tname,id,streak FROM pet_team pt2 INNER JOIN user u2 ON pt2.uid = u2.uid ${users ? `WHERE id in (${users})` : ''} ORDER BY streak ASC ) AS tmp ON tmp.streak > pt.streak
            WHERE pt.pgid = (${teamSql}) ORDER BY tmp.streak ASC LIMIT 2;`;
        sql += `SELECT tmp.tname,tmp.id,tmp.streak
            FROM pet_team AS pt
                LEFT JOIN ( SELECT tname,id,streak FROM pet_team pt2 INNER JOIN user u2 ON pt2.uid = u2.uid ${users ? `WHERE id in (${users})` : ''} ORDER BY streak DESC ) AS tmp ON tmp.streak < pt.streak
            WHERE pt.pgid = (${teamSql}) ORDER BY tmp.streak DESC LIMIT 2;`;
        sql += `SELECT pt.tname,u.id,pt.streak,(SELECT COUNT(*)+1 FROM user INNER JOIN pet_team ON user.uid = pet_team.uid ${users ? `WHERE id IN (${users}) AND streak > pt.streak` : 'WHERE streak > pt.streak'}) AS rank
            FROM user u INNER JOIN pet_team pt ON pt.uid = u.uid LEFT JOIN pet_team_active pt_act ON pt.pgid = pt_act.pgid
            WHERE u.id = ${p.msg.author.id} ORDER BY pt_act.pgid DESC, pt.pgid ASC LIMIT 1;`;
    }

    displayRanking(
        con, msg, sql,
        (globalRank ? 'Global ' : '') + 'Battle Streak Ranking',
        function (query) {
            return '\t\t' + (query.tname ? query.tname + ' - ' : '') + 'Streak: ' + global.toFancyNum(query.streak || 0);
        },
        p
    );
}

function getDailyRanking(globalRank, con, msg, p) {
    let users = globalRank ? null : global.getids(msg.channel && msg.channel.guild ? msg.channel.guild.members : []);
    let sql = `
        SELECT id, daily_streak FROM cowoncy 
        WHERE daily_streak > (SELECT daily_streak FROM cowoncy WHERE id = ${p.msg.author.id})
            ${globalRank || !users ? '' : `AND id IN (${users})`}
        ORDER BY daily_streak ASC LIMIT 2;
    `;
    sql += `
        SELECT id, daily_streak FROM cowoncy 
        WHERE daily_streak < (SELECT daily_streak FROM cowoncy WHERE id = ${p.msg.author.id})
            ${globalRank || !users ? '' : `AND id IN (${users})`}
        ORDER BY daily_streak DESC LIMIT 2;
    `;
    sql += `
        SELECT id, daily_streak, (
            SELECT COUNT(*)+1 FROM cowoncy WHERE daily_streak > u.daily_streak
                ${globalRank || !users ? '' : `AND cowoncy.id IN (${users})`}
        ) AS rank
        FROM cowoncy u WHERE u.id = ${p.msg.author.id};
    `;

    displayRanking(
        con, msg, sql,
        (globalRank ? 'Global ' : '') + 'Daily Streak Ranking',
        function (query) {
            return '\t\tStreak: ' + global.toFancyNum(query.daily_streak || 0);
        },
        p
    );
}

async function getLevelRanking(isGlobal, p) {
    try {
        let userRank, userLevel, ranking, text;
        const authorId = p.msg.author.id;
        const guildId = p.msg.channel && p.msg.channel.guild ? p.msg.channel.guild.id : null;

        if (isGlobal || !guildId) {
            userRank = await levels.getUserRank(authorId);
            userLevel = await levels.getUserLevel(authorId);
            ranking = await levels.getNearbyXP(userRank);
            text =
                '```md\n< ' +
                getUserName(p, p.msg.author) +
                "'s Global Level Ranking >\n> Your Rank: " +
                p.global.toFancyNum(userRank || 1) +
                '\n>\t\tLvl ' +
                (userLevel ? userLevel.level : 1) +
                ' ' +
                p.global.toFancyNum(userLevel ? userLevel.currentxp : 0) +
                'xp\n\n';
        } else {
            userRank = await levels.getUserServerRank(authorId, guildId);
            userLevel = await levels.getUserServerLevel(authorId, guildId);
            ranking = await levels.getNearbyServerXP(userRank, guildId);
            text =
                '```md\n< ' +
                getUserName(p, p.msg.author) +
                "'s Level Ranking for " +
                p.msg.channel.guild.name +
                ' >\n> Your Rank: ' +
                p.global.toFancyNum(userRank || 1) +
                '\n>\t\tLvl ' +
                (userLevel ? userLevel.level : 1) +
                ' ' +
                p.global.toFancyNum(userLevel ? userLevel.currentxp : 0) +
                'xp\n\n';
        }

        let counter = userRank - 2;
        if (counter <= 1) counter = 1;
        else text += '>...\n';

        for (let i in ranking) {
            if (i % 2) {
                let tempLevel = await levels.getLevel(ranking[i]);
                text += '\t\tLvl ' + (tempLevel ? tempLevel.level : 1) + ' ' + p.global.toFancyNum(tempLevel ? tempLevel.currentxp : 0) + 'xp\n';
            } else {
                if (ranking[i] === authorId) {
                    let user = getUserName(p, p.msg.author);
                    text += '< ' + counter + '\t' + user + ' >\n';
                } else {
                    let user = await p.fetch.getUser(ranking[i]).catch(() => null);
                    let name = getUserName(p, user);
                    text += '#' + counter + '\t' + name + '\n';
                }
                counter++;
            }
        }

        let date = new Date();
        text +=
            '>...\n\n' +
            date.toLocaleString('en-US', {
                month: '2-digit',
                day: '2-digit',
                year: 'numeric',
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
            }) +
            '```';

        await p.send(text);
    } catch (err) {
        console.error('[LEVEL RANKING ERROR in me.js]', err);
        await p.send('**🚫 | Error:** Failed to fetch level ranking data.');
    }
}

function getShardRanking(globalRank, con, msg, p) {
    let users = globalRank ? null : global.getids(msg.channel && msg.channel.guild ? msg.channel.guild.members : []);
    let authorId = p.msg.author.id;

    let getMyShardSql = `SELECT COALESCE(SUM(count), 0) AS count FROM shards s INNER JOIN user u ON s.uid = u.uid WHERE u.id = ${authorId};`;

    p.query(getMyShardSql).then((myResult) => {
        let myCount = (myResult && myResult[0]) ? myResult[0].count : 0;

        let sql = `
            SELECT u.id, SUM(s.count) as count 
            FROM shards s INNER JOIN user u ON s.uid = u.uid
            ${globalRank || !users ? '' : `WHERE u.id IN (${users})`}
            GROUP BY u.id
            HAVING count > ${myCount}
            ORDER BY count ASC LIMIT 2;
        `;
        sql += `
            SELECT u.id, SUM(s.count) as count 
            FROM shards s INNER JOIN user u ON s.uid = u.uid
            ${globalRank || !users ? '' : `WHERE u.id IN (${users})`}
            GROUP BY u.id
            HAVING count < ${myCount}
            ORDER BY count DESC LIMIT 2;
        `;
        sql += `
            SELECT u.id, COALESCE(SUM(s.count), 0) as count, (
                SELECT COUNT(DISTINCT u2.id) + 1
                FROM shards s2 INNER JOIN user u2 ON s2.uid = u2.uid
                WHERE s2.count > ${myCount}
                    ${globalRank || !users ? '' : `AND u2.id IN (${users})`}
            ) AS rank
            FROM user u LEFT JOIN shards s ON s.uid = u.uid
            WHERE u.id = ${authorId}
            GROUP BY u.id;
        `;

        displayRanking(
            con, msg, sql,
            (globalRank ? 'Global ' : '') + 'Crystal / Weapon Shard Ranking',
            function (query) {
                return '\t\tCrystals/Shards: ' + global.toFancyNum(query ? query.count || 0 : 0);
            },
            p
        );
    }).catch((err) => {
        console.error('[DATABASE ERROR in getShardRanking]', err);
        p.send('**🚫 | Error:** Failed to query Crystal / Weapon Shard ranking data.');
    });
}

function getTTRanking(globalRank, con, msg, p, tt) {
    let wid;
    if (/^w\d{3}$/gi.test(tt)) {
        wid = parseInt(tt.substring(1)) - 100;
    }
    let users = globalRank ? null : global.getids(msg.channel && msg.channel.guild ? msg.channel.guild.members : []);
    let sql = `
        SELECT u.id, uwk.kills, uw.wid, uw.uwid, uw.avg, uw.wear
        FROM user_weapon_kills uwk
            LEFT JOIN user_weapon uw ON uwk.uwid = uw.uwid
            LEFT JOIN user u ON uw.uid = u.uid
        WHERE kills > (
            SELECT uwk2.kills FROM user_weapon_kills uwk2 LEFT JOIN user_weapon uw2 ON uwk2.uwid = uw2.uwid LEFT JOIN user u2 ON uw2.uid = u2.uid
            WHERE u2.id = ${p.msg.author.id} ${wid ? `AND uw2.wid = ${wid}` : ''} ORDER by uwk2.kills DESC LIMIT 1
        )
            ${globalRank || !users ? '' : `AND u.id IN (${users})`} ${wid ? `AND uw.wid = ${wid}` : ''}
        ORDER BY kills ASC LIMIT 2;
    `;
    sql += `
        SELECT u.id, uwk.kills, uw.wid, uw.uwid, uw.avg, uw.wear
        FROM user_weapon_kills uwk
            LEFT JOIN user_weapon uw ON uwk.uwid = uw.uwid
            LEFT JOIN user u ON uw.uid = u.uid
        WHERE kills < (
            SELECT uwk2.kills FROM user_weapon_kills uwk2 LEFT JOIN user_weapon uw2 ON uwk2.uwid = uw2.uwid LEFT JOIN user u2 ON uw2.uid = u2.uid
            WHERE u2.id = ${p.msg.author.id} ${wid ? `AND uw2.wid = ${wid}` : ''} ORDER by uwk2.kills DESC LIMIT 1
        )
            ${globalRank || !users ? '' : `AND u.id IN (${users})`} ${wid ? `AND uw.wid = ${wid}` : ''}
        ORDER BY kills DESC LIMIT 2;
    `;
    sql += `
        SELECT uwk.kills, uw.wid, uw.uwid, uw.avg, uw.wear, u.id, (
            SELECT COUNT(*) + 1 FROM user_weapon_kills LEFT JOIN user_weapon ON user_weapon.uwid = user_weapon_kills.uwid LEFT JOIN user ON user_weapon.uid = user.uid
            WHERE user_weapon_kills.kills > uwk.kills ${globalRank || !users ? '' : `AND user.id IN (${users})`} ${wid ? `AND user_weapon.wid = ${wid}` : ''}
        ) AS rank
        FROM user_weapon_kills uwk LEFT JOIN user_weapon uw ON uwk.uwid = uw.uwid LEFT JOIN user u ON uw.uid = u.uid
        WHERE u.id = ${p.msg.author.id} ${wid ? `AND wid = ${wid}` : ''} ORDER BY uwk.kills DESC LIMIT 1;
    `;

    displayRanking(
        con, msg, sql,
        (globalRank ? 'Global ' : '') + 'Weapon Takedown Ranking',
        function (query) {
            const weaponName = WeaponInterface.weapons[`${query.wid}`] ? WeaponInterface.weapons[`${query.wid}`].getName : 'Unknown Weapon';
            const uwid = weaponUtil.shortenUWID(query.uwid || 0);
            const wear = query.wear > 1 ? WeaponInterface.getWear(query.wear).name + ' ' : '';
            return `\t\t[${global.toFancyNum(query.kills || 0)}][${uwid}] ${query.avg || 0}% ${wear}${weaponName}`;
        },
        p
    );
}