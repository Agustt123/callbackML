// archivo: test-db-connection.js

const mysql = require('mysql2/promise');

const con = mysql.createPool({
    host: "149.56.182.49",
    port: 44353,
    user: "root",
    password: "4AVtLery67GFEd",
    database: "callback_incomesML",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});

async function testConnection() {
    try {
        const [rows] = await con.query('SELECT 1');
        console.log("✅ Conexión exitosa. Resultado:", rows);
    } catch (err) {
        console.error("❌ Error al conectar a la base de datos:", err.message);
    } finally {
        await con.end();
    }
}

testConnection();
