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
  res.send(parser.setUA(ua).getResult());
  res.end;
  //we could also just be sent the ua from the client property "navigator.userAgent"
});

app.use('/', express.static('static/')); 
io.sockets.on('connection', ntp.sync);

server.listen(80);
console.log ("Starting on Port 80");


var db = new Datastore({ filename: './useragents.nedb', autoload: true });
	

var phone = { 
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
  	"model": "Whizzhard Palace",
  	"vendor": "Samsung",
  	"type": "mobile"
  	},                                                                                                  
  "cpu": {}                                                                                                                                                                                                                    
                                                                                                                
};

//From most to least important:




//model, vendor, os.name, browser.name&&browser.version, os.version
//if model, (look through all results and look for the ones with the exact os.name/major.minor version){levenshtein browser + browser version.} else{ levenshtein browser + browser version on full data set}.
//if vendor, (look through all results and look for the ones with the exact os.name/major.minor version){levenshtein browser + browser version.} else{ levenshtein browser + browser version on full data set}.
//if os.name (look through all results and look for the ones with the exact os.name/major.minor  version){levenshtein browser + browser version.} else{ levenshtein browser + browser version on full data set}.
//otherwise, you're screwed.  You can't derive any useful information. Assume a default of 200ms

//if browser.name&&browser. 

//db.insert(phone, function (err, newDoc) {   // Callback is optional
  // newDoc is the newly inserted document, including its _id
  // newDoc has no key called notToBeSaved since its value was undefined
//});	
//

////db.find({"device.vendor": phone.device.vendor}, function (err, docs) {
//db.find({"device.model": phone.device.model}, function (err, docs) {    
//	if (docs.length >0){                                                  
//		console.log("model:");                                              
//		docs.forEach(logArrayElements);                                     
//	}else{                                                                
//		db.find({"device.vendor": phone.device.vendor}, function (err, docs) {
//			if (docs.length >0){                                              
//				console.log("devices from vendor " + phone.device.vendor + ":");
//				docs.forEach(logArrayElements);                                 
//			}else{                                                            
//				db.find({"os.name": phone.os.name}, function (err, docs) {      
//                                                                        
//					if (docs.length >0){                                          
//						console.log("os name:");                                    
//						docs.forEach(logArrayElements);                             
//					}else{                                                        
//						$ms=200;                                                    
//					}                                                             
//				});                                                             
//			}                                                                 
//		});                                                                 
//	}                                                                     
//});                                                                     
//                                                                        
//});

var i=0;  


var findClosestModel = function(whichPhone, callback){
		db.find({"device.model": whichPhone.device.model}, function (err, docs) { 
			if (docs.length >0){
			callback(whichPhone.os.model);
		 }else{
			db.find({"device.vendor": whichPhone.device.vendor}, function (err, docs) { 
			var lowestOne=Infinity;
			var bestModel;
			docs.forEach(function(element, index, array){
				if (new Levenshtein(element.device.model,whichPhone.device.model) <lowestOne){
					lowestOne=new Levenshtein(element.device.model,whichPhone.device.model);
					bestModel=element.device.model;
					}
			});
			callback(bestModel);      
			});
	  }
	});
};


//var findClosestBrowser = function(whichPhone, whichModel, callback){
//			var version=whichPhone.browser.version;	
//			console.log("looking for: " + version);
//			findClosestBrowser(version, whichPhone, whichModel, callback);
//};

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
			console.log("refinement is " + refinement);
			
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
			
			//console.log("selectedDocs: ");
			//console.log(selectedDocs);
			//console.log("lag (" + docs.length+ "): "+lag);

			
		//console.log("found it: " +versionRegEx +"\n\n");
			//console.log(docs[0].browser.name + " " + docs[0].browser.version)
			callback(lag);
		}else{
			var previousVersion=version;
			version= version.replace(/(\.|^)\w+$/,"");
			if (version===previousVersion){
				console.log("not found")
			}else{
				console.log("replacing");
				refinement = parseInt(previousVersion.replace(/.*\./,""));
				findClosestBrowser(version, whichPhone, whichModel, callback, refinement);
			}
		}
	
});
}






findClosestModel(phone, function(callback){
	console.log ("closest phone match is " +callback);
	findClosestBrowser(phone.browser.version, phone, callback, function(callback){
		console.log (callback);
	});
	
});
		

//db.find({"device.model": phone.device.model}, function (err, docs) {      
//	if (docs.length >0){                                                    
//		console.log("match on model:");
//		
//
//                                           
//		docs.forEach(logArrayElement);                                       
//	}else{                                                                  
//		db.find({"device.vendor": phone.device.vendor}, function (err, docs) {
//			if (docs.length >0){                                                
//				console.log("match on vendor " + phone.device.vendor + ":");  
//				docs.forEach(logArrayElement);                                   
//			}else{                                                              
//				db.find({"os.name": phone.os.name}, function (err, docs) {        
//                                                                          
//					if (docs.length >0){                                            
//						console.log("Match on OS name " + phone.os.name + ":");                                      
//						docs.forEach(logArrayElement);                               
//					}else{                                                          
//						$ms=200;                                                      
//					}                                                               
//				});                                                               
//			}                                                                   
//		});                                                                   
//	}                                                                       
//});                                                                       
//

//var compareVersions= function(v1, v2){
//	if (v1.split(".").length>v2.split(".").length){
//		var r1=v1;
//		var r2=v2;
//	}else{
//		var r2=v1;
//		var r1=v2;
//	}	
//	
//	var r1a = r1.split(".");
//	var r2a = r2.split(".");
//	var score=0;
//	
//	r1a.forEach(function(e,i,a){
//		if (e!==r2a[i]){
//			v=Math.abs(e-r2a[i]);
//			if (!isNaN(v)){
//				normalizedV=(v*Math.pow(10, -(v.toString().length)+1));
//				}
//			else{
//				normalizedV=1;
//			}	
//			score +=(Math.pow(10,-i) * normalizedV);
//			}
//	});
//	return score;
//}
//
//var s2="1.2.54";
//var s1 ="11.20.9.4";
//console.log(compareVersions(s2,s1));



//
//  OK, new idea:  cycle through and add the version number array to each one.  Figure out how to sort by that in increasing 
//  http://stackoverflow.com/questions/2784230/javascript-how-do-you-sort-an-array-on-multiple-columns            way
//  with the candidate JSON thrown in there.  Sort, identify where yours is, and then assign a number to each element in terms of relation to 
//  the compared unit. i.e. 2.0.332.0  you could then assign each digit a percentage of the min and max.  the pervious element might become 
//  2/16 0/0 332/600 0/0 i.e 1.050.  Take this and add it all together and sort and the top candidate is your ms choice
// maybe this is bad.


//ok, here's an easy idea: sort each one by version number, find the closest match and then average the three resulting MSes. If no matches, exclude the results




                                                                             	
//(look through all results and look for the ones with the exact os.name/major.minor version){levenshtein browser + browser version.} else{ levenshtein browser + browser version on full data set}.
//actually, you don't need to levenstein.  You need a function that pushes through the subversions looking for exact matches until it finds nothing and then simply finding the closest integer. Should be extensible to an infinte number of periods.
function logArrayElement(element, index, array) {
//put a line here that assigns the phone's major.minor to a variable to test against below
//db.find({ $and: [{ "os.name": phone.os.name }, { "os.version": phone.os.version }] }, function (err, docs) {

//  });
//  var l = new Levenshtein(a,b)
	i=i+1;
  console.log('a[' + index + '] = ' + element.device.vendor + " " + element.device.model + ", Levenshtein: "+ new Levenshtein(element.device.model,phone.device.model) );   
  console.log (element.os.name + " " + element.os.version + ", " + element.engine.name + " " + element.engine.version + ", " + element.browser.name + " " + element.browser.version);
	console.log(i + ' ----------' );
 }                                                 //var parser = new UAParser();
// var ua = request.headers['user-agent'];     // user-agent header from an HTTP request
// console.log(parser.setUA(ua).getResult());
