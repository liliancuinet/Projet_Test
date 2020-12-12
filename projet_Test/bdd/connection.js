var mysql = require('mysql');
var connection = mysql.createConnection({
    host:'localhost',
	user:'root',
	password:'',
	database:'projet_test'
});
connection.connect();

module.exports = connection;