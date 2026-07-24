/*
 * OwO Bot for Discord - Fixed InteractionCollector
 * Copyright (C) 2021 Christopher Thai
 */

const EventEmitter = require('eventemitter3');
const axios = require('axios');

function parseId(obj) {
    if (!obj) return '';
    if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'bigint') {
        return String(obj);
    }
    if (obj.id) return String(obj.id);
    if (obj.message && obj.message.id) return String(obj.message.id);
    if (obj.interaction && obj.interaction.id) return String(obj.interaction.id);
    if (obj.data && obj.data.id) return String(obj.data.id);
    return String(obj);
}

class InteractionCollector {
    constructor(main) {
        this.main = main;
        this.listeners = {};
    }

    create(msg, filter, opt = {}) {
        const msgId = parseId(msg);
        delete this.listeners[msgId];

        let iee = new InteractionEventEmitter(filter, opt);
        iee.on('end', () => delete this.listeners[msgId]);
        this.listeners[msgId] = iee;

        return iee;
    }

    interact({ user, member, message, data, id, token, entitlements }) {
        let rawUser = user || (member ? member.user : null) || member || {};
        let userId = String(rawUser.id || (member ? member.id || member.user?.id : '') || '');

        let clicker = { ...rawUser };
        clicker.id = userId;
        if (member) {
            clicker.member = member;
        }
        clicker.toString = () => userId;

        const msgId = parseId(message);
        const listener = this.listeners[msgId];

        if (listener) {
            listener.interact(data, clicker, id, token, entitlements);
        } else {
            const url = `https://discord.com/api/v8/interactions/${id}/${token}/callback`;
            const content = {
                content: '🚫 **|** You cannot use this button',
                flags: 64,
            };
            return axios.post(url, {
                type: 4,
                data: content,
            });
        }
    }
}

class InteractionEventEmitter extends EventEmitter {
    constructor(filter, { time = null, idle = null }) {
        super();
        this.filter = filter;
        this.ended = false;
        this.idleTimeout = idle;

        if (time) this.time = setTimeout(() => this.stop('time'), time);
        if (idle) this.idle = setTimeout(() => this.stop('idle'), idle);
    }

    checkFilter(componentName, user) {
        if (!this.filter) return true;
        try {
            const result = this.filter(componentName, user, user?.id);
            return result !== false;
        } catch (e) {
            console.error('[INTERACTION FILTER ERROR]', e);
            return true;
        }
    }

    interact(component, user, id, token, entitlements) {
        const customId = component ? (component.custom_id || component) : '';

        if (!this.checkFilter(customId, user)) {
            const url = `https://discord.com/api/v8/interactions/${id}/${token}/callback`;
            const content = {
                content: '🚫 **|** You cannot use this button',
                flags: 64,
            };
            return axios.post(url, {
                type: 4,
                data: content,
            });
        }

        if (this.ended) {
            const url = `https://discord.com/api/v8/interactions/${id}/${token}/callback`;
            const content = {
                content: '🚫 **|** This button is no longer active',
                flags: 64,
            };
            return axios.post(url, {
                type: 4,
                data: content,
            });
        }

        const url = `https://discord.com/api/v8/interactions/${id}/${token}/callback`;

        function ack(content) {
            if (content) {
                if (typeof content === 'string') {
                    content = { content };
                }
                const newContent = { ...content };
                if (newContent.embed) {
                    newContent.embeds = [newContent.embed];
                    delete newContent.embed;
                }
                return axios.post(url, {
                    type: 7,
                    data: newContent,
                });
            } else {
                return axios.post(url, { type: 1 });
            }
        }

        function err(content) {
            if (typeof content === 'string') {
                content = { content };
            }
            if (content.embed) {
                content.embeds = [content.embed];
                delete content.embed;
            }
            content.flags = 64;
            return axios.post(url, {
                type: 4,
                data: content,
            });
        }

        this.emit('collect', customId, user, ack, err, component?.values, entitlements);

        if (this.idleTimeout) {
            clearTimeout(this.idle);
            this.idle = setTimeout(() => this.stop('idle'), this.idleTimeout);
        }
    }

    stop(reason) {
        if (this.ended) return;
        this.ended = true;

        if (this.time) {
            clearTimeout(this.time);
            this.time = null;
        }

        if (this.idle) {
            clearTimeout(this.idle);
            this.idle = null;
        }

        this.emit('end', reason);
        this.removeAllListeners();
    }
}

module.exports = InteractionCollector;