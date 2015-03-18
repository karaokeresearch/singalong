#!/usr/bin/env node
var howlerVersion='1.1.25';
var singalongVersion='0.6.4';
var globalOffset=182;
var whoCalibratedContact='krc@brassrocket.com';  //put your own email address here so that calibration entries are tied to you in case they ever get rolled back into the master list

/*!
 * singalong.js v0.6.0
 * server for the Karaoke Research Council engine
 *
 * Karaoke Research Council
 * http://brassrocket.com/krc
 *
 * Copyright 2014 Ross Brackett
 * Licensed under the GPL Version 2 licenses.
 * http://www.gnu.org/licenses/gpl-2.0.html
 *
 */

(function() {

var express = require('express'),
    http = require('http'),
    app = express(),
    server = http.createServer(app).listen(80),
    ntp = require('socket-ntp-krcmod'),
    Datastore = require('nedb'),
    UAParser  = require('ua-parser-js'),
		cookieParser = require('cookie-parser'),
	  sortzzy = require('sortzzy');

    io = require('socket.io').listen(server, {
        log: false
    });

io.sockets.on('connection', ntp.sync); //ntp server




var db = new Datastore({ filename: './useragents.nedb', autoload: true });
var parser = new UAParser();



var fs = require("fs");
var os = require('os');
var installedSongsDirectory = __dirname + '/songs/';
var songsDirectory = './songs/';
var installedAudioDirectory = __dirname + '/audio/';
var audioDirectory = './audio/';
var installedTimingsDirectory = __dirname + '/timings/';
var timingsDirectory = './timings/';
var tabline = 0;
var longestLine = 0;
var parsedHTML = '';
var parsedAdminHTML = '';
var currentChord = 0;
var currentLyric = 0;
var currentMod = 0;
var totalMod = 0;
var swapFlat = 0;
var currentSong = "index";
var listofIPs = [];
var chordRegex = /^(([A-G](#|b)?(M|maj|m|min|\+|add|sus|mM|aug|dim|dom|flat)?[0-9]{0,2})|\s)+$/
var disableSecurity = 0;
var timings;
var firstChord;
var firstLyric;
var highlighting = 1;
var calibrationClients=[];
var calibrating=false;
var selectedChord='C'; //for clients connecting before the very first song is played
var nextChord={};

//************** HELPER FUNCTIONS ********************
var loadNewSong=function(newsong){ //loads the appropriate file (or the index) into parsedHTML, which is where the current HTML to be loaded sits.
    currentChord = 0;
    currentLyric = 0;
    totalMod = 0;
    currentSong = (newsong);
    swapFlat = 0;
    if (currentSong == "index") {
        returnIndexHTML(function (HTML) {
            parsedHTML = HTML;
            parsedAdminHTML = HTML;
            io.sockets.emit('bcurrentSong', {
                song: currentSong,
                bid: currentChord,
                blid: currentLyric
            }); //tell all clients to load new file
            io.sockets.emit('bFlat', {
                message: swapFlat
            }); //reset the flat/sharp override

        });
    } else {

        var inputFilename = timingsDirectory + currentSong + '.JSON';
        fs.readFile(inputFilename, 'utf8', function (err, data) {
            if (err) {
                timings = [];
                console.log('Error: ' + err);
            } else {
                //data = JSON.parse(data);
                timings = JSON.parse(data);
            }
            returnChordHTML(newsong, false, function (HTML) { //make and cache the basic page
                parsedHTML = HTML;
                returnChordHTML(newsong, true, function (adminHTML) { //make and cache the admin page
                    parsedAdminHTML = adminHTML;
                    io.sockets.emit('bcurrentSong', {
                        song: currentSong,
                        bid: currentChord,
                        blid: currentLyric
                    });
                    io.sockets.emit('bFlat', {
                        message: swapFlat
                    }); //reset the flat/sharp override
                    io.sockets.emit('bTotMod', {
                        message: totalMod
                    });
                });
            });

        });


    }
}



var returnIndexHTML=function(callback){ //Spit out the index based on the list of files in the /songs subfolder
    console.log("---------------------\nReading files from: \n" + songsDirectory + "\n");
    fs.readdir(songsDirectory, function (err, data) { //open up the songs directory for a listing of all files
        longestLine = 0;
        if (err) throw err; //I have no idea what I'm doing
        var parseChunk = "";
        parseChunk = parseChunk + '<span class="startstop" id="chordNumber0" onclick="sendChord(\'0\')">&gt;&gt;start<br><br></span>'; //thing at the top of the page that says "start"
        parseChunk = parseChunk + '<div class="indexhead">SONGS</div>';
        for (var i = 0; i < data.length; i++) {
            var prettySongName = data[i].replace(/.txt$/i, '').replace(/_/g, ' ').replace(/-/g, ' - '); //pretty up the output
            if (prettySongName.length > longestLine) {
                longestLine = prettySongName.length;
            }
            var songName = data[i].replace(/\'/g, '\\\''); //necessary for filenames with single quotes in them
            parseChunk = parseChunk + '<div class="songlink" onclick="changeSong(\'' + songName + '\')">' + prettySongName + '</div>'; //click here
        }
        parseChunk = parseChunk + '<span class="startstop" id="chordNumber1" onclick="sendChord(\'1\')">&gt;&gt;end</span>'; //thing at the bottom
        if (longestLine == 0) {
            longestLine = 25;
        }

        parseChunk = parseChunk + '<form name="hiddenvars"><input type="hidden" id="longestLine" value="' + longestLine + '"><input type="hidden" id="lastPos" value="1"><input type="hidden" id="lastLyric" value="1"></form>' //passing variables to the client.  Is this the right way?  My guess is probably yes.
        parseChunk = parseChunk + '<a href="/index.html"><div style="position: fixed; bottom:1em; right:1em; background-color:#EEEEEE"><img src="../../hamburger.png" style="width:2em; padding:0.5em; border:0.1em solid #999999;"></div></a>';

        
        callback(parseChunk);
    });
}

var returnChordHTML=function(fileName, authorized, callback){ //open up a file from /songs and parse it into HTML to be loaded into the <BODY> area </BODY>
    //two passes: first, we collect all the chords in the song, then we create the summary at the top in the variable allChords
    //TODO: figure out a way to turn the duplicated code into a function.
    var chordNumber = 0; //<DIV> number later.
    var lyricNumber = 0; //<DIV> number later.
    var parseChunk = ''; //The being-assembled HTML chunklets
    var k = 0; //index of the chords summary displayed before the song title at the top
    var chordsInSongLine = '';
    var allChords = [];
    longestLine = 0; //How long is the longest line in the file being processed?
    firstChord = 0;
    firstLyric = 0;


    fs.readFile(songsDirectory + fileName, 'utf8', function (err, data) {
        if (err) {
            console.error("Could not open file: %s", err);
            return;
        }
        //else, the file is opened and all data is read into the variable called data.
        var line = data.split(/\n/),
            i;
        for (var j = 0; j < line.length; j++) {
            tabline = line[j];
            if (tabline.length > longestLine) {
                longestLine = tabline.length;
            }
            if (tabline.match(chordRegex)) //the line is a chord
            {
                var colCount = 0;
                var chordLine = "";
                var tabarray = tabline.split(/(\s)/),
                    i; //split chord line into chunks of spaces
                for (i = 0; i < tabarray.length; i++) {
                    if (tabarray[i].match(/\s/g)) { //is it a space?
                        colCount++; //add to the column carat for where we are so far in the line
                    } else { //it wasn't a space
                        if (tabarray[i].match(/\w/)) { //but also weed out the empty ones.  Don't ask me.
                            var foundnew = 1;
                            for (var l = 0; l < allChords.length; l++) {
                                if (tabarray[i] == allChords[l]) {
                                    foundnew = 0;
                                }
                            }
                            if (foundnew == 1) {
                                allChords[k] = tabarray[i];
                                k++;
                            }
                        } // end is this a chord
                    } //end is this a word or empty element
                } //end going through the elements
            } //end is it a chord line
        }



        var prettySongName = currentSong.replace(/.txt$/i, '').replace(/_/g, ' ').replace(/-/g, ' - '); //pretty up the output
        parseChunk = parseChunk + '<div class="lyrics">';
        parseChunk = parseChunk + '<span class="Parenthesis">' + prettySongName.split(/\s*-\s*/)[0] + '</span>';
        parseChunk = parseChunk + '</div>';
        parseChunk = parseChunk + '<div class="lyrics">';
        if (prettySongName.split(/\s*-\s*/)[1]) {
            parseChunk = parseChunk + '<span class="Parenthesis">' + prettySongName.split(/\s*-\s*/)[1] + '</span>';
        }
        parseChunk = parseChunk + '</div>';


					
        parseChunk = parseChunk + '<div class="chords"><span class="chordspan" style="position: absolute; left: 1em">';
        parseChunk = parseChunk + '<span id="chordNumber0" onclick="sendChord(\'0\')" class="chordspan">&gt;</span>&nbsp;'	;

        for (i = 0; i < allChords.length; i++) {
            parseChunk += '<span id="chordNumber' + (i+1) + '" onclick="sendChord(' +(i+1)+ ')" class="chordspan">' + allChords[i] + "</span>";
            for (var j = 0; j < (5 - allChords[i].length); j++) {
                parseChunk += ' ';
            } //
            parseChunk += ' '; //dumb hack because sprintf doesn't work

            //chordsInSongLine = chordsInSongLine + allChords[i] + "  "; //make all the chords in the song the first line parsed by the parser
            if ((i + 1) % Math.round(longestLine / 8) == 0) {//no more than 8 chords per preview line.
                parseChunk += '</span></div><div class="chords"><span class="chordspan" style="position: absolute; left: 1em">&nbsp;&nbsp;'
            } //hack.  Will make font too small on a song with many complicated chords
            firstChord = i+1;
        }
        firstChord++;
        parseChunk = parseChunk + '</span></div><br><br>';


        parseChunk = parseChunk + '<div class="chords"><span class="chordspan" style="position: absolute; left: 1em">';
        parseChunk = parseChunk + '<span class="chordspan" id="chordNumber' + firstChord + '" onclick="sendChord(\'' + firstChord + '\')">&gt;&gt;Ready?</span>';
        firstChord++;
        parseChunk = parseChunk + ' <span class="chordspan" id="chordNumber' + firstChord + '" onclick="sendChord(\'' + firstChord + '\')">&gt;&gt;GO!</span>';
        parseChunk = parseChunk + '</span></div>';
        parseChunk = parseChunk + '<div class="readygo lyrics">';

        parseChunk = parseChunk + '<span id="lyricNumber' + firstLyric + '" onclick="sendLyric(\'' + firstLyric + '\')">&gt;&gt;Ready?</span>';
        firstLyric++;
        parseChunk = parseChunk + ' <span id="lyricNumber' + firstLyric + '" onclick="sendLyric(\'' + firstLyric + '\')">&gt;&gt;GO!</span>';
        parseChunk = parseChunk + '</div>';


        lyricNumber = firstLyric;
        chordNumber = firstChord;
        //firstChord+=2;//first chord should be number of chords + 2 - 1  Nevermind, this is actually wrong.  firstChord should be "GO!"


        //data = chordsInSongLine +"\n\n"+ data;

        //**************** ENGINE *******************
        //Now, we cycle back through and actually output the HTML of the song to be injected into <BODY> via JQuery </BODY>
        var line = data.split(/\n/),
            i;
        for (var j = 0; j < line.length; j++) {
            tabline = line[j];
            if (tabline.length > longestLine) {
                longestLine = tabline.length;
            }
            if (tabline.match(chordRegex)) ///********************************** IT'S CHORDS ************
            {
                parseChunk = parseChunk + ("\n\n" + '<div class="chords">');
                var colCount = 0;
                var chordLine = "";
                var tabarray = tabline.split(/(\s)/),
                    i; //split chord line into chunks of spaces
                for (i = 0; i < tabarray.length; i++) {
                    if (tabarray[i].match(/\s/g)) { //is it a space?
                        colCount++; //add to the column carat for where we are so far in the line
                    } else { //it wasn't a space
                        if (tabarray[i].match(/\w/)) { //but also weed out the empty ones.  Don't ask me.
                            chordNumber++;
                            var chordchunk = '<span class="chordspan" style="position: absolute; left: 1em">'; //I have no idea why this piece of CSS has to be explicitly put here instead of the CSS file, but it does.
                            for (var spaces = 0; spaces < colCount; spaces++) {
                                chordchunk = chordchunk + " ";
                            }
                            chordchunk = chordchunk + '<span class="chordspan" id="chordNumber' + chordNumber + '" onclick="sendChord(\'' + chordNumber + '\')">' + tabarray[i] + '</span></span>';
                            chordLine = chordchunk + chordLine;
                            colCount += tabarray[i].length; //number of columns so far is the spaces from the spaces carat above plus the length of the chord
                        } // end is this a chord
                    } //end is this a word or empty element
                } //end going through the elements
                parseChunk = parseChunk + (chordLine);
            } //end is it a chord line
            else { //********************************** IT'S LYRICS ************
                parseChunk = parseChunk + ("\n" + '<div class="lyrics">');
                var colCount = 0;
                var chordLine = "";
                var chordchunk = "";
                var sepchar = "";
                if (tabline.match(/(^[^\s]*?:\s*$)/m)) { //a song heading, such as "Chorus:"
                    parseChunk = parseChunk + '<span class="songheading">' + tabline + '</span>';
                } else {
                    var tabarray = tabline.split(/(\s|\-|\(.*?\))/),
                        i; //split lyrics line into chunks of spaces and dashes and parens blocks
                    for (i = 0; i < tabarray.length; i++) {
                        if (sepchar = tabarray[i].match(/(\s|\-|\(.*?\))/g)) { //is it a space or a dash? (or a parens block)
                            if (tabarray[i].match(/\(.*?\)/)) {
                                chordLine = chordLine + '<span class="parenthesis">';
                            }
                            chordLine = chordLine + sepchar;
                            if (tabarray[i].match(/\(.*?\)/)) {
                                chordLine = chordLine + '</span>';
                            }

                        } else { //it wasn't a space
                            if (tabarray[i].match(/\w/)) { //but also weed out the empty ones 
                                lyricNumber++;
                                var chordchunk = '';
                                chordchunk = chordchunk + '<span id="lyricNumber' + lyricNumber + '" onclick="sendLyric(\'' + lyricNumber + '\')">' + tabarray[i] + '</span>';
                                chordLine = chordLine + chordchunk;
                                //   colCount += tabarray[i].length; //number of columns so far is the spaces from the spaces carat above plus the length of the chord
                            }
                        } //end is this a word or empty element
                    } //end going through the elements
                    parseChunk = parseChunk + (chordLine);
                }
            }
            parseChunk = parseChunk + ('</div>'); //space before the div used to be important
        }
        chordNumber++;
        lyricNumber++;
        //longestLine = longestLine + 1; //used to do this, pretty sure we don't anymore.
        parseChunk = parseChunk + '<span class="startstop" id="chordNumber' + chordNumber + '" onclick="sendChord(\'' + chordNumber + '\')">&gt;&gt;end</span>';
        parseChunk = parseChunk + '<span class="startstop" id="lyricNumber' + (lyricNumber) + '" onclick="sendLyric(\'' + (lyricNumber) + '\')">&gt;&gt;end</span>';
        parseChunk = parseChunk + '<form name="hiddenvars"><input type="hidden" id="longestLine" value="' + longestLine + '"><input type="hidden" id="lastPos" value="' + chordNumber + '"><input type="hidden" id="firstChord" value="' + firstChord + '"><input type="hidden" id="lastLyric" value="' + lyricNumber + '"></form>'
        //parseChunk = parseChunk + '<div class="songlink" onclick="changeSong(\'index\')">Return to Index</div>';

        parseChunk = parseChunk + '<div id="image_fixed">';
        //audio player
        if (authorized == true) {
            parseChunk = parseChunk + '<audio preload="auto" id="audioplayer" src="audio/' + currentSong + '.ogg"></audio>';

            parseChunk = parseChunk + '<button id="singalongbutton" style="font-weight:bold" onclick="singalongMode()">Singalong</button>';
            parseChunk = parseChunk + '<button id="editorbutton" style="color:grey" onclick="editorMode()">Editor</button>';


            parseChunk = parseChunk + '<span style="display:none" class="editor">&nbsp;&nbsp;&nbsp;&nbsp;';
            parseChunk = parseChunk + '<button onclick="armChords()"><span style="color:maroon">&#9679;</span> <span id="armchordsbutton">Chords</span></button>';
            parseChunk = parseChunk + '<button onclick="armLyrics()"><span style="color:maroon">&#9679;</span> <span id="armlyricsbutton">Lyrics</span></button>';
            parseChunk = parseChunk + '<button onclick="playAudio()">&#9654;</button>';
            parseChunk = parseChunk + '<button onclick="pauseAudio()">&#10073; &#10073;</button>';
            parseChunk = parseChunk + '<button onclick="document.getElementById(\'audioplayer\').currentTime=0">|&#9664;&#9664;</button>';
            parseChunk = parseChunk + '<button onclick="document.getElementById(\'audioplayer\').volume+=0.1">Vol ^</button>';
            parseChunk = parseChunk + '<button onclick="document.getElementById(\'audioplayer\').volume-=0.1">Vol v</button>';
            //parseChunk = parseChunk	+ '<button class="editor" style="display:none" onclick="settingsWindow()">Settings</button>'; //some day, perhaps a metadata approach is warranted.
            parseChunk = parseChunk + '<button onclick="sendJSON()">Save</button>';
            parseChunk = parseChunk + '<span style="background-color:white; display: inline-block; width:1.5em; text-align:right" id="playbackrate">1</span>x<input type="range" id="speedslider" step="0.0625" value="1" min="0.5" max="1" onchange="changePlaybackRate(this.value)">';
            parseChunk = parseChunk + '</span>';
            parseChunk = parseChunk + '&nbsp;&nbsp;&nbsp;&nbsp;<button onclick="changeSong(\'index\')">Index</button>';
        }
        parseChunk = parseChunk + '<a href="/index.html"><div style="display: inline-block; background-color:#EEEEEE"><img src="../../hamburger.png" style="width:2em; padding:0.5em; border:0.1em solid #999999;"></div></a>';
        

        parseChunk = parseChunk + '</div>';


        callback(parseChunk);
    });

}

var localIPs=function(){ //generate a list of IP addresses
    var interfaces = os.networkInterfaces();
    var j = 0;
    console.log("Permitted IP addresses for send:");
    for (var dev in interfaces) {
        var alias = 0;
        interfaces[dev].forEach(function (details) {
            if (details.family == 'IPv4') {
                listofIPs[j] = String(details.address);
                console.log(String(details.address));
                j++;
                alias++;
            }
        });
    }
}

var securityCheck=function(comparisonIP){ //check to see if the local IP addresses are the one sending the signals. Used to ignore signals from clients.  Eventually, clients should not accidentally send to avoid "asleep on the D key" syndrome
    for (j = 0; j < listofIPs.length; j++) {
        if ((listofIPs[j] == comparisonIP) || (disableSecurity == 1)) {
            return true;
        }
    }
    console.log("Unauthorized send: " + comparisonIP);
    return false;
}

var dirExistsSync=function(d){
    try {
        fs.statSync(d).isDirectory()
    } catch (er) {
        return false
    }
    return true;
}





		




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


//the numerical search won't work if there's no range
  if (lowestOSVersionNumber === highestOSVersionNumber){highestOSVersionNumber++;}
	if (lowestEngineVersionNumber === highestEngineVersionNumber){highestEngineVersionNumber++;}
  if (lowestBrowserVersionNumber === highestBrowserVersionNumber){highestBrowserVersionNumber++;}


	// THE IMPORTANT PART.  Changing the weights below determines how the algorithm decides which lag value is probably the best.
	var fields = [];
	if(model.deviceModel!==undefined){fields.push({name:'deviceModel', type:'string', weight:8, options:{ignoreCase:true}});}	
	if(model.os.version!==undefined){fields.push({name:'OSVersionDecimal', type:'numeric', weight:6, fixedRange:[lowestOSVersionNumber, highestOSVersionNumber]});}
	if(model.engine.name!==undefined){fields.push({name:'engineName', type:'string', weight:3, options:{ignoreCase:true}});}
	if(model.engine.version!==undefined){fields.push({name:'engineVersionDecimal', type:'numeric', weight:3, fixedRange:[lowestEngineVersionNumber, highestEngineVersionNumber]});}
	if(model.browser.name!==undefined){fields.push({name:'browserName', type:'string', weight:2, options:{ignoreCase:true}});}
	if(model.browser.version!==undefined){fields.push({name:'browserVersionDecimal', type:'numeric', weight:2, fixedRange:[lowestBrowserVersionNumber, highestBrowserVersionNumber]});}

	var results= sortzzy.sort(data, model, fields);


	var avgLag=0;
	var bestScore=results[0].score;
	var i=0;
	while (i<results.length && bestScore===results[i].score) {
		avgLag+=parseInt(results[i].data.lag);
		i++;
	}
	avgLag=parseInt(avgLag/i);
	var dataForCallback=results[0].data
	dataForCallback.score = results[0].score
	callback(avgLag, dataForCallback);
}else{callback(200,'');} //it should never come to this, since the function should always be passsed data.  But just in case...
}







var determineLag=function(model, uuid, callback){	
	db.find({ "uuid": uuid}, function (err, docs) {//try to find it right away
		if (docs.length){
			console.log("uuid match")
			docs[0].score=1;
			callback(docs[0].lag, docs[0]);
		}else{
			if (model.device.model!==undefined && model.device.vendor!==undefined){//is it a mobile device
				var queryLiteral = [{ "device.model": model.device.model},{ "device.vendor": model.device.vendor}];
				db.find({ $and: queryLiteral }, function (err, docs) {
					if (docs.length){//we found one or more matches for exact device model
						//console.log("exact match");
						sortExtractLagData(docs, model, function(lag,bestResult){
							callback(lag, bestResult);
						});
					}else{//look for any results from the vendor
			      //console.log('looking for vendor ' + model.device.vendor);
						var queryLiteral = { "device.vendor": model.device.vendor};
						db.find(queryLiteral, function (err, docs) {
							if (docs.length){//we found one or more matches for vendor
								//console.log("vendor match");
								sortExtractLagData(docs, model, function(lag,bestResult){
									callback(lag, bestResult);
									//consol	e.log(bestResult);
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
					
						sortExtractLagData(docs, model, function(lag,bestResult){

							callback(lag, bestResult);
							//console.log(bestResult);
						});
					}else{
						 callback(200)
						//console.log("none for your OS found. 200");
					}
				});
			
			}
		}
	});
};







//************** BEGIN PROGRAM ********************
if (dirExistsSync(songsDirectory)===false) { //some sync business up front. Create and populate a local songs directory if none exists.
    console.log(songsDirectory + " doesn't exist. Creating.");
    fs.mkdirSync(songsDirectory);
    console.log("\nInstalling " + installedSongsDirectory + "Ive_Been_Workin_On_The_Railroad.txt into ./songs");
    if (fs.createReadStream(installedSongsDirectory + "Ive_Been_Workin_On_The_Railroad.txt").pipe(fs.createWriteStream(songsDirectory + "Ive_Been_Workin_On_The_Railroad.txt"))) {
        console.log("File copied.");
    } else {
        console.log("ERROR:File did not copy.");
    }
}


if (dirExistsSync(audioDirectory)===false) { //some sync business up front. Create and populate a local audio directory if none exists.
    console.log(audioDirectory + " doesn't exist. Creating.");
    fs.mkdirSync(audioDirectory);
    console.log("\nInstalling " + installedAudioDirectory + "Ive_Been_Workin_On_The_Railroad.txt.ogg into ./audio");
    if (fs.createReadStream(installedAudioDirectory + "Ive_Been_Workin_On_The_Railroad.txt.ogg").pipe(fs.createWriteStream(audioDirectory + "Ive_Been_Workin_On_The_Railroad.txt.ogg"))) {
        console.log("File copied.");
    } else {
        console.log("ERROR:File did not copy.");
    }
}


if (dirExistsSync(timingsDirectory)===false) { //some sync business up front. Create and populate a local timings directory if none exists.
    console.log(timingsDirectory + " doesn't exist. Creating.");
    fs.mkdirSync(timingsDirectory);
    console.log("\nInstalling " + installedTimingsDirectory + "Ive_Been_Workin_On_The_Railroad.txt.JSON into ./timings");
    if (fs.createReadStream(installedTimingsDirectory + "Ive_Been_Workin_On_The_Railroad.txt.JSON").pipe(fs.createWriteStream(timingsDirectory + "Ive_Been_Workin_On_The_Railroad.txt.JSON"))) {
        console.log("File copied.");
    } else {
        console.log("ERROR:File did not copy.");
    }
}


localIPs(); //determine list of local IP addresses, cache it.  Still async because it doesn't really matter if it takes a few seconds, which it won't even
returnIndexHTML(function (HTML) { //generate the initial index, cache it
    parsedHTML = HTML;
});


//************** URL handlers ********************

app.get('/load', function (req, res) { //Meat of the HTML data that defines a page.  Loaded into the <BODY> area </BODY>
res.set('Cache-Control', 'private, no-cache, no-store, must-revalidate'); //IE11 gets confused otherwise
    if (currentSong == "index") {
        res.end(parsedHTML);
    } else {
        if (securityCheck(req.ip)) {
            res.end(parsedAdminHTML);
        } else {
            res.end(parsedHTML);
        }
    }
});
app.get('/timings', function (req, res) { //JSON timings object
    res.set({
    	'Content-Type': 'application/json',
			'Cache-Control': 'private, no-cache, no-store, must-revalidate'
		});

    res.end(JSON.stringify(timings));

});
app.use(cookieParser());
app.use('/ua', function(req, res, next){
	var ua = req.headers['user-agent'];
	var uuid;
	var serverMuted=false;
	//res.clearCookie('uuid');  


	if (req.cookies.uuid){
		uuid=req.cookies.uuid;
	}	else{
		uuid='xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
	    var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
	    return v.toString(16);
		});
//		res.cookie('uuid', uuid);
		}

		for (i=0; i<calibrationClients.length;i++){
			if (calibrationClients[i].uuid===uuid && calibrationClients[i].serverMuted===true){var serverMuted=true;}
		}

	var osName;
	var model= parser.setUA(ua).getResult();
  osName=model.os.name;

	  determineLag(model, uuid, function(lag,bestResult){
			if (bestResult){ //should always happen
				var score=bestResult.score;}
			else{  //something bad happened.
				var score=0;
			}
//			console.log(bestResult);
    res.set({
    	'Content-Type': 'application/json',
			'Cache-Control': 'private, no-cache, no-store, must-revalidate'
		});

 			res.end(JSON.stringify({lag:lag, score:score, uuid:uuid, serverMuted:serverMuted, osName:osName}));
		});
});



function sortByKey(array, key) {
    return array.sort(function(a, b) {
        var x = a[key]; var y = b[key];
        return ((x < y) ? -1 : ((x > y) ? 1 : 0));
    });
}


app.get('/admin', function (req, res) { //Meat of the HTML data that defines a page.  Loaded into the <BODY> area </BODY>
if (securityCheck(req.ip)) {
	var clients = sortByKey(calibrationClients, 'score');
	var table='<table border=1>';
	table+='\n<tr><th>#</th><th>Lag</th><th>DB</th><th>Match %</th><th style="background:#DDDDDD">Vendor</th><th style="background:#DDDDDD">Model</th><th>OS</th><th>Version</th><th style="background:#DDDDDD">Browser</th><th style="background:#DDDDDD">Version</th><th>Socket ID</th><th>UUID</th><th><input type=button value="Mute All" onclick="muteAll()"></th><th><input type=button value="Unmute All" onclick="unMuteAll()"></th></tr>';
	
	for (var i=0; i<clients.length; i++){
	table+= '\n<tr style="background-color:';
	if (clients[i].score ===1){table+= '#DDFFDD';}//green
	else if (clients[i].score >0.75){table+= '#FFFFDD';}//yellow
	else {table+= '#FFDDDD';}//red


	
	table+='"><td>' + clients[i].number + '</td><td><input onchange="updateLag(\''+ clients[i].uuid+ '\', parseInt(document.getElementById(\''+clients[i].uuid +'\').value));" style="width:5em" type="number" id="'+clients[i].uuid+ '" value="' + clients[i].lag + '"></td>';
	table+='<td><input onclick="commitLag(\''+ clients[i].uuid+ '\', parseInt(document.getElementById(\''+clients[i].uuid+'\').value));" type="button" value="Commit"></td>';
	table+='<td>' +  (clients[i].score*100).toFixed(3)+ '</td><td>' +clients[i].ua.device.vendor+ '</td><td>' + clients[i].ua.device.model + '</td><td>' + clients[i].ua.os.name + '</td><td>' +   clients[i].ua.os.version+ '</td><td>' +   clients[i].ua.browser.name+ '</td><td>' +   clients[i].ua.browser.version+ '</td><td>' + clients[i].socketID.substr(16,4) + '</td><td>' +clients[i].uuid.substr(32,4) + '</td><td><input type=button value="M" onclick="muteSocket(\''+ clients[i].uuid+ '\');"></td><td><input type=button value="S" onclick="unMuteSocket(\''+ clients[i].uuid + '\');"></td></tr>';	
	
	}
	table+="</table>";
	res.end(table)
}else{res.end("");}
});



app.use(express.static(__dirname + '/static')); //Where the static files are loaded from
app.use('/audio', express.static(audioDirectory)); //Where the static files are loaded from



//************** LISTENERS ********************
io.sockets.on('connection', function (socket) {
    // Welcome messages on connection to just the connecting client
    socket.emit('bTotMod', {
        message: totalMod
    });
    socket.emit('bFlat', {
        message: swapFlat
    });
    socket.emit('bHighlighting', {
        message: highlighting
    });
		
		socket.emit('bSelectedChord', {
        chord: selectedChord
    });
 

                                                            
		socket.emit('bClientQueue', {                            
			itemType: nextChord.itemtype,      
			nextChord: nextChord.nextChord,    
			nextChange:  nextChord.nextChange, 
			chordNumber: nextChord.chordNumber,
			speedMultiplier: nextChord.speedMultiplier
		});                                  

 
    

		if (calibrating===true){
	    socket.emit('bCalibrate', {
	        message: 'start'
	    });
   	}else{
	    socket.emit('bCalibrate', {
	        message: 'stop'
	    });
   	}




    socket.emit('bcurrentSong', {
        song: currentSong,
        bid: currentChord,
        blid: currentLyric
    }); //This is both the song and the current chord.  Must be processed at same time.

    socket.on('id', function (data) { //user is switching chords.
        if (securityCheck(socket.client.conn.remoteAddress)) { //checks to see if the requester is on the approved list
            currentChord = data.data;

            if (typeof timings != "undefined") {
                if (typeof timings.lyricOffsets != "undefined") {
                    if (typeof timings.lyricOffsets[currentChord - firstChord] != "undefined") {
                        if (typeof timings.lyricOffsets[currentChord - firstChord][0] != "undefined") {

                            currentLyric = (timings.lyricOffsets[currentChord - firstChord][0][1] + 1);
                            console.log("TIMINGS: " + (timings.lyricOffsets[currentChord - firstChord][0][1] + 1));
                        }
                    }
                }
            }

            io.sockets.emit('bcurrentSong', {
                song: currentSong,
                bid: currentChord
            }); //Sent out with every chord change, too.  This way, off chance the client doesn't get the "load" message, they'll get it next chord change.
            console.log(data);
        }
    });

    socket.on('lid', function (data) { //user is switching lyrics.
        if (securityCheck(socket.client.conn.remoteAddress)) { //checks to see if the requester is on the approved list
            currentLyric = data.data;

            io.sockets.emit('bcurrentSong', {
                song: currentSong,
                blid: currentLyric
            }); //Sent out with every lyric change, too.  This way, off chance the client doesn't get the "load" message, they'll get it next lyric change.
            console.log(data);
        }
    });

    socket.on('currentSong', function (data) { //user has sent a "change song" request or has requested the index
        if (securityCheck(socket.client.conn.remoteAddress)) {
            loadNewSong(data.data);
            console.log(data);
        }
    });

    socket.on('mod', function (data) { //situational modulation.  If a user misses this, they would need to refresh to get caught up.
        swapFlat = 0;
        if (securityCheck(socket.client.conn.remoteAddress)) {
            currentMod = data.data;
            io.sockets.emit('bmod', {
                message: currentMod
            });
            io.sockets.emit('bFlat', {
                message: swapFlat
            }); //reset the flat/sharp override
            console.log(data);
        }
    });

    socket.on('totmod', function (data) { //probably could be eliminated.  Totmod could be kept track of completely on the server side instead of simultaneously in all the clients at once.
        if (securityCheck(socket.client.conn.remoteAddress)) {
            totalMod = data.data;
            //io.sockets.emit('bTotMod', { message: totalMod});
            console.log(data);
        }
    });

    socket.on('flat', function (data) { //This is the flat/sharp override button. Whatever the client's position on sharp/flatness, does the opposite.
        if (securityCheck(socket.client.conn.remoteAddress)) {
            if (swapFlat == 1) {
                swapFlat = 0;
            } else {
                swapFlat = 1;
            }
            io.sockets.emit('bFlat', {
                message: swapFlat
            });
            console.log(data);
        }
    });

    socket.on('highlighting', function (data) { //This is the flat/sharp override button. Whatever the client's position on sharp/flatness, does the opposite.
        if (securityCheck(socket.client.conn.remoteAddress)) {
            if (highlighting == 1) {
                highlighting = 0;
            } else {
                highlighting = 1;
            }
            io.sockets.emit('bHighlighting', {
                message: highlighting
            });
            console.log(data);
        }
    });


    socket.on('timings', function (data) {
        if (securityCheck(socket.client.conn.remoteAddress)) {
            timings = data;
            var outputFilename = timingsDirectory + currentSong + '.JSON';

            fs.writeFile(outputFilename, JSON.stringify(data, null, 4), function (err) {
                if (err) {
                    console.log(err);
                } else {
                    console.log("JSON saved to " + outputFilename);
                }
            });

            //          console.log(lyricOffsets);
        }
    });

    socket.on('next', function (data) { // which chord is next?  And when?
        if (securityCheck(socket.client.conn.remoteAddress)) {
            	    console.log(data.nextChord + ", " + data.nextChange);
						selectedChord=data.selectedChord;
            console.log("selectedChord is " + selectedChord);

						nextChord.itemtype="chordChange";
						nextChord.nextChord= data.nextChord;
						nextChord.nextChange=data.nextChange + Date.now();
						nextChord.chordNumber=data.chordNumber;
            nextChord.speedMultiplier=data.speedMultiplier;
            
            io.sockets.emit('bClientQueue', {
            													itemType: nextChord.itemtype,
            													nextChord: nextChord.nextChord, 
            												  nextChange:  nextChord.nextChange,
            												  speedMultiplier: nextChord.speedMultiplier,
            												  chordNumber: nextChord.chordNumber,
            												});

        }
    });

	  socket.on('calibration', function (data) { //Calibration conrol
			if (securityCheck(socket.client.conn.remoteAddress)) {

				if (data.data==='start'){
					calibrationClients=[];//clear the list of clients
					calibrating=true;
			    io.sockets.emit('bCalibrate', {
			        message: 'start'
			    });
		   	}

				if (data.data==='stop'){
					calibrating=false;
			    io.sockets.emit('bCalibrate', {
			        message: 'stop'
			    });
		   	}		   			   	
			}
		});

	  socket.on('calibrationRegistry', function (data) { //Calibration conrol
			var ua =parser.setUA(data.ua).getResult();
			var clientNumber=-1;
			for (i=0; i<calibrationClients.length; i++){

				if (calibrationClients[i].uuid===data.uuid){//if we already have the uuid, that's it. Only add that one.
					calibrationClients[i].socketID=socket.id;
					clientNumber=calibrationClients[i].number;
					break;
				}
					
			}
			if (clientNumber===-1){			
				clientNumber=calibrationClients.length;
				calibrationClients.push({number:clientNumber, uuid:data.uuid, lag: data.lag, score: data.score, ua: ua, socketID: socket.id});
			}
			console.log ("\n\n-------------\n\n");
			console.log(calibrationClients);
			 socket.emit('bCalibrate', {
        message: 'startCount',
        number: clientNumber
    	 });

		});


	  socket.on('updateLag', function (data) { //Broadcast updated lag to client who in turn updates cookie
			if (securityCheck(socket.client.conn.remoteAddress)) {
				for (i=0; i<calibrationClients.length;i++){
					if(data.uuid===calibrationClients[i].uuid){
						io.to(calibrationClients[i].socketID).emit('bUpdateLag', {
				        lag: data.lag,
				    });
				  }
				}
			}
		});

	  socket.on('commitLag', function (data) { //update calibrationClients. Update the DB, broadcast to client who updates cookie

			if (securityCheck(socket.client.conn.remoteAddress)) {
				var ua;
				for (i=0; i<calibrationClients.length;i++){
					if (calibrationClients[i].uuid===data.uuid){
						calibrationClients[i].lag=data.lag;
						calibrationClients[i].score=1;
						ua=calibrationClients[i].ua;
					}
				}
				var toDB=ua;
				toDB.uuid=data.uuid;
				toDB.lag=data.lag;
				toDB.howlerVersion=howlerVersion;
				toDB.singalongVersion=singalongVersion;
				toDB.whoCalibratedContact=whoCalibratedContact;
				toDB.globalOffset=globalOffset;
				toDB.dateAdded=new Date();
				
				//console.log("committing: ",toDB);
				
			
				db.remove({ uuid: data.uuid }, { multi: true }, function (err, numRemoved) {
						db.insert(toDB, function (err, newDoc) {   // Callback is optional
						  // newDoc is the newly inserted document, including its _id
						  // newDoc has no key called notToBeSaved since its value was undefined
						});
				});	

			}
		});



	  socket.on('muteSocket', function (data) { //mute a client
			if (securityCheck(socket.client.conn.remoteAddress)) {
				
				for (i=0; i<calibrationClients.length;i++){
					if (calibrationClients[i].uuid===data.uuid){
						calibrationClients[i].serverMuted=true;
						io.to(calibrationClients[i].socketID).emit('bServerMute', {
				        serverMute: true,
				    });

					}
				}
	
			}
		});


	  socket.on('unMuteSocket', function (data) { //unmute a client
			if (securityCheck(socket.client.conn.remoteAddress)) {
				for (i=0; i<calibrationClients.length;i++){
					if (calibrationClients[i].uuid===data.uuid){
						calibrationClients[i].serverMuted=false;
						io.to(calibrationClients[i].socketID).emit('bServerMute', {
				        serverMute: false,
				    });
					}
				}

			}
		});


	  socket.on('oops', function (data) { //unmute a client
			console.log("oops!");
			if (securityCheck(socket.client.conn.remoteAddress)) {
					io.sockets.emit('bOops', {
			        oops: true
			    });
			}
		});



	  socket.on('serverMuteAll', function (data) { //mute or unmute all clients
			if (securityCheck(socket.client.conn.remoteAddress)) {
				if (data.mute===true){
					for (i=0; i<calibrationClients.length;i++){
							calibrationClients[i].serverMuted=true;
					}

					io.sockets.emit('bServerMute', {
			        serverMute: true,
			    });
			  }
				
				if (data.mute===false){
					for (i=0; i<calibrationClients.length;i++){
							calibrationClients[i].serverMuted=false;
					}

					io.sockets.emit('bServerMute', {
			        serverMute: false,
			    });
			  }



			}
		});





});

}());
