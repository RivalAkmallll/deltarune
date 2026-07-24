/*
 * OwO Bot for Discord
 * Copyright (C) 2019 Christopher Thai
 * This software is licensed under Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International
 * For more information, see README.md and LICENSE
 */

const CommandInterface = require('../../CommandInterface.js');

module.exports = new CommandInterface({
	alias: ['inventory', 'inv', 'backpack', 'bag'],

	args: '',

	desc: 'Display your complete adventure backpack, equipped power status, and item contents.',

	example: ['delta inventory', 'delta inv'],

	related: ['delta weapon', 'delta shop', 'delta battle'],

	permissions: ['sendMessages', 'embedLinks', 'addReactions'],

	group: ['economy', 'rpg'],

	cooldown: 5000,
	half: 100,
	six: 500,

	execute: async function (p) {
		let authorId = p.msg.author.id;

		let itemsList = [];
		let equippedPower = 0;

		try {
			// Ambil seluruh item/senjata player dari database
			let query = `SELECT * FROM weapon WHERE id = '${authorId}';`;
			itemsList = await p.query(query);

			// Hitung total power dari senjata yang sedang di-equip
			if (itemsList && itemsList.length > 0) {
				for (let item of itemsList) {
					if (item.equipped === 1) {
						equippedPower += (item.damage || item.power || 0);
					}
				}
			}
		} catch (e) {}

		let totalUnique = itemsList ? itemsList.length : 0;

		if (totalUnique === 0) {
			let emptyInvEmbed = {
				title: `🎒 ${p.getName()}'s Adventure Backpack & Inventory`,
				description: `**Adventurer:** @${p.getName()}\n` +
				             `Here is your complete collection. Remember, items in your bag don't grant power until you equip them!\n\n` +
				             `⚡ **Adventurer Equipped Power Status**\n` +
				             `• **Equipped Power:** \`0\` (Only counts active/equipped gear)\n` +
				             `• **Total Unique Items:** \`0\`\n` +
				             `• **Total Item Quantity:** \`0\`\n\n` +
				             `📦 **Backpack Contents (Weapons, Armor, Lootboxes & Pet Food)**\n` +
				             `🎁 *Your backpack is currently empty. Go hunt, open boxes, or collect items via delta shop!*`,
				color: 0xE67E22,
				footer: { text: `Delta RPG Inventory System` },
				timestamp: new Date()
			};
			p.send({ embed: emptyInvEmbed });
			return;
		}

		let contentsDesc = ``;
		for (let i = 0; i < itemsList.length; i++) {
			let item = itemsList[i];
			let itemId = item.uwid || item.id || `W${1001 + i}`;
			let itemName = item.name || `Unknown Item`;
			let itemPower = item.damage || item.power || 50;
			let statusBadge = item.equipped === 1 ? '🟢 **[Equipped]**' : '⚪ **[In Bag]**';

			contentsDesc += `**[${i + 1}]** \`${itemId}\` - **${itemName}** (\`+${itemPower} ATK\`) ${statusBadge}\n`;
		}

		let invEmbed = {
			title: `🎒 ${p.getName()}'s Adventure Backpack & Inventory`,
			description: `**Adventurer:** @${p.getName()}\n` +
			             `Here is your complete collection. Remember, items in your bag don't grant power until you equip them!\n\n` +
			             `⚡ **Adventurer Equipped Power Status**\n` +
			             `• **Equipped Power:** \`${equippedPower} ATK\` (Only counts active/equipped gear)\n` +
			             `• **Total Unique Items:** \`${totalUnique}\`\n` +
			             `• **Total Item Quantity:** \`${totalUnique}\`\n\n` +
			             `📦 **Backpack Contents (Weapons, Armor, Lootboxes & Pet Food)**\n` +
			             contentsDesc + `\n*Tip: Use \`delta weapon equip {id}\` to equip your gear for battles!*`,
			color: 0xE67E22,
			footer: { text: `Delta RPG Inventory System` },
			timestamp: new Date()
		};

		p.send({ embed: invEmbed });
	},
});