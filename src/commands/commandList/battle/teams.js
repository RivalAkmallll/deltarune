/*
 * OwO Bot for Discord
 * Copyright (C) 2019 Christopher Thai
 * This software is licensed under Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International
 * For more information, see README.md and LICENSE
 */

const CommandInterface = require('../../CommandInterface.js');

const teamUtil = require('./util/teamUtil.js');
const battleFriendUtil = require('./util/battleFriendUtil.js');
const starEmoji = '⭐';

module.exports = new CommandInterface({
    alias: ['teams', 'setteam', 'squads', 'useteams'],

    args: '{teamNumber}',

    desc: 'Select a different RPG party team!',

    example: ['delta teams', 'delta setteam 2'],

    related: ['delta battle', 'delta team'],

    permissions: ['sendMessages', 'embedLinks', 'addReactions'],

    group: ['animals'],

    cooldown: 5000,
    half: 80,
    six: 500,

    execute: async function (p) {
        if (p.args.length < 1) {
            displayTeams(p);
        } else if (p.global.isInt(p.args[0])) {
            setTeam(p, +p.args[0]);
        } else {
            if (typeof p.errorMsg === 'function') {
                p.errorMsg(', the correct syntax is `delta setteam {teamNumber}`', 3000);
            } else if (p.msg && p.msg.channel) {
                p.msg.channel.createMessage('❌ **|** The correct syntax is `delta setteam {teamNumber}`').catch(() => {});
            }
        }
    },
});

async function displayTeams(p) {
    let maxTeams = await teamUtil.getMaxTeams.bind(p)(p.msg.author);
    let sql = `SELECT pet_team.pgid, tname, pet_team_animal.pos, name, nickname, animal.pid, xp, pet_team.streak, highest_streak
        FROM user
            INNER JOIN pet_team
                ON user.uid = pet_team.uid
            INNER JOIN pet_team_animal
                ON pet_team.pgid = pet_team_animal.pgid 
            INNER JOIN animal
                ON pet_team_animal.pid = animal.pid
        WHERE user.id = ${p.msg.author.id} AND pet_team.disabled = 0
        ORDER BY pgid ASC, pet_team_animal.pos ASC;`;
    sql += `SELECT DISTINCT
            a.pid, a.uwid, a.wid, a.stat, a.rrcount, a.rrattempt, a.wear,
            b.pcount, b.wpid, b.stat as pstat,
            c.name, c.nickname,
            d.uwid as tt, d.kills
        FROM user u
            INNER JOIN pet_team pt
                ON u.uid = pt.uid
            INNER JOIN pet_team_animal pta
                ON pt.pgid = pta.pgid
            INNER JOIN animal c
                ON pta.pid = c.pid
            INNER JOIN user_weapon a
                ON pta.pid = a.pid
            LEFT JOIN user_weapon_passive b
                ON a.uwid = b.uwid
            LEFT JOIN user_weapon_kills d
                ON a.uwid = d.uwid
        WHERE u.id = ${p.msg.author.id} AND pt.disabled = 0;`;
    sql += `SELECT pet_team.pgid, pet_team_active.pgid AS active FROM user
        INNER JOIN pet_team
            ON user.uid = pet_team.uid
        LEFT JOIN pet_team_active
            ON pet_team.pgid = pet_team_active.pgid
        WHERE user.id = ${p.msg.author.id} AND pet_team.disabled = 0
        ORDER BY pgid ASC;`;
    let result = await p.query(sql);

    const teamsObj = {};
    const animalMap = {};
    for (let i in result[0]) {
        let animal = result[0][i];
        let pgid = animal.pgid;

        if (!animalMap[animal.pid]) animalMap[animal.pid] = [];
        animalMap[animal.pid].push(pgid);
        if (!teamsObj[pgid]) teamsObj[pgid] = { animals: [], weapons: [] };
        teamsObj[pgid].animals.push(animal);
    }

    for (let i in result[1]) {
        let weapon = result[1][i];
        let pgids = animalMap[weapon.pid];
        if (pgids) {
            for (let j in pgids) {
                let pgid = pgids[j];
                teamsObj[pgid].weapons.push(weapon);
            }
        }
    }

    let activeTeam = 0;
    const teamsOrder = {};
    if (!result[2].length) {
        if (typeof p.errorMsg === 'function') {
            p.errorMsg(", You don't have an  party team yet! Create one with `delta team add {class}`!", 5000);
        } else if (p.msg && p.msg.channel) {
            p.msg.channel.createMessage('❌ **|** You don\'t have an RPG party team yet! Create one with `delta team add {class}`!').catch(() => {});
        }
        return;
    }

    for (let i in result[2]) {
        teamsOrder[result[2][i].pgid] = i;
        if (result[2][i].active) activeTeam = i;
    }

    const teams = [];
    for (let i in teamsObj) {
        let team = teamsObj[i];
        const pgid = team.animals[0].pgid;
        const other = {
            streak: team.animals[0].streak,
            highest_streak: team.animals[0].highest_streak,
            tname: team.animals[0].tname || 'RPG Party',
        };
        team = teamUtil.parseTeam(team.animals, team.weapons);
        const embed = teamUtil.createTeamEmbed(p, team, other);
        const teamOrder = teamsOrder[pgid];
        if (teamOrder == null) {
            if (typeof p.errorMsg === 'function') {
                p.errorMsg(", I couldn't parse your party... something went wrong!", 3000);
            }
            return;
        }
        teams[teamOrder] = embed;
    }

    for (let i = 0; i < maxTeams; i++) {
        if (!teams[i]) {
            teams[i] = {
                author: {
                    name: p.getName() + "'s RPG Party",
                    icon_url: p.msg.author.avatarURL,
                },
                description:
                    '`delta team add {class} {pos}` Add a shop class to your party\n`delta team remove {pos}` Remove a character from your party\n`delta team rename {name}` Rename your party\n`delta setteam {teamNum}` Switch between active parties',
                color: p.config.embed_color,
                footer: {
                    text: `Party Streak: 0 | Highest Streak: 0 | Page ${i + 1}/${maxTeams}`,
                },
                fields: [],
            };
            for (let j = 1; j <= 3; j++) {
                teams[i].fields.push({
                    name: 'Empty Slot',
                    value: '*`delta team add {class} ' + j + '`*',
                    inline: true,
                });
            }
        } else {
            teams[i].footer.text += ` | Page ${i + 1}/${maxTeams}`;
        }
        if (activeTeam == i) {
            teams[i].footer.text += ' ' + starEmoji;
        }
    }

    const createEmbed = (curr) => {
        return teams[curr];
    };
    const additionalButtons = [
        {
            type: 2,
            style: 1,
            custom_id: 'star',
            emoji: {
                id: null,
                name: starEmoji,
            },
        },
    ];
    const additionalFilter = (componentName, user) =>
        componentName === 'star' && user.id == p.msg.author.id;
    const pagedMsg = new p.PagedMessage(p, createEmbed, maxTeams - 1, {
        startingPage: activeTeam,
        idle: 120000,
        additionalFilter,
        additionalButtons,
    });

    pagedMsg.on('button', async (component, user, ack, { currentPage, maxPage }) => {
        if (component === 'star') {
            await setTeam(p, currentPage + 1, true);
            for (let i in teams) {
                teams[i].footer.text = teams[i].footer.text.replace(` ${starEmoji}`, '');
            }
            teams[currentPage].footer.text += ` ${starEmoji}`;
            await ack({ embed: teams[currentPage] });
        }
    });
}

async function setTeam(p, teamNum, dontDisplay) {
    let maxTeams = await teamUtil.getMaxTeams.bind(p)(p.msg.author);
    if (!teamNum || teamNum < 1 || teamNum > maxTeams) {
        if (typeof p.errorMsg === 'function') p.errorMsg(', Invalid party team number!', 3000);
        return;
    }

    if (await battleFriendUtil.inBattle(p)) {
        if (typeof p.errorMsg === 'function') {
            p.errorMsg(', You cannot change your active party while in a pending duel! Use `delta db` to decline.', 3000);
        }
        return;
    }

    let sql = `SELECT uid FROM user WHERE id = ${p.msg.author.id};
        SELECT pgid FROM user LEFT JOIN pet_team ON user.uid = pet_team.uid WHERE id = ${
            p.msg.author.id
        } AND pet_team.disabled = 0 ORDER BY pgid LIMIT 1 OFFSET ${teamNum - 1}`;
    let result = await p.query(sql);

    if (!result[0]) {
        if (typeof p.errorMsg === 'function') {
            p.errorMsg(", You don't have any characters unlocked! Buy or obtain them first.", 3000);
        }
        return;
    }

    let pgid = result[1][0];
    let uid = result[0][0].uid;
    if (!pgid) {
        sql = `INSERT INTO pet_team (uid) VALUES (${uid});`;
        result = await p.query(sql);
        pgid = result.insertId;
    } else pgid = pgid.pgid;

    sql = `INSERT INTO pet_team_active (uid,pgid) VALUES (${uid},${pgid}) ON DUPLICATE KEY UPDATE pgid = ${pgid};`;
    await p.query(sql);
    if (!dontDisplay) displayTeams(p);
}