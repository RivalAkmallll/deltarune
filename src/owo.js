const Base = require('eris-sharder').Base;
const EventHandler = require('./eventHandlers/EventHandler.js');

const DBL = require('dblapi.js');
const dbl = new DBL(process.env.DBL_TOKEN || 'dummy_token');

class OwO extends Base {
    constructor(bot) {
        super(bot);
        this.dbl = dbl;

        console.log('\n[LOG 1/6] [INIT] Initializing OwO Base Class...');

        this.mysql = require('./utils/mysql.js');
        this.redis = require('./utils/redis.js');
        this.neo4j = require('./utils/neo4j.js');
        this.pubsub = new (require('./utils/pubsub.js'))(this);

        this.interactionHandlers = new (require('./interactionHandlers'))(this);
        this.PagedMessage = require('./utils/PagedMessage.js');
        this.logger = require('./utils/logger.js');

        this.config = require('./data/config.json');
        this.debug = this.config.debug;
        this.prefix = this.config.prefix;
        console.log(`[LOG 2/6] [CONFIG] Active Prefix: "${this.prefix}" | Debug Mode: ${this.debug}`);

        this.optOut = {};
        this.setOptOut();

        this.ban = require('./utils/ban.js');
        this.cooldown = require('./utils/cooldown.js');

        this.questHandler = new (require('./botHandlers/questHandler.js'))();

        this.mysqlhandler = require('./botHandlers/mysqlHandler.js');
        this.query = this.mysqlhandler.query;

        this.cache = require('./utils/cacheUtil.js');

        this.global = require('./utils/global.js');
        this.global.init(this);

        this.animalUtil = require('./utils/animalInfoUtil.js');
        this.animalUtil.setBot(this);

        this.rewardUtil = require('./utils/rewardUtil.js');

        this.event = require('./utils/eventUtil.js');
        this.event.init(this);

        this.sender = require('./utils/sender.js');
        this.sender.init(this);

        this.dateUtil = require('./utils/dateUtil.js');

        try {
            this.macro = require('./../../tokens/macro.js');
        } catch (err) {
            this.macro = require('../secret/macro.js');
        }
        if (this.macro && typeof this.macro.bind === 'function') {
            this.macro.bind(this, require('merge-images'), require('@napi-rs/canvas'));
        }
        if (this.cooldown && typeof this.cooldown.setMacro === 'function') {
            this.cooldown.setMacro(this.macro);
        }

        this.fetch = new (require('./utils/fetch.js'))(this);
        this.reactionCollector = new (require('./utils/reactionCollector.js'))(this);
        this.interactionCollector = new (require('./utils/interactionCollector.js'))(this);

        this.DataResolver = require('./utils/dataResolver.js');
        this.EmojiAdder = require('./utils/EmojiAdder.js');

        this.patreon = require('./utils/patreon.js');
        this.patreon.init(this);

        this.patreonUtil = require('./commands/commandList/patreon/utils/patreonUtil.js');

        try {
            this.badwords = require('./../../tokens/badwords.json');
        } catch (err) {
            this.badwords = require('../secret/badwords.json');
        }

        this.giveaway = require('./utils/giveaway.js');
        this.giveaway.checkGiveawayTimeout(this);

        console.log('[LOG 3/6] [INIT] Loading Command Modules...');
        this.command = new (require('./commands/command.js'))(this);
    }

    launch() {
        console.log('[LOG 4/6] [LAUNCH] Method launch() invoked successfully!');

        if (this.bot) {
            this.bot.on('messageCreate', async (msg) => {
                if (msg.author.bot) return;

                // 1. Status & OptOut Checks (Silent return before any heavier checks/logs)
                if (this.pause || this.optOut[msg.author.id]) return;

                // 2. Prefix & Keyword Validation
                const content = msg.content.toLowerCase().trim();
                const currentPrefix = (this.prefix || '').toLowerCase().trim();

                const startsWithPrefix = currentPrefix !== '' && content.startsWith(currentPrefix);
                const containsOwo = content.includes('owo') || content.includes('uwu');

                if (!startsWithPrefix && !containsOwo) return;

                // 3. Command Resolution
                const args = content.slice(startsWithPrefix ? currentPrefix.length : 0).trim().split(/ +/);
                const rawCmd = args.shift() || '';
                const resolvedCmdName = this.command.aliasToCommand ? this.command.aliasToCommand[rawCmd] : rawCmd;
                const cmdObj = this.command.commands ? this.command.commands[resolvedCmdName] : null;

                // If it starts with the prefix but isn't a registered command and doesn't contain owo/uwu keywords, stop here
                if (!cmdObj && startsWithPrefix && !containsOwo) return;

                const ownerId = this.config.owner;
                const adminList = (this.config.role && this.config.role.admin) || [];
                const isOwner = msg.author.id === ownerId;
                const isAdmin = isOwner || adminList.includes(msg.author.id);

                if (cmdObj) {
                    if (cmdObj.owner && !isOwner) return;
                    if (cmdObj.admin && !isAdmin) return;
                } else if (!containsOwo) {
                    return;
                }

                // --- ONLY LOG IF IT IS A VALID TRIGGERED COMMAND BEYOND THIS POINT ---
                console.log('\n--------------------------------------------------');
                console.log(`[TRACE 1/7] Incoming Discord Message: "${msg.content}"`);
                console.log(`[TRACE 1/7]   Author: ${msg.author.username} (ID: ${msg.author.id})`);
                console.log(`[TRACE 1/7]   Guild: ${msg.channel.guild ? msg.channel.guild.name : 'DM'} | Channel ID: ${msg.channel.id}`);
                console.log(`[TRACE 2/7] Checking Prefix: Content="${content}" | Configured Prefix="${currentPrefix}"`);
                console.log(`[TRACE 3/7] Command Resolution: Key="${rawCmd}" -> Registered="${resolvedCmdName || 'None'}"`);
                console.log(`[TRACE 3/7] Permissions Check: User ID=${msg.author.id} | IsOwner=${isOwner} | IsAdmin=${isAdmin}`);

                // 4. Message Interceptor (Hook createMessage to detect response delivery)
                console.log('[TRACE 4/7] Invoking this.command.execute()...');
                let messageSent = false;
                const originalCreateMessage = msg.channel.createMessage;

                msg.channel.createMessage = async function (...payload) {
                    messageSent = true;
                    console.log(`[TRACE 6/7 SUCCESS] Bot successfully sent response to Channel ${msg.channel.id}!`);
                    return await originalCreateMessage.apply(this, payload);
                };

                // 5. Command Execution
                try {
                    await this.command.execute(msg);
                    console.log('[TRACE 5/7] this.command.execute() completed execution.');

                    // Restore original createMessage method
                    msg.channel.createMessage = originalCreateMessage;

                    // 6. Response Verification Check
                    if (!messageSent) {
                        console.warn(
                            `[TRACE 7/7 WARNING] Command "${resolvedCmdName || rawCmd}" finished running, BUT NO RESPONSE WAS SENT to Discord!\n` +
                            `                   Possible reasons: Database Query Error, Unhandled Async Return, Cooldown silently blocking, or Missing User Data.`
                        );
                    }
                } catch (err) {
                    msg.channel.createMessage = originalCreateMessage;
                    console.error(`[TRACE X CRITICAL ERROR] Uncaught exception inside command.execute():`, err);
                }
            });
        }

        this.eventHandler = new EventHandler(this);
        this.InfoUpdater = new (require('./utils/InfoUpdater.js'))(this);
        console.log('[LOG 5/6] [LAUNCH] EventHandler & InfoUpdater bound successfully.\n');
    }

    async setOptOut() {
        try {
            const ids = await this.redis.hgetall('optOut');
            for (let id in ids) {
                this.optOut[id] = true;
            }
            console.log('[LOG 6/6] [REDIS] OptOut list loaded successfully.');
        } catch (err) {
            console.error('[LOG 6/6] [REDIS ERROR] Failed to load OptOut list from Redis:', err.message);
        }
    }
}

module.exports = OwO;