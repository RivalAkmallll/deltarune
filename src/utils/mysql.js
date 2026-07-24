const mysql = require('mysql2');

const config = {
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASS,
    database: process.env.MYSQL_DATABASE || 'defaultdb',
    port: process.env.MYSQL_PORT || 11307,
    supportBigNumbers: true,
    multipleStatements: true,
    charset: 'utf8mb4',
    connectionLimit: 10,
    ssl: {
        rejectUnauthorized: false
    },
    connectTimeout: 30000
};

const pool = mysql.createPool(config);

exports.con = pool;
exports.mysql = mysql;