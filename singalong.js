#!/usr/bin/env node
/*!
* singalong.js v0.4.2
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

var express = require('express')
, http = require('http')
, app = express()
, server = http.createServer(app).listen(80)
, io = require('socket.io').listen(server)
;
var fs = require("fs");
var os=require('os');
var installedSongsDirectory=__dirname + '/songs/';
var songsDirectory= './songs/';
var tabline =0;
var longestLine=0;
var parsedHTML='';
var currentChord=0;
var currentMod=0;
var totalMod=0;
var swapFlat=0;
var currentSong="index";
var listofIPs=new Array();
var chordRegex=/^(([A-G](#|b)?(M|maj|m|min|\+|add|sus|mM|aug|dim|dom|flat)?[0-9]{0,2})|\s)+$/
var disableSecurity=0;

if(!dirExistsSync(songsDirectory)){//some sync business up front. Create and populate a local songs directory if none exists.
	console.log(songsDirectory+" doesn't exist. Creating.");
	fs.mkdirSync(songsDirectory);
	console.log("\nInstalling " + installedSongsDirectory + "Ive_Been_Workin_On_The_Railroad.txt into ./songs");
	if(fs.createReadStream(installedSongsDirectory + "Ive_Been_Workin_On_The_Railroad.txt").pipe(fs.createWriteStream(songsDirectory + "Ive_Been_Workin_On_The_Railroad.txt"))){console.log("File copied.");}else{console.log("ERROR:File did not copy.");}
}

//***tasks to do at startup.  I'm guessing there's a better way to do this.***
localIPs();//determine list of local IP addresses, cache it.  Still async because it doesn't really matter if it takes a few seconds, which it won't even
returnIndexHTML(function(HTML){  //generate the initial index, cache it
    parsedHTML=HTML;
});


//************** LISTENERS ********************
app.get('/load', function(req, res){ //Meat of the HTML data that defines a page.  Loaded into the <BODY> area </BODY>
    res.send(parsedHTML);
    res.end;
});
app.use(express.static(__dirname + '/static/')); //Where the static files are loaded from

io.sockets.on('connection', function(socket) {
    // Welcome messages on connection to just the connecting client
    socket.emit('bTotMod', { message: totalMod});
    socket.emit('bFlat', { message: swapFlat});
    socket.emit('bcurrentSong', { song: currentSong, bid: currentChord});  //This is both the song and the current chord.  Must be processed at same time.

    socket.on('id', function (data){  //user is switching chords.  Most commonly sent message
        if (securityCheck(socket.handshake.address.address)){//checks to see if the requester is on the approved list
            currentChord = data.data;
            io.sockets.emit('bcurrentSong', { song: currentSong, bid: currentChord}); //Sent out with every chord change, too.  This way, off chance the client doesn't get the "load" message, they'll get it next chord change.
            console.log(data);
        }
    });

    socket.on('currentSong', function (data){ //user has sent a "change song" request or has requested the index
        if (securityCheck(socket.handshake.address.address)){
            loadNewSong(data.data);
            console.log(data);
        }
    });

    socket.on('mod', function (data){ //situational modulation.  If a user misses this, they would need to refresh to get caught up.
        swapFlat=0;
        if (securityCheck(socket.handshake.address.address)){
            currentMod = data.data;
            io.sockets.emit('bmod', { message: currentMod});
            io.sockets.emit('bFlat', { message: swapFlat}); //reset the flat/sharp override
            console.log(data);
        }
    });

    socket.on('totmod', function (data){ //probably could be eliminated.  Totmod could be kept track of completely on the server side instead of simultaneously in all the clients at once.
        if (securityCheck(socket.handshake.address.address)){
            totalMod = data.data;
            //io.sockets.emit('bTotMod', { message: totalMod});
            console.log(data);
        }
    });

    socket.on('flat', function (data){//This is the flat/sharp override button. Whatever the client's position on sharp/flatness, does the opposite.
        if (securityCheck(socket.handshake.address.address)){
            if (swapFlat==1){
                swapFlat=0;
            }
            else{swapFlat=1;
            }
            io.sockets.emit('bFlat', { message: swapFlat});
            console.log(data);
        }
    });

});


//************** HELPER FUNCTIONS ********************
function loadNewSong(newsong){//loads the appropriate file (or the index) into parsedHTML, which is where the current HTML to be loaded sits.
    currentChord=0;
    totalMod=0;
    currentSong=(newsong);
    swapFlat=0;
    if (currentSong=="index"){
        returnIndexHTML(function(HTML){
            parsedHTML=HTML;
            io.sockets.emit('bcurrentSong', { song: currentSong, bid: currentChord}); //tell all clients to load new file
            io.sockets.emit('bFlat', { message: swapFlat}); //reset the flat/sharp override

        });
    }else{
        returnChordHTML(newsong, function(HTML) {
            parsedHTML=HTML;
            io.sockets.emit('bcurrentSong', { song: currentSong, bid: currentChord});
            io.sockets.emit('bFlat', { message: swapFlat}); //reset the flat/sharp override
        });
    }
}

function returnIndexHTML(callback){//Spit out the index based on the list of files in the /songs subfolder
    console.log("---------------------\nReading files from: \n" + songsDirectory + "\n");
    fs.readdir(songsDirectory, function (err, data) {//open up the songs directory for a listing of all files
        longestLine=0;
        if (err) throw err;//I have no idea what I'm doing
        var parseChunk="";
        parseChunk = parseChunk + '<span class="startstop" id="chordNumber0" onclick="sendChord(\'0\')">&gt;&gt;start<br><br></span>';//thing at the top of the page that says "start"
        parseChunk=parseChunk + '<div class="indexhead">SONGS</div>';
        for (var i = 0; i < data.length; i++) {
            var prettySongName= data[i].replace(/.txt$/i,'').replace(/_/g,' ').replace(/-/g,' - ');//pretty up the output
            if (prettySongName.length > longestLine) {longestLine = prettySongName.length;}
            var songName = data[i].replace(/\'/g, '\\\'');//necessary for filenames with single quotes in them
            parseChunk = parseChunk +  '<div class="songlink" onclick="changeSong(\''+  songName + '\')">' +  prettySongName +'</div>'; //click here
        }
        parseChunk = parseChunk + '<span class="startstop" id="chordNumber1" onclick="sendChord(\'1\')">&gt;&gt;end</span>';//thing at the bottom
        if (longestLine==0){longestLine=25;}

        parseChunk = parseChunk + '<form name="hiddenvars"><input type="hidden" id="longestLine" value="' + longestLine + '"><input type="hidden" id="lastPos" value="1"></form>'//passing variables to the client.  Is this the right way?  My guess is probably yes.
        callback(parseChunk);
    });
}

function returnChordHTML(fileName, callback) {//open up a file from /songs and parse it into HTML to be loaded into the <BODY> area </BODY>
    //two passes: first, we collect all the chords in the song, then we create the summary at the top in the variable allChords
    //TODO: figure out a way to turn the duplicated code into a function.
    var chordNumber=0;//<DIV> number later.
    var parseChunk='';//The being-assembled HTML chunklets
    var k=0; //index of the chords summary displayed before the song title at the top
    var chordsInSongLine='';
    var parseChunk = parseChunk + '<span class="startstop" id="chordNumber0" onclick="sendChord(\'0\')">&gt;&gt;start<br><br></span>';
    var allChords =new Array();
    longestLine=0;//How long is the longest line in the file being processed?
    fs.readFile(songsDirectory + fileName, 'utf8', function(err, data) {
        if(err) {
            console.error("Could not open file: %s", err);
            return;
        }
        //else, the file is opened and all data is read into the variable called data.
        var line = data.split(/\n/),i;
        for (var j=0; j<line.length; j++) {
            tabline=line[j];
            if ( tabline.length > longestLine ) { longestLine = tabline.length; }
            if (tabline.match(chordRegex)) //the line is a chord
            {
                var colCount=0;
                var chordLine = "";
                var tabarray = tabline.split(/(\s)/),i; //split chord line into chunks of spaces
                for (i = 0; i < tabarray.length; i++) {
                    if ( tabarray[i].match(/\s/g)){    //is it a space?
                        colCount++; //add to the column carat for where we are so far in the line
                    }
                    else {                  //it wasn't a space
                        if ( tabarray[i].match(/\w/)) { //but also weed out the empty ones.  Don't ask me.
                            var foundnew=1;
                            for(var l=0; l<allChords.length; l++){
                                if (tabarray[i] ==allChords[l]){foundnew=0;}
                            }
                            if (foundnew==1){
                                allChords[k]=tabarray[i];
                                k++;
                            }
                        }    // end is this a chord
                    }    //end is this a word or empty element
                }//end going through the elements
            }//end is it a chord line
        }

        for (i = 0; i < allChords.length; i++) {
            chordsInSongLine = chordsInSongLine + allChords[i] + "  "; //make all the chords in the song the first line parsed by the parser
            if ((i+1)%Math.round(longestLine/5)==0){chordsInSongLine=chordsInSongLine +"\n";} //hack.  Will make font too small on a song with many complicated chords
        }
        data = chordsInSongLine +"\n\n"+ data;

        //**************** ENGINE *******************
        //Now, we cycle back through and actually output the meat of the song to be injected into <BODY> via JQuery </BODY>
        var line = data.split(/\n/),i;
        for (var j=0; j<line.length; j++) {
            tabline=line[j];
            if (tabline.length > longestLine ) { longestLine = tabline.length; }
            if (tabline.match(chordRegex)) //the line is a chord
            {
                parseChunk=parseChunk +("\n\n" + '<div class="chords">');
                var colCount=0;
                var chordLine = "";
                var tabarray = tabline.split(/(\s)/),i; //split chord line into chunks of spaces
                for (i = 0; i < tabarray.length; i++) {
                    if ( tabarray[i].match(/\s/g)){    //is it a space?
                        colCount++; //add to the column carat for where we are so far in the line
                    }
                    else {                  //it wasn't a space
                        if ( tabarray[i].match(/\w/)) { //but also weed out the empty ones.  Don't ask me.
                            chordNumber++;
                            var chordchunk = '<span class="chordspan" style="position: absolute; left: 1em">'; //I have no idea why this piece of CSS has to be explicitly put here instead of the CSS file, but it does.
                            for (var spaces=0; spaces<colCount; spaces++){chordchunk = chordchunk + " ";}
                            chordchunk = chordchunk + '<span class="chordspan" id="chordNumber' + chordNumber + '" onclick="sendChord(\'' + chordNumber + '\')">' + tabarray[i] + '</span></span>';
                            chordLine = chordchunk + chordLine;
                            colCount += tabarray[i].length; //number of columns so far is the spaces from the spaces carat above plus the length of the chord
                        }    // end is this a chord
                    }    //end is this a word or empty element
                }//end going through the elements
                parseChunk=parseChunk +(chordLine);
            }//end is it a chord line

            else{ //it's lyrics
                //if (tabline.length <1){tabline =" ";} //need at least something for every lyrics line otherwise pagination is wrong
                //tabline =~ s/\s/&nbsp;/g;
                parseChunk=parseChunk +("\n" +  '<div class="lyrics">' + tabline +'');
            }
            parseChunk=parseChunk +('</div>'); //space before the div used to be important
        }
        chordNumber++;
        //longestLine = longestLine + 1; //used to do this, pretty sure we don't anymore.
        parseChunk = parseChunk + '<span class="startstop" id="chordNumber' + chordNumber + '" onclick="sendChord(\''  + chordNumber + '\')">&gt;&gt;end</span>';
        parseChunk = parseChunk + '<form name="hiddenvars"><input type="hidden" id="longestLine" value="' + longestLine + '"><input type="hidden" id="lastPos" value="' + chordNumber + '"></form>'
        parseChunk = parseChunk + '<div class="songlink" onclick="changeSong(\'index\')">Return to Index</div>';
        callback(parseChunk);
    });

}

function localIPs(){//generate a list of IP addresses
    var interfaces=os.networkInterfaces();
    var j=0;
    for (var dev in interfaces) {
        var alias=0;
        interfaces[dev].forEach(function(details){
            if (details.family=='IPv4') {
                listofIPs[j] = String(details.address);
                j++;
                alias++;
            }
        });
    }
}

function securityCheck(comparisonIP){ //check to see if the local IP addresses are the one sending the signals. Used to ignore signals from clients.  Eventually, clients should not accidentally send to avoid "asleep on the D key" syndrome
    for (j = 0; j < listofIPs.length; j++) {
        if ((listofIPs[j] == comparisonIP) || (disableSecurity==1)){return true;} else{return false;}
    }
}

function dirExistsSync (d) {
  try { fs.statSync(d).isDirectory() }
  catch (er) { return false }
  return true;
}

