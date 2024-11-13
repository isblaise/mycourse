const mysql = require('mysql2');
const con =mysql.createConnection({
    host:'localhost',user:'root', password:'',database: 'mycourse_bd'
});

con.connect((err)=>{
    if(err){
        console.error(err.stack)
    }
    console.log("Connecter")
});

module.exports = con;