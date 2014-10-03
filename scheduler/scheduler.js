var http      = require('http')
  , socketio  = require('socket.io')
  , express   = require('express')
  , ntp       = require('./ntpserver.js');

//var UAParser = require('ua-parser-js');

var app    = express()
  , server = http.createServer(app)
  , io     = socketio.listen(server);
io.set('log level', 1); // reduce logging
app.use('/', express.static('static/')); 
io.sockets.on('connection', ntp.sync);

server.listen(80);
console.log ("Starting on Port 80");

	
//var parser = new UAParser();
//var ua = request.headers['user-agent'];     // user-agent header from an HTTP request
//console.log(parser.setUA(ua).getResult());