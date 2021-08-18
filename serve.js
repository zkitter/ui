var express = require('express');
var https = require('https');

var fs = require('fs');
var app = express();
var app2 = express();

app.use(express.static('/build'));
app2.use(express.static('/build'));

var options = {
    key: fs.readFileSync('./privatekey.pem'),
    cert: fs.readFileSync('./server.crt')
};

const server = https.createServer(options, app);
server.listen(443);
app2.listen(80);
