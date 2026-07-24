class BaseCommand {
    constructor(bot, config) {
        this.bot = bot;
        this.name = config.name;
        this.inputs = config.inputs;
        this.category = config.category;
        this.help = config.help;
        this.query = config.query;
    }
}

class Define extends BaseCommand {
    constructor(bot) {
        super(bot, {
            name: 'define',
            inputs: ['define', 'ud', 'urban'],
            category: 'social',
            help: 'Displays word definitions from Urban Dictionary',
            query: true
        });
    }

    async execute(msg, args) {
        return this.bot.sender.send(
            msg.channel,
            'The Urban Dictionary feature is currently disabled.'
        );
    }
}

module.exports = Define;