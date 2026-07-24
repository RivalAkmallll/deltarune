const requireDir = require('require-dir');
const dir = requireDir('./commandList', { recurse: true });

const CommandInterface = require('./CommandInterface.js');

const commands = {};
const adminCommands = {};

const aliasToCommand = {};
const mcommands = {};
const commandGroups = {};

class Command {
    constructor(main) {
        this.main = main;
        this.prefix = main.prefix;
        initCommands();
        this.commands = commands;
        this.adminCommands = adminCommands;
        this.aliasToCommand = aliasToCommand;
    }

    async execute(msg, raw) {
        let parsed = await checkPrefix(this.main, msg);
        let { args, context } = parsed || {};

        if (!args || args.length === 0) return;

        let rawCmd = args.shift().toLowerCase();
        let targetCommand = aliasToCommand[rawCmd] || rawCmd;

        if (adminCommands[targetCommand] || adminCommands[rawCmd]) {
            let adminExecuted = await this.executeAdmin(msg, raw, targetCommand, args, context);
            if (!adminExecuted) {
                console.warn(`[ADMIN ACCESS DENIED] ${msg.author.username} tried using admin command: "${rawCmd}"`);
            }
            return;
        }

        if (commands[targetCommand] || commands[rawCmd]) {
            let param = initParam(msg, targetCommand, args, this.main, context);
            await executeCommand(this.main, param);
            return;
        }
    }

    async executeAdmin(msg, raw, command, args, context) {
        if (!msg.content || !this.prefix) return false;

        let targetCmdKey = aliasToCommand[command] || command;
        let commandObj = adminCommands[targetCmdKey] || adminCommands[command];

        if (!commandObj) return false;

        let param = initParam(msg, targetCmdKey, args, this.main, context);

        const userId = msg.author.id;
        const ownerId = this.main.config?.owner;
        const adminList = this.main.config?.role?.admin || [];

        const isOwner = userId === ownerId;
        const isAdminId = Array.isArray(adminList) && adminList.includes(userId);

        if (isOwner || isAdminId || msg.member?.permission?.has('administrator')) {
            await commandObj.execute(param);
            return true;
        }

        return false;
    }
}

async function executeCommand(main, p) {
    let cmdToRun = commands[p.command] || commands[p.commandAlias];
    if (cmdToRun && typeof cmdToRun.execute === 'function') {
        await cmdToRun.execute(p);
    }
}

function initCommands() {
    let addAdminCommand = function (command) {
        let alias = command.alias;
        if (alias && alias.length > 0) {
            let mainName = alias[0].toLowerCase();
            for (let i = 0; i < alias.length; i++) {
                let currentAlias = alias[i].toLowerCase();
                adminCommands[currentAlias] = command;
                aliasToCommand[currentAlias] = mainName;
            }
        }
    };

    let addCommand = function (command) {
        let alias = command.alias;
        if (!alias) return;
        let name = alias[0].toLowerCase();
        for (let i = 0; i < alias.length; i++) {
            let currentAlias = alias[i].toLowerCase();
            commands[currentAlias] = command;
            aliasToCommand[currentAlias] = name;
        }
    };

    function parseDir(directory, isFolderAdmin = false) {
        for (let key in directory) {
            let item = directory[key];
            let currentFolderIsAdmin = isFolderAdmin || key.toLowerCase() === 'admin';

            if (item instanceof CommandInterface) {
                if (currentFolderIsAdmin || item.owner || item.admin) {
                    addAdminCommand(item);
                } else {
                    addCommand(item);
                }
            } else if (Array.isArray(item)) {
                item.forEach((val) => {
                    if (val instanceof CommandInterface) {
                        if (currentFolderIsAdmin || val.owner || val.admin) {
                            addAdminCommand(val);
                        } else {
                            addCommand(val);
                        }
                    }
                });
            } else if (typeof item === 'object' && item !== null) {
                parseDir(item, currentFolderIsAdmin);
            }
        }
    }

    parseDir(dir);
}

function initParam(msg, command, args, main, context) {
    const adminList = main.config?.role?.admin || [];
    const isOwner = main.config?.owner === msg.author?.id;
    const isAdmin = Array.isArray(adminList) && adminList.includes(msg.author?.id);

    let param = {
        msg: msg,
        options: msg.options || {},
        args: args,
        context: context,
        command: command,
        client: main.bot,
        mysql: main.mysql,
        con: main.mysql?.con,
        query: main.query,
        send: main.sender?.send(msg),
        replyMsg: main.sender?.reply(msg),
        sender: main.sender,
        global: main.global,
        aliasToCommand: aliasToCommand,
        commandAlias: aliasToCommand[command] || command,
        commands: commands,
        adminCommands: adminCommands,
        config: main.config,
        main: main,
        fetch: main.fetch,
        isOwner: isOwner,
        isAdmin: isAdmin || isOwner,
    };

    param.getName = () => {
        return param.global?.getName ? param.global.getName(msg.member || msg.author) : msg.author?.username;
    };

    return param;
}

async function checkPrefix(main, msg) {
    if (!msg || !msg.content) return {};
    const content = msg.content.toLowerCase();
    const mainPrefix = (main.prefix || '').toLowerCase();

    if (mainPrefix && content.startsWith(mainPrefix)) {
        let args = msg.content.slice(main.prefix.length).trim().split(/ +/g);
        let context = content.trim().replace(mainPrefix, '').trim().replace(/^\S+/i, '').trim();
        return { args, context };
    }
}

module.exports = Command;