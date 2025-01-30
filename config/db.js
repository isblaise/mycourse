const mysql = require('mysql2');


const pool = mysql.createPool({
    host: 'localhost',         
    user: 'root',              
    password: '',              
    database: 'mycourse_bd',   
    waitForConnections: true, 
    connectionLimit: 10,       
    queueLimit: 0            
});


const promisePool = pool.promise();


pool.on('acquire', (connection) => {
    console.log(`Connexion acquise : ID ${connection.threadId}`);
});

pool.on('release', (connection) => {
    console.log(`Connexion libérée : ID ${connection.threadId}`);
});

pool.on('enqueue', () => {
    console.warn('Toutes les connexions sont utilisées, une requête est en attente...');
});


(async () => {
    try {
        console.log('Test de connexion initial...');
        const connection = await promisePool.getConnection();
        console.log('Connexion réussie :', connection.threadId);
        connection.release(); 
    } catch (err) {
        console.error('Erreur lors de la connexion initiale :', err.message);
    }
})();

module.exports = promisePool;
