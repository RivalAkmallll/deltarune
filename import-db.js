const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: './secret/env' });

async function importSQL() {
    console.log('Connecting to Aiven MySQL...');
    const connection = await mysql.createConnection({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASS,
        database: process.env.MYSQL_DATABASE || 'defaultdb',
        port: process.env.MYSQL_PORT || 11307,
        ssl: { rejectUnauthorized: false }
    });

    console.log('Connected! Importing tables...');

    try {
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');
        await connection.query('SET UNIQUE_CHECKS = 0');

        async function runSqlFile(filePath) {
            if (!fs.existsSync(filePath)) {
                console.log(`❌ File not found: ${filePath}`);
                return;
            }

            const sqlContent = fs.readFileSync(filePath, 'utf8');
            const statements = sqlContent
                .split(/;\s*$/m)
                .map((stmt) => stmt.trim())
                .filter((stmt) => stmt.length > 0);

            for (const statement of statements) {
                try {
                    await connection.query(statement);
                } catch (err) {
                    if (err.code !== 'ER_TABLE_EXISTS_ERROR') {
                        console.warn(`⚠️ Warning on statement: ${err.message}`);
                    }
                }
            }
        }

        const createTablesPath = path.join(__dirname, 'secret', 'CREATE-OWO-TABLES.sql');
        console.log('Executing CREATE-OWO-TABLES.sql...');
        await runSqlFile(createTablesPath);
        console.log('✅ CREATE-OWO-TABLES.sql successfully imported!');

        const tableDataPath = path.join(__dirname, 'secret', 'OWO-TABLE-DATA.sql');
        console.log('Executing OWO-TABLE-DATA.sql...');
        await runSqlFile(tableDataPath);
        console.log('✅ OWO-TABLE-DATA.sql successfully imported!');

        await connection.query('SET FOREIGN_KEY_CHECKS = 1');
        await connection.query('SET UNIQUE_CHECKS = 1');

        console.log('🎉 Done! All database tables are ready.');
    } catch (err) {
        console.error('Import Error:', err);
    } finally {
        await connection.end();
    }
}

importSQL().catch((err) => {
    console.error('Import failed:', err.message);
});