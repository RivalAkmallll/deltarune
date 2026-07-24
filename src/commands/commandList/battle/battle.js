/*
 * OwO Bot for Discord
 * Copyright (C) 2019 Christopher Thai
 * This software is licensed under Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International
 * For more information, see README.md and LICENSE
 */

const CommandInterface = require('../../CommandInterface.js');

const banners = {
    victory: 'https://i.redd.it/iqjudpm6yn701.gif',
    defeat: 'https://i.redd.it/iqjudpm6yn701.gif'
};

const stagesData = {
    '1-1': { area: 1, name: 'Goblin Scout', hp: 100, maxHp: 100 },
    '1-2': { area: 1, name: 'Forest Slime', hp: 120, maxHp: 120 },
    '1-3': { area: 1, name: 'Wild Wolf', hp: 150, maxHp: 150 },
    '1-4': { area: 1, name: 'Aggressive Orc', hp: 180, maxHp: 180 },
    '1-5': { area: 1, name: 'Shadow Thief', hp: 210, maxHp: 210 },
    '1-6': { area: 1, name: 'Stone Golem', hp: 250, maxHp: 250 },
    '1-7': { area: 1, name: 'Dark Sorcerer', hp: 290, maxHp: 290 },
    '1-8': { area: 1, name: 'Young Wyvern', hp: 340, maxHp: 340 },
    '1-9': { area: 1, name: 'Cursed Knight', hp: 400, maxHp: 400 },
    '1-10': { area: 1, name: '👑 Area 1 Boss: Ancient Dragon', hp: 800, maxHp: 800 },

    '2-1': { area: 2, name: 'Undead Soldier', hp: 500, maxHp: 500 },
    '2-2': { area: 2, name: 'Venom Spider', hp: 550, maxHp: 550 },
    '2-3': { area: 2, name: 'Lava Hound', hp: 610, maxHp: 610 },
    '2-4': { area: 2, name: 'Corrupt Mage', hp: 680, maxHp: 680 },
    '2-5': { area: 2, name: 'Minotaur Warrior', hp: 760, maxHp: 760 },
    '2-6': { area: 2, name: 'Phantom Assassin', hp: 850, maxHp: 850 },
    '2-7': { area: 2, name: 'Desert Scorpion King', hp: 950, maxHp: 950 },
    '2-8': { area: 2, name: 'Abyssal Siren', hp: 1060, maxHp: 1060 },
    '2-9': { area: 2, name: 'Iron Titan', hp: 1180, maxHp: 1180 },
    '2-10': { area: 2, name: '👑 Area 2 Boss: Demon Lord Malakor', hp: 2500, maxHp: 2500 },

    '3-1': { area: 3, name: 'Void Stalker', hp: 1500, maxHp: 1500 },
    '3-2': { area: 3, name: 'Chaos Fiend', hp: 1650, maxHp: 1650 },
    '3-3': { area: 3, name: 'Hellfire Drake', hp: 1820, maxHp: 1820 },
    '3-4': { area: 3, name: 'Doom Knight', hp: 2000, maxHp: 2000 },
    '3-5': { area: 3, name: 'Shadow Behemoth', hp: 2200, maxHp: 2200 },
    '3-6': { area: 3, name: 'Celestial Watcher', hp: 2450, maxHp: 2450 },
    '3-7': { area: 3, name: 'Nether Reaper', hp: 2750, maxHp: 2750 },
    '3-8': { area: 3, name: 'Colossal Chimera', hp: 3100, maxHp: 3100 },
    '3-9': { area: 3, name: 'Harbinger of Ruin', hp: 3500, maxHp: 3500 },
    '3-10': { area: 3, name: '👑 Area 3 Boss: The Eternal Overlord', hp: 7500, maxHp: 7500 }
};

// Fungsi pembantu untuk menentukan stage berikutnya secara otomatis
function getNextStage(currentStage) {
    let parts = currentStage.split('-');
    let area = parseInt(parts[0]);
    let stageNum = parseInt(parts[1]);

    if (stageNum < 10) {
        return `${area}-${stageNum + 1}`;
    } else if (area < 3) {
        return `${area + 1}-1`;
    } else {
        return '3-10'; // Max stage reached
    }
}

module.exports = new CommandInterface({
    alias: ['battle', 'b', 'fight'],

    args: '[stage]',

    desc: 'Advanced stage battle system across 3 areas with auto-progression, small balanced rewards (coins, crystals, exp), and quests.',

    example: ['delta battle', 'delta battle 1-1', 'delta battle 1-10'],

    related: ['delta quest', 'delta zoo', 'delta weapon'],

    permissions: ['sendMessages', 'embedLinks', 'addReactions'],

    group: ['animals', 'rpg'],

    cooldown: 5000,
    half: 80,
    six: 500,
    bot: true,

    execute: async function (p) {
        let authorId = p.msg.author.id;
        let args = p.args ? p.args.slice() : [];
        let targetStage = args[0] ? args[0].toLowerCase() : '1-1';

        if (!stagesData[targetStage]) {
            targetStage = '1-1';
        }

        let monster = stagesData[targetStage];
        let isBoss = targetStage.endsWith('-10');

        let userHasWeapon = false;
        try {
            let invQuery = `SELECT * FROM weapon WHERE id = '${authorId}' LIMIT 1;`;
            let invResult = await p.query(invQuery);
            if (invResult && invResult.length > 0) {
                userHasWeapon = true;
            }
        } catch (e) {}

        let baseWinChance = userHasWeapon ? 0.70 : 0.35;
        let stageNumFactor = parseInt(targetStage.split('-')[0]) * 0.05 + parseInt(targetStage.split('-')[1]) * 0.01;
        let finalWinChance = Math.max(0.10, baseWinChance - stageNumFactor);
        if (isBoss) finalWinChance -= 0.15;

        let isWin = Math.random() < finalWinChance;
        let remainingHp = isWin ? 0 : Math.floor(monster.maxHp * (0.3 + Math.random() * 0.5));
        
        let hpPercentage = Math.max(0, Math.min(100, Math.floor((remainingHp / monster.maxHp) * 100)));
        let filledBlocks = Math.floor(hpPercentage / 10);
        let emptyBlocks = 10 - filledBlocks;
        let hpBar = '█'.repeat(filledBlocks) + '░'.repeat(emptyBlocks);

        // Hadiah seimbang & tidak terlalu besar (Koin, Crystal acak kecil, dan EXP)
        let rewardCoins = Math.floor(50 + Math.random() * 100) * parseInt(targetStage.split('-')[0]);
        let rewardCrystals = Math.random() < 0.3 ? Math.floor(1 + Math.random() * 3) : 0; // 30% kemungkinan dapat 1-3 crystal
        let rewardExp = Math.floor(30 + Math.random() * 50) * parseInt(targetStage.split('-')[0]);
        let nextStage = getNextStage(targetStage);

        if (isWin) {
            try {
                // Update koin dan crystal ke tabel economy jika ada
                await p.query(`UPDATE economy SET coins = coins + ${rewardCoins}, crystals = crystals + ${rewardCrystals} WHERE id = '${authorId}';`).catch(() => {});

                let questCheckQuery = `SELECT * FROM quest WHERE id = '${authorId}' LIMIT 1;`;
                let questResult = await p.query(questCheckQuery);
                
                if (questResult && questResult.length > 0) {
                    let currentProgress = questResult[0].progress || 0;
                    let newProgress = currentProgress + 1;
                    await p.query(`UPDATE quest SET progress = ${newProgress} WHERE id = '${authorId}';`);
                } else {
                    await p.query(`INSERT IGNORE INTO quest (id, progress, target) VALUES ('${authorId}', 1, 5);`);
                }
            } catch (e) {}

            let winEmbed = {
                title: `⚔️ BATTLE VICTORY: STAGE ${targetStage.toUpperCase()}`,
                description: `**${p.getName()}** triumphed over **${monster.name}**!\n\n` +
                             `🎯 **Monster Status:**\n` +
                             `• HP: \`${remainingHp} / ${monster.maxHp}\` [${hpBar}] **0%**\n\n` +
                             `🎁 **Rewards Collected:**\n` +
                             `• Coins: \`$${rewardCoins}\`\n` +
                             `• Crystals: \`${rewardCrystals} Crystals\`\n` +
                             `• EXP: \`${rewardExp} XP\`\n\n` +
                             `🚀 **Next Stage Unlocked:** Type \`delta battle ${nextStage}\` to continue your journey!\n` +
                             `📜 *Quest progression updated successfully!*`,
                color: 0x00FF00,
                image: { url: banners.victory },
                footer: { text: `Delta RPG System • Stage Area ${monster.area}` },
                timestamp: new Date()
            };
            p.send({ embed: winEmbed });
        } else {
            let loseEmbed = {
                title: `💀 BATTLE DEFEAT: STAGE ${targetStage.toUpperCase()}`,
                description: `**${p.getName()}** was crushed by **${monster.name}**!\n\n` +
                             `🎯 **Monster Status:**\n` +
                             `• HP: \`${remainingHp} / ${monster.maxHp}\` [${hpBar}] **${hpPercentage}%**\n\n` +
                             `❌ *Defeat! Equip better weapons and upgrade your gear to beat this stage!*`,
                color: 0xFF0000,
                image: { url: banners.defeat },
                footer: { text: `Delta RPG System • Stage Area ${monster.area}` },
                timestamp: new Date()
            };
            p.send({ embed: loseEmbed });
        }
    },
});