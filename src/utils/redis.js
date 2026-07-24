const redis = require('redis');

const client = redis.createClient({
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT || 11308,
    password: process.env.REDIS_PASS,
    tls: {
        rejectUnauthorized: false,
        servername: process.env.REDIS_HOST
    },
    keep_alive: true,
    socket_keepalive: true,
    no_ready_check: true,
    retry_strategy: function (options) {
        if (options.error && options.error.code === 'ECONNREFUSED') {
            return new Error('The server refused the connection');
        }
        if (options.total_retry_time > 1000 * 60 * 60) {
            return new Error('Retry time exhausted');
        }
        if (options.attempt > 10) {
            return undefined;
        }
        return Math.min(options.attempt * 100, 3000);
    }
});

client.on('error', (err) => {});

module.exports = client;