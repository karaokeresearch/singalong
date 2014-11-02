var sortzzy = require('sortzzy')
  , UAParser  = require('ua-parser-js')
	,	Datastore = require('nedb');
	
var db = new Datastore({ filename: './useragents.nedb', autoload: true });
var parser = new UAParser();


var versionToInt=function(whatver){ //a terrible function that makes a version number into a pseudo integer
	if (whatver){
		var modver = whatver.split(".");
		var finalver = '';
		for (var i=0; i<3; i++){
			if(typeof modver[i] === 'undefined') {
				finalver += '000';
			}
			else{
				if(isNaN(parseInt(modver[i]))){var tempver="";}else{var tempver=String(parseInt(modver[i]));}
					if (tempver.length>3){tempver= tempver.substr(0,3);}
					for (j=0; j<(3-tempver.length); j++){
						finalver += '0'; //pad with zeroes
					}
					finalver += tempver;
				}
			}
			return parseInt(finalver);
			}else{return 0};
		}


var sortExtractLagData= function(data, model, callback){
//console.log(data);

if (data.length>0){
	var lowestOSVersionNumber=Infinity;
	var highestOSVersionNumber=0;

	var lowestEngineVersionNumber=Infinity;
	var highestEngineVersionNumber=0;

	var lowestBrowserVersionNumber=Infinity;
	var highestBrowserVersionNumber=0;


	//decimalize all version data for results, discover boundaries for different results
	for (var i=0; i<data.length; i++){
		data[i].OSVersionDecimal=versionToInt(data[i].os.version);
		if (data[i].OSVersionDecimal<lowestOSVersionNumber){lowestOSVersionNumber=data[i].OSVersionDecimal;}
		if (data[i].OSVersionDecimal>highestOSVersionNumber){highestOSVersionNumber=data[i].OSVersionDecimal;}

		data[i].engineVersionDecimal=versionToInt(data[i].engine.version);
		if (data[i].engineVersionDecimal<lowestEngineVersionNumber){lowestEngineVersionNumber=data[i].engineVersionDecimal;}
		if (data[i].engineVersionDecimal>highestEngineVersionNumber){highestEngineVersionNumber=data[i].engineVersionDecimal;}

		data[i].browserVersionDecimal=versionToInt(data[i].browser.version);
		if (data[i].browserVersionDecimal<lowestBrowserVersionNumber){lowestBrowserVersionNumber=data[i].browserVersionDecimal;}
		if (data[i].browserVersionDecimal>highestBrowserVersionNumber){highestBrowserVersionNumber=data[i].browserVersionDecimal;}

		//some baloney because sortzzy can't handle nested JSON
		data[i].deviceModel=data[i].device.model;
		data[i].engineName=data[i].engine.name;
		data[i].browserName=data[i].browser.name;

	//if (data[i].device.model===undefined){console.log("undefined"); data[i].device.model="";}
	//if (data[i].device.vendor===undefined){data[i].device.vendor=""}

	}
	
	//decimalize the test data, expand the boundaries if test data requires it.
	model.OSVersionDecimal=versionToInt(model.os.version);
	if (model.OSVersionDecimal<lowestOSVersionNumber){lowestOSVersionNumber=model.OSVersionDecimal;}
	if (model.OSVersionDecimal>highestOSVersionNumber){highestOSVersionNumber=model.OSVersionDecimal;}

	model.engineVersionDecimal=versionToInt(model.engine.version);
	if (model.engineVersionDecimal<lowestEngineVersionNumber){lowestEngineVersionNumber=model.engineVersionDecimal;}
	if (model.engineVersionDecimal>highestEngineVersionNumber){highestEngineVersionNumber=model.engineVersionDecimal;}

	model.browserVersionDecimal=versionToInt(model.browser.version);
	if (model.browserVersionDecimal<lowestBrowserVersionNumber){lowestBrowserVersionNumber=model.browserVersionDecimal;}
	if (model.browserVersionDecimal>highestBrowserVersionNumber){highestBrowserVersionNumber=model.browserVersionDecimal;}

	if (model.device.model===undefined){model.device.model=""}
	if (model.device.vendor===undefined){model.device.vendor=""}

	model.deviceModel=model.device.model;
	model.engineName=model.engine.name;
	model.browserName=model.browser.name;

  if (lowestOSVersionNumber === highestOSVersionNumber){highestOSVersionNumber++;}
	if (lowestEngineVersionNumber === highestEngineVersionNumber){highestEngineVersionNumber++;}
  if (lowestBrowserVersionNumber === highestBrowserVersionNumber){highestBrowserVersionNumber++;}

	// Define the fields
	var fields = [];
	
	if(model.deviceModel!==undefined){fields.push({name:'deviceModel', type:'string', weight:8, options:{ignoreCase:true}});}	
	if(model.os.version!==undefined){fields.push({name:'OSVersionDecimal', type:'numeric', weight:6, fixedRange:[lowestOSVersionNumber, highestOSVersionNumber]});}
	if(model.engine.name!==undefined){fields.push({name:'engineName', type:'string', weight:3, options:{ignoreCase:true}});}
	if(model.engine.version!==undefined){fields.push({name:'engineVersionDecimal', type:'numeric', weight:3, fixedRange:[lowestEngineVersionNumber, highestEngineVersionNumber]});}
	if(model.browser.name!==undefined){fields.push({name:'browserName', type:'string', weight:2, options:{ignoreCase:true}});}
	if(model.browser.version!==undefined){fields.push({name:'browserVersionDecimal', type:'numeric', weight:2, fixedRange:[lowestBrowserVersionNumber, highestBrowserVersionNumber]});}

console.log(data)	;

console.log("fields");
console.log(fields);

	var results= sortzzy.sort(data, model, fields);

	var avgLag=0;
	var bestScore=results[0].score;
	var i=0;
console.log("\n\nRESULTS:" +results[0].lag);
	while (i<results.length && bestScore===results[i].score) {
		avgLag+=parseInt(results[i].data.lag);
		i++;
	}
	avgLag=parseInt(avgLag/i);
	callback(avgLag);
}else{callback(200,'');} //it should never come to this, since the function should always be passsed data.  But just in case...
}







