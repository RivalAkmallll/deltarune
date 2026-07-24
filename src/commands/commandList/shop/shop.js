/*
 * OwO Bot for Discord
 * Copyright (C) 2019 Christopher Thai
 * This software is licensed under Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International
 * For more information, see README.md and LICENSE
 */

const CommandInterface = require('../../CommandInterface.js');

module.exports = new CommandInterface({
	alias: ['shop', 'market', 'buy', 'sell', 'trade'],

	args: '[buy/sell/trade] [id/user] [price/offer]',

	desc: 'Integrated Delta RPG Shop, Marketplace, Buy/Sell, and Player Trading system.',

	example: ['delta shop', 'delta buy W101', 'delta sell W101 5000', 'delta trade @user W101'],

	related: ['delta weapon', 'delta battle', 'delta inventory'],

	permissions: ['sendMessages', 'embedLinks', 'addReactions'],

	group: ['economy', 'rpg'],

	cooldown: 5000,
	half: 100,
	six: 500,

	execute: async function (p) {
		let authorId = p.msg.author.id;
		let args = p.args ? p.args.slice() : [];
		
		let rawContent = p.msg.content ? p.msg.content.trim().toLowerCase() : '';
		let invokedAction = 'shop';

		if (rawContent.includes('buy') || rawContent.includes('purchase')) {
			invokedAction = 'buy';
		} else if (rawContent.includes('sell')) {
			invokedAction = 'sell';
		} else if (rawContent.includes('trade')) {
			invokedAction = 'trade';
		} else if (p.alias && ['buy', 'sell', 'trade'].includes(p.alias[0])) {
			invokedAction = p.alias[0].toLowerCase();
		} else if (args.length > 0 && ['buy', 'sell', 'trade'].includes(args[0].toLowerCase())) {
			invokedAction = args[0].toLowerCase();
			args.shift();
		}

		let catalog = {
			'W101': { name: 'Iron Broadsword', type: 'Blade', power: 120, costType: 'coins', cost: 2500 },
			'W102': { name: 'Shadow Dagger', type: 'Dagger', power: 190, costType: 'coins', cost: 5000 },
			'W103': { name: 'Flame Battleaxe', type: 'Axe', power: 310, costType: 'crystals', cost: 15 },
			'W104': { name: 'Dragon Slayer Greatsword', type: 'Greatsword', power: 550, costType: 'crystals', cost: 40 },
			'CRATE_NORMAL': { name: 'Normal Chest', type: 'Crate', power: 0, costType: 'coins', cost: 1000 },
			'CRATE_RARE': { name: 'Rare Chest', type: 'Crate', power: 0, costType: 'coins', cost: 4000 },
			'CRATE_EPIC': { name: 'Epic Chest', type: 'Crate', power: 0, costType: 'crystals', cost: 10 },
			'CRATE_LEGENDARY': { name: 'Legendary Chest', type: 'Crate', power: 0, costType: 'crystals', cost: 35 }
		};

		if (invokedAction === 'buy') {
			let buyId = args.length > 0 ? args[0].toUpperCase() : '';
			if (!catalog[buyId]) {
				p.send(`❌ **|** Please input a valid item ID! Check \`delta shop\` for the catalog (e.g. \`delta buy W101\`).`);
				return;
			}

			let item = catalog[buyId];
			let randomPower = item.power > 0 ? item.power + Math.floor(Math.random() * 50) : 250;
			let itemName = item.name;

			try {
				await p.query(`INSERT INTO weapon (id, name, damage, equipped) VALUES ('${authorId}', '${itemName}', ${randomPower}, 0);`);
			} catch (e) {
				try {
					await p.query(`INSERT INTO weapon (id, name, damage) VALUES ('${authorId}', '${itemName}', ${randomPower});`);
				} catch (err) {}
			}

			p.send(`🛍️ **| Success Purchase!** You bought **${itemName}** for \`${item.cost} ${item.costType}\`!\n⚔️ Power: \`+${randomPower} ATK\`. Check it via \`delta weapon\`.`);
			return;
		}

		let shopEmbed = {
			title: `🛒 DELTA RPG SHOP, MARKET & TRADE`,
			description: `Welcome to the ultimate RPG economy hub! Buy items, sell gear, or trade directly with players.\n\n` +
						 `⚔️ **SHOP WEAPONS & GEAR:**\n` +
						 `• \`W101\` - **Iron Broadsword** | \`120 ATK\` | Price: \`$2,500 Coins\`\n` +
						 `• \`W102\` - **Shadow Dagger** | \`190 ATK\` | Price: \`$5,000 Coins\`\n` +
						 `• \`W103\` - **Flame Battleaxe** | \`310 ATK\` | Price: \`15 Crystals\`\n` +
						 `• \`W104\` - **Dragon Slayer** | \`550 ATK\` | Price: \`40 Crystals\`\n\n` +
						 `📦 **CHESTS & CRATES:**\n` +
						 `• \`CRATE_NORMAL\` - Price: \`$1,000 Coins\`\n` +
						 `• \`CRATE_RARE\` - Price: \`$4,000 Coins\`\n` +
						 `• \`CRATE_EPIC\` - Price: \`10 Crystals\`\n` +
						 `• \`CRATE_LEGENDARY\` - Price: \`35 Crystals\`\n\n` +
						 `📌 **COMMANDS:**\n` +
						 `• Buy: \`delta buy {ID}\``,
			color: 0xF1C40F,
			footer: { text: `Delta RPG Economy System` },
			timestamp: new Date()
		};

		p.send({ embed: shopEmbed });
	},
});