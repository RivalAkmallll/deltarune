/*
 * Delta Rune Bot for Discord - Dark RPG Quest System
 * Copyright (C) 2026 Christopher Thai / Custom Edition
 */

const CommandInterface = require('../../CommandInterface.js');
const dateUtil = require('../../../utils/dateUtil.js');
const global = require('../../../utils/global.js');

const questJson = {
    dungeonSlayer: {
        chance: [0.5, 0.3, 0.2],
        count: [5, 10, 20],
        cowoncy: [1500, 3500, 8000],
        lootbox: [1, 2, 4],
        crate: [0, 1, 2],
        crystal: [50, 150, 400]
    },
    dungeonRaid: {
        chance: [0.4, 0.4, 0.2],
        count: [3, 7, 15],
        cowoncy: [2000, 4500, 10000],
        lootbox: [1, 3, 5],
        crate: [1, 2, 3],
        crystal: [80, 200, 500]
    },
    bossHunt: {
        chance: [0.6, 0.3, 0.1],
        count: [1, 3, 5],
        cowoncy: [3000, 7000, 15000],
        lootbox: [2, 4, 8],
        crate: [1, 3, 5],
        crystal: [150, 400, 1000]
    },
    oreMining: {
        chance: [0.5, 0.3, 0.2],
        count: [10, 25, 50],
        cowoncy: [1000, 2500, 6000],
        lootbox: [1, 2, 3],
        crate: [0, 1, 2],
        crystal: [40, 120, 300]
    },
    weaponCraft: {
        chance: [0.7, 0.2, 0.1],
        count: [1, 2, 4],
        cowoncy: [2500, 6000, 12000],
        lootbox: [1, 3, 6],
        crate: [1, 2, 4],
        crystal: [100, 300, 800]
    },
    soulHarvest: {
        chance: [0.4, 0.4, 0.2],
        count: [4, 8, 16],
        cowoncy: [1800, 4000, 9500],
        lootbox: [1, 2, 4],
        crate: [1, 2, 3],
        crystal: [90, 250, 600]
    }
};

module.exports = new CommandInterface({
	alias: ['quest', 'q'],

	args: '[rr | lock | unlock] {num}',

	desc: 'Embark on Dark RPG daily quests! Cleanse dungeons and earn crystal rewards!',

	example: ['delta quest', 'delta quest rr 1', 'delta quest lock 1', 'delta quest unlock 1'],

	permissions: ['sendMessages', 'embedLinks'],

	group: ['economy'],

	related: [],

	cooldown: 5000,
	half: 100,
	six: 500,

	execute: async function (p) {
		try {
			if (
				p.args.length == 2 &&
				(p.args[0] == 'rr' || p.args[0] == 'reroll') &&
				p.global.isInt(p.args[1])
			)
				await rrQuest(p);
			else if (
				p.args.length == 2 &&
				(p.args[0] == 'lock' || p.args[0] == 'unlock') &&
				p.global.isInt(p.args[1])
			)
				await lockUnlockQuest(p);
			else await addQuest(p);
		} catch (err) {
			console.error('================ SQL/QUEST ERROR DETAILED ================');
			console.error(err);
			console.error('==========================================================');
			await p.send('**❌ | Database or execution error occurred. Check terminal console logs.**');
		}
	},
});

async function addQuest(p) {
	await p.query(`INSERT IGNORE INTO user (id, count) VALUES (${p.msg.author.id}, 0);`);
	await p.query(`INSERT IGNORE INTO timers (uid) VALUES ((SELECT uid FROM user WHERE id = ${p.msg.author.id}));`);

	// Daftarkan semua master referensi foreign key database secara otomatis
	await p.query(`INSERT IGNORE INTO quest_level (level) VALUES (0), (1), (2);`);
	await p.query(`INSERT IGNORE INTO quest_prizes (prize) VALUES ('cowoncy'), ('crate'), ('lootbox'), ('crystal');`);
	
	for (let qKey of Object.keys(questJson)) {
		await p.query(`INSERT IGNORE INTO quest_types (qname) VALUES ('${qKey}');`);
	}

	let timerRes = await p.query(`SELECT questTime FROM timers WHERE uid = (SELECT uid FROM user WHERE id = ${p.msg.author.id});`);
	let timerRow = Array.isArray(timerRes) ? timerRes[0] : timerRes;
	let afterMid = dateUtil.afterMidnight(timerRow ? timerRow.questTime : undefined);

	let questRes = await p.query(`SELECT * FROM quest WHERE uid = (SELECT uid FROM user WHERE id = ${p.msg.author.id}) ORDER BY qid asc;`);
	let questList = Array.isArray(questRes) ? questRes : [];

	if (questList.length === 0) {
		for (let i = 0; i < 3; i++) {
			let newQ = getQuest(p.msg.author.id, i, afterMid ? afterMid.sql : null);
			await p.query(newQ.typeSql);
			await p.query(newQ.levelSql);
			await p.query(newQ.prizeSql);
			await p.query(newQ.sql);
		}

		if (afterMid && afterMid.sql) {
			await p.query(`UPDATE timers SET questTime = ${afterMid.sql} WHERE uid = (SELECT uid FROM user WHERE id = ${p.msg.author.id});`);
		}

		let refreshed = await p.query(`SELECT * FROM quest WHERE uid = (SELECT uid FROM user WHERE id = ${p.msg.author.id}) ORDER BY qid asc;`);
		questList = Array.isArray(refreshed) ? refreshed : [];
	}

	if (p.cache && typeof p.cache.clearQuests === 'function') {
		p.cache.clearQuests(p.msg.author.id);
	}

	let quests = parseQuests(questList);
	let embed = constructEmbed(p, afterMid, quests);
	await p.send({ embed });
}

async function rrQuest(p) {
	let qnum = parseInt(p.args[1]) - 1;
	let timerRes = await p.query(`SELECT questrrTime FROM timers WHERE uid = (SELECT uid FROM user WHERE id = ${p.msg.author.id});`);
	let timerRow = Array.isArray(timerRes) ? timerRes[0] : timerRes;
	let afterMid = dateUtil.afterMidnight(timerRow ? timerRow.questrrTime : undefined);

	if (!afterMid || !afterMid.after) {
		p.errorMsg(', you already rerolled a dark quest today, adventurer!', 3000);
		return;
	}

	let questRes = await p.query(`SELECT qid, locked FROM user INNER JOIN quest ON user.uid = quest.uid WHERE id = ${p.msg.author.id} ORDER BY qid ASC;`);
	let questRows = Array.isArray(questRes) ? questRes : [];

	let valid = false;
	let targetQid = null;
	let locked = false;
	for (let i in questRows) {
		if (!valid && i == qnum) {
			valid = true;
			targetQid = questRows[i].qid;
			locked = questRows[i].locked;
		}
	}
	if (!valid) {
		p.errorMsg(', Could not locate that dark quest contract.', 3000);
		return;
	}

	let newQ = getQuest(p.msg.author.id, targetQid, undefined, locked);
	await p.query(`DELETE FROM quest WHERE uid = (SELECT uid FROM user WHERE id = ${p.msg.author.id}) AND qid = ${targetQid};`);
	await p.query(newQ.typeSql);
	await p.query(newQ.levelSql);
	await p.query(newQ.prizeSql);
	await p.query(newQ.sql);
	await p.query(`UPDATE timers LEFT JOIN user ON timers.uid = user.uid SET questrrTime = ${afterMid.sql} WHERE id = ${p.msg.author.id};`);

	if (p.cache && typeof p.cache.clearQuests === 'function') {
		p.cache.clearQuests(p.msg.author.id);
	}

	let finalRes = await p.query(`SELECT * FROM quest WHERE uid = (SELECT uid FROM user WHERE id = ${p.msg.author.id}) ORDER BY qid asc;`);
	let quests = parseQuests(Array.isArray(finalRes) ? finalRes : []);
	let embed = constructEmbed(p, afterMid, quests);

	await p.send({ embed });
}

async function lockUnlockQuest(p) {
	let qnum = parseInt(p.args[1]) - 1;
	let questRes = await p.query(`SELECT qid FROM user INNER JOIN quest ON user.uid = quest.uid WHERE id = ${p.msg.author.id} ORDER BY qid ASC;`);
	let questRows = Array.isArray(questRes) ? questRes : [];

	let valid = false;
	let targetQid = null;
	for (let i in questRows) {
		if (!valid && i == qnum) {
			valid = true;
			targetQid = questRows[i].qid;
		}
	}
	if (!valid) {
		p.errorMsg(', Could not locate that quest contract.', 3000);
		return;
	}

	let lock = p.args[0].toLowerCase() === 'lock' ? 1 : 0;
	await p.query(`UPDATE quest SET locked = ${lock} WHERE uid = (SELECT uid FROM user WHERE id = ${p.msg.author.id}) AND qid = ${targetQid};`);

	if (p.cache && typeof p.cache.clearQuests === 'function') {
		p.cache.clearQuests(p.msg.author.id);
	}

	let updatedRows = await p.query(`SELECT * FROM quest WHERE uid = (SELECT uid FROM user WHERE id = ${p.msg.author.id}) ORDER BY qid asc;`);
	let timerRes = await p.query(`SELECT questTime FROM timers WHERE uid = (SELECT uid FROM user WHERE id = ${p.msg.author.id});`);
	
	let timerRow = Array.isArray(timerRes) ? timerRes[0] : timerRes;
	let afterMid = dateUtil.afterMidnight(timerRow ? timerRow.questTime : undefined);
	let quests = parseQuests(Array.isArray(updatedRows) ? updatedRows : []);
	let embed = constructEmbed(p, afterMid, quests);

	await p.send({ embed });
}

function constructEmbed(p, afterMid, quests) {
	let username = p.msg.author.username || 'Adventurer';
	return {
		color: 0x8b0000,
		author: {
			name: `⚔️ ${username}'s Dark Dungeon Quest Log`,
			icon_url: p.msg.author.avatarURL,
		},
		description: `**Adventurer:** <@${p.msg.author.id}>\n*Complete these dark contracts to forge your legacy.*\n\n${quests.text}`,
		image: {
			url: 'https://giffiles.alphacoders.com/146/14685.gif'
		},
		footer: {
			text: `Next dungeon contract reset in: ${afterMid && afterMid.hours ? afterMid.hours : 0}H ${afterMid && afterMid.minutes ? afterMid.minutes : 0}M ${afterMid && afterMid.seconds ? afterMid.seconds : 0}S`,
		},
	};
}

function getQuest(id, qIndex = 0, afterMidSQL = null, lockedVal = 0) {
	let key = Object.keys(questJson);
	key = key[Math.floor(Math.random() * key.length)];
	let quest = questJson[key];

	let rand = Math.random();
	let loc = 0;
	for (let i = 0; i < quest.chance.length; i++) {
		loc += quest.chance[i];
		if (rand <= loc) {
			loc = i;
			i = quest.chance.length;
		}
	}

	let prize = 'cowoncy';
	rand = Math.random();
	if (rand > 0.75) prize = 'crate';
	else if (rand > 0.5) prize = 'lootbox';
	else if (rand > 0.25) prize = 'crystal';

	let typeSql = `INSERT IGNORE INTO quest_types (qname) VALUES ('${key}');`;
	let levelSql = `INSERT IGNORE INTO quest_level (level) VALUES (${loc});`;
	let prizeSql = `INSERT IGNORE INTO quest_prizes (prize) VALUES ('${prize}');`;
	let sql = `INSERT INTO quest (uid, qid, qname, level, prize, count, locked) values (
			(SELECT uid FROM user WHERE id = ${id}),
			${qIndex},
			'${key}',
			${loc},
			'${prize}',
			0,
			${lockedVal}	
		);`;

	return { sql, typeSql, levelSql, prizeSql, key, level: loc, prize };
}

function parseQuests(result) {
	let activeList = Array.isArray(result) ? [...result] : [];
	let text = '';

	for (let i = 0; i < activeList.length; i++) {
		const texts = parseQuest(activeList[i]);
		text += `**${i + 1}. ${texts.text}**`;
		text += `\n\`‣ Bounty Reward:\` ${texts.reward}`;
		text += `\n\`‣ Dungeon Progress: [${texts.progress}]\`\n`;
		if (texts.locked) {
			text += '`‣ 🔒 Contract Sealed (Locked)`\n';
		}
		text += '\n';
	}

	if (text == '') text = '🛡️ You have no active dark contracts right now. Check back later or use contracts wisely!';

	return { text };
}

function parseQuest(questInfo) {
	let quest = questJson[questInfo.qname];
	if (!quest) {
		return { text: 'Unknown Dark Quest', reward: '0 Gold', progress: '0/1', locked: false };
	}
	let reward, text, progress;

	if (questInfo.prize == 'cowoncy') {
		reward = global.toFancyNum(quest.cowoncy[questInfo.level]) + ' 🪙 Gold Coins';
	} else if (questInfo.prize == 'lootbox') {
		reward = '📦 '.repeat(quest.lootbox[questInfo.level]) + ' Relic Chest';
	} else if (questInfo.prize == 'crate') {
		reward = '🗝️ '.repeat(quest.crate[questInfo.level]) + ' Mythic Crate';
	} else if (questInfo.prize == 'crystal') {
		reward = global.toFancyNum(quest.crystal[questInfo.level]) + ' 🔮 Crystals';
	}

	let count = quest.count[questInfo.level];
	if (global.isInt(count)) {
		progress = (questInfo.count || 0) + '/' + count;
	} else {
		progress = (questInfo.count || 0) + '/3';
	}
	let locked = !!questInfo.locked;

	switch (questInfo.qname) {
		case 'dungeonSlayer':
			text = `Slay ${count} corrupted dungeon monsters!`;
			break;
		case 'dungeonRaid':
			text = `Successfully raid ${count} underground catacombs!`;
			break;
		case 'bossHunt':
			text = `Defeat ${count} elite raid boss entities!`;
			break;
		case 'oreMining':
			text = `Mine ${count} rare dark iron ores in the abyss!`;
			break;
		case 'weaponCraft':
			text = `Forge or upgrade ${count} legendary armaments!`;
			break;
		case 'soulHarvest':
			text = `Harvest ${count} wandering dark souls!`;
			break;
		default:
			text = 'Slay ' + count + ' dark entities!';
			break;
	}

	return { text, reward, progress, locked };
}