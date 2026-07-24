const mysql = require('mysql2');

const pool = mysql.createPool({
    connectionLimit: 10,
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASS,
    database: process.env.MYSQL_DATABASE || 'defaultdb',
    port: process.env.MYSQL_PORT || 11307,
    supportBigNumbers: true,
    multipleStatements: true,
    charset: 'utf8mb4',
    ssl: {
        rejectUnauthorized: false
    },
    connectTimeout: 30000
});

exports.query = function (sql, values) {
    return new Promise((resolve, reject) => {
        pool.getConnection((err, connection) => {
            if (err) {
                return reject(err);
            }
            connection.query(sql, values, (error, results) => {
                connection.release();
                if (error) {
                    return reject(error);
                }
                resolve(results);
            });
        });
    });
};

exports.pool = pool;