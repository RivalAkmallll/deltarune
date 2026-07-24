const global = require('./global.js');

const timerEmoji = '⏱';
const cooldown = {};
const lock = {};
const ignore = { '184587051943985152': true };
let macro;

exports.check = async function (p, command) {
    if (!p || !p.msg || !p.msg.author) return true;

    let key = 'cd_' + command + '_' + p.msg.author.id;

    if (ignore[p.msg.author.id]) {
        return true;
    }

    // On cooldown
    if (cooldown[key] && !p.msg.interaction) return false;

    // Parse variables
    let { redis, mcommands } = p;
    let now, diff;

    // lock key
    if (lock[key]) return false;
    else lock[key] = true;

    try {
        // Fetch last used time
        let ccd = await redis.hgetall(key);
        if (!ccd) ccd = { command: command, lasttime: new Date('January 1,2018') };

        // Safe check for mcommands & cd
        const targetCmd = ccd.command || command;
        const cmdConfig = mcommands && mcommands[targetCmd];
        const commandCooldown = (cmdConfig && cmdConfig.cd) ? cmdConfig.cd : 0;

        // Calculate time difference
        now = new Date();
        ccd.lasttime = new Date(ccd.lasttime);
        diff = now - ccd.lasttime;

        // Still in cooldown
        if (commandCooldown > 0 && diff < commandCooldown) {
            if (command == 'points') {
                if (diff > -600000) {
                    ccd.lasttime = new Date(ccd.lasttime.getTime() + 8000);
                    await redis.hmset(key, ccd);
                    await redis.expire(key, 86400);
                }
                now = false;
            } else {
                let { timerText, time } = parseTimer(commandCooldown - diff);
                await p.replyMsg(
                    timerEmoji,
                    `! Slow down and try the command again **${timerText}**`,
                    time,
                    null,
                    { ephemeral: true }
                );
                cooldown[key] = true;
                setTimeout(() => {
                    delete cooldown[key];
                }, time);
                now = false;
            }
        } else {
            ccd.lasttime = now;
            await redis.hmset(key, ccd);
            await redis.expire(key, 86400);
        }
    } catch (e) {
        console.error('cooldown.js check command');
        console.error(e);
        return true;
    } finally {
        // Unlock the semaphore
        delete lock[key];
    }

    // Check for macro/botting safely
    if (now) {
        let valid = true;
        if (macro && typeof macro.check === 'function') {
            valid = !!(await macro.check(p, command, { diff, now }));
        }

        if (!valid && command == 'points') {
            await setCooldown(p, command, 600);
        } else if (!valid) {
            await setCooldown(p, command, 10);
        }
        return valid;
    }

    return false;
};

// Parse cooldown left
function parseTimer(diff) {
    let time = diff;
    if (time < 1000) time = 1000;

    const timerText = global.toDiscordTimestamp ? global.toDiscordTimestamp(Date.now() + diff) : `<t:${Math.floor((Date.now() + diff) / 1000)}:R>`;

    return { timerText, time };
}

const setCooldown = (exports.setCooldown = async function (p, command, cooldown = 0) {
    let key = 'cd_' + command + '_' + p.msg.author.id;
    let commandCooldown = (p.commands && p.commands[p.commandAlias] && p.commands[p.commandAlias].cooldown) || 0;

    let past = new Date(Date.now() + cooldown * 1000 - commandCooldown);
    await p.redis.hmset(key, { lasttime: past });
    await p.redis.expire(key, 86400);
});

exports.setMacro = function (m) {
    macro = m;
};