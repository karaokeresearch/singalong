var http      = require('http')
  , socketio  = require('socket.io')
  , express   = require('express')
  , ntp       = require('./ntpserver.js')
  , UAParser  = require('ua-parser-js')
	,	Datastore = require('nedb')
	, Levenshtein = require('levenshtein');
		
var parser = new UAParser();

var app    = express()
  , server = http.createServer(app)
  , io     = socketio.listen(server);
io.set('log level', 1); // reduce logging

app.use('/ua/', function(req, res, next){
  var ua = req.headers['user-agent'];
  var phone= parser.setUA(ua).getResult();
  var tosend='';
	findClosestModel(phone, function(callback){
		tosend +=("closest phone match is " +callback);
		findClosestBrowser(phone.browser.version, phone, callback, function(callback){
		res.send(tosend + "<br>lag be: " +callback);
		res.end;
		});
	});
  //we could also just be sent the ua from the client property "navigator.userAgent"
});

app.use('/', express.static('static/')); 
io.sockets.on('connection', ntp.sync);

server.listen(80);
console.log ("Starting on Port 80");


var db = new Datastore({ filename: './useragents.nedb', autoload: true });
	

var phonetest = { 
  "ua": "Mozilla/5.0 (Windows NT 5.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/37.0.2062.124 Safari/537.36",
  "browser": {
    "name": "Chrome",
    "version": "24.2.2.1",
    "major": "37"
  },
  "engine": {
    "name": "WebKit",
    "version": "537.36"
  },                                                                                                           
  "os": {                                                                                                        
    "name": "Android",                                                                                           
    "version": "4.0"                                                                                              
  },                                                                                                             
  "device": {
  	"model": "FOOBLAT90210",
  	"vendor": "Samsung",
  	"type": "mobile"
  	},                                                                                                  
  "cpu": {}                                                                                                                                                                                                                    
                                                                                                                
};


var findClosestModel = function(whichPhone, callback){
		db.find({"device.model": whichPhone.device.model}, function (err, docs) { 
			if (docs.length >0){
			callback(whichPhone.os.model);
		 }else{
			db.find({"device.vendor": whichPhone.device.vendor}, function (err, docs) { 
			var lowestOne=Infinity;
			var bestModel;
			for (j=0; j<docs.length; j++){
				if (new Levenshtein(docs[j].device.model,whichPhone.device.model) <lowestOne){
					lowestOne=new Levenshtein(docs[j].device.model,whichPhone.device.model);
					bestModel=docs[j].device.model;
					}
		}
			callback(bestModel);      
			});
	  }
	});
};



function sortByKey(array, key) {
    return array.sort(function(a, b) {
        var x = a[key]; var y = b[key];
        return ((x < y) ? -1 : ((x > y) ? 1 : 0));
    });
}


var findClosestBrowser = function(version, whichPhone, whichModel, callback, refinement){
	var versionRegEx=new RegExp("^" + version.replace(/\./g, "\\\."));
	if (whichModel) {
		var queryLiteral = [{ "os.name": whichPhone.os.name}, { "device.model": whichModel },{"device.vendor": whichPhone.device.vendor}, { "browser.name": whichPhone.browser.name}, { "browser.version": versionRegEx}];
	}else{
		var queryLiteral = [{ "os.name": whichPhone.os.name}, { "browser.name": whichPhone.browser.name}, { "browser.version": versionRegEx}];	
	}
	db.find({ $and: queryLiteral }, function (err, docs) {
		//console.log(docs);
      
		if (docs.length){//we found one or more candidates
			//console.log("refinement is " + refinement);
			
			for (var i = 0; i < docs.length; i++) { 
				docs[i].diff = Math.abs((refinement||0)- ((docs[i].browser.version.split(".")[String(refinement).split(".").length-1])||0));
			}
			docs=sortByKey(docs, "diff"); //determine the closest version match.
        
        var selectedDocs=[];
        var i=0;
	      var lag=0;
				for (i = 0; i < docs.length; i++) { //if multiple perfect matches, average lag
					console.log("diff: " +docs[i].diff + ", lag: " + docs[i].lag + ", globalLag: " +lag) ;
					selectedDocs.unshift(docs[i]);
					lag+=parseInt(docs[i].lag);
					if (docs[i+1].diff !==docs[0].diff){
						break;
					}
				}
			
			lag/=i+1; //average
			callback(lag);
		}else{
			var previousVersion=version;
			version= version.replace(/(\.|^)\w+$/,"");
			if (version===previousVersion){
				//console.log("not found")
			}else{
				//console.log("replacing");
				refinement = parseInt(previousVersion.replace(/.*\./,""));
				findClosestBrowser(version, whichPhone, whichModel, callback, refinement);
			}
		}
	
});
}


//findClosestModel(phone, function(callback){
//	console.log ("closest phone match is " +callback);
//	findClosestBrowser(phone.browser.version, phone, callback, function(callback){
//		console.log (callback);
//	});
//	
//});
//               