var determineLag=function(model, callback){	
	if (model.device.model!==undefined && model.device.vendor!==undefined){//is it a mobile device
		var queryLiteral = [{ "device.model": model.device.model},{ "device.vendor": model.device.vendor}];
		db.find({ $and: queryLiteral }, function (err, docs) {
			if (docs.length){//we found one or more matches for exact device model
				//console.log("exact match");
				sortExtractLagData(docs, model, function(lag,bestresult){
					callback(lag);
				});
			}else{//look for any results from the vendor
	      //console.log('looking for vendor ' + model.device.vendor);
				var queryLiteral = { "device.vendor": model.device.vendor};
				db.find(queryLiteral, function (err, docs) {
					if (docs.length){//we found one or more matches for vendor
						//console.log("vendor match");
						sortExtractLagData(docs, model, function(lag,bestresult){
							callback(lag);
							//consol	e.log(bestresult);
						});
					}else{
						callback(200);
						//console.log("no vendor match. 200");
					}
				});
			}
	
		});
	
	}else{ //it's not a mobile device
	
		var queryLiteral = {"os.name": model.os.name};
		db.find(queryLiteral, function (err, docs) {
			if (docs.length){//we found one or more matches for exact device model
			
				sortExtractLagData(docs, model, function(lag,bestresult){
					//console.log("it's a PC!");
					callback(lag);
					//console.log(bestresult);
				});
			}else{
				 callback(200)
				//console.log("none for your OS found. 200");
			}
		});
	
	}
};














var ua='Mozilla/5.0 (Windows NT 5.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/38.0.2125.111 Safari/537.36';
//var ua='Fucked Fucked Data';
//var ua='Mozilla/5.0 (iPad; CPU OS 6_0 like Mac OS X) AppleWebKit/536.26 (KHTML, like Gecko) Version/6.0 Mobile/10A5355d Safari/8536.25';


var model= parser.setUA(ua).getResult();
//var model = {"lag":"424","ua":"Mozilla/5.0 (Windows NT 5.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/37.0.2062.124 Safari/537.36","browser":{"name":"Chrome","version":"25.0.2062.116","major":"22"},"engine":{"name":"WebKit","version":"437.36"},"os":{"name":"Android","version":"2.2.1"},"device":{"model":"SNARFER221","vendor":"Samsung","type":"mobile"},"cpu":{},"_id":"uVc6M9GOYuCGMd2RX"};

determineLag(model, function(lag){
	console.log(lag);
});

