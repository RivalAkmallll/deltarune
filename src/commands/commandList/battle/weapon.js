/*
 * OwO Bot for Discord
 * Copyright (C) 2019 Christopher Thai
 * This software is licensed under Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International
 * For more information, see README.md and LICENSE
 */

const CommandInterface = require('../../CommandInterface.js');

module.exports = new CommandInterface({
	alias: ['weapon', 'w', 'weapons', 'wep'],

	args: '',

	desc: 'Manage your weapon inventory.',

	example: ['delta weapon'],

	related: ['delta battle', 'delta shop'],

	permissions: ['sendMessages', 'embedLinks', 'addReactions'],

	group: ['animals', 'rpg'],

	cooldown: 5000,
	half: 100,
	six: 500,

	execute: async function (p) {
		let authorId = p.msg.author.id;
		let weaponsList = [];

		try {
			weaponsList = await p.query(`SELECT * FROM weapon WHERE id = '${authorId}';`);
		} catch (e) {}

		if (!weaponsList || weaponsList.length === 0) {
			let emptyEmbed = {
				title: `⚔️ ${p.getName()}'s Weapon Inventory`,
				description: `You don't have any weapons in your inventory yet!\n\n` +
				             `*Purchase weapons via \`delta buy W101\` to build your arsenal.*`,
				color: 0x95A5A6,
				footer: { text: `Delta RPG System • Total Weapons: 0` },
				timestamp: new Date()
			};
			p.send({ embed: emptyEmbed });
			return;
		}

		let description = `Here is your weapon inventory list:\n\n`;
		for (let i = 0; i < weaponsList.length; i++) {
			let w = weaponsList[i];
			let weaponName = w.name || `Weapon #${i + 1}`;
			let weaponDmg = w.damage || w.power || 120;
			let isEquipped = w.equipped === 1 ? '🟢 **[Equipped]**' : '⚪ **[Unequipped]**';

			description += `**[${i + 1}]** - **${weaponName}**\n` +
			               `└ Damage: \`+${weaponDmg} ATK\` | Status: ${isEquipped}\n\n`;
		}

		let invEmbed = {
			title: `⚔️ ${p.getName()}'s Weapon Inventory`,
			description: description,
			color: 0x3498DB,
			footer: { text: `Delta RPG System • Total Weapons: ${weaponsList.length}` },
			timestamp: new Date()
		};
		p.send({ embed: invEmbed });
	},
});