/*!
 * singalong-client v1.0.0
 * browser client for singalong.js
 *
 * Karaoke Research Council
 * http://brassrocket.com/krc
 *
 * Copyright 2014 Ross Brackett
 * Licensed under the GPL Version 2 licenses.
 * http://www.gnu.org/licenses/gpl-2.0.html
 *
 */
var socket = io.connect();
var currentChord = 0;
var currentSchedulerChord = 0;
var currentLyric = 0;
var longestLine = 0;
var lastPos = 0; //the final div number
var lastLyric = 0; //the final div number
var hitOnce = []; //determines if a user has hit a key or not
var SongInFlatKey = 0;
var actualKey;
var totalModulation = 0;
var currentSong;
var swapFlat = 0;
var lyricTimings = [];
var chordTimings = [];
var lyricOffsets = [];
var chordTimeouts = [];
var lyricTimeouts = [];
var playerMode = "singalong";
var lyricsArmed = false;
var chordsArmed = false;
var prevChordTimeStamp;
var currentChordTimeStamp;
var speedMultiplier = 1;
var fontSizepx;
var karaokeMode = true;
var firstChord;
var highlighting = 1;
var singalong = {};
var playQueue = [];
var averageSpeedMultiplierArray = [];
var averageSpeedMultiplier;
var nextChange = 0;
var displayLag = 0;


ntp.init(socket);



//********************** JQUERY LISTENS FOR LOCAL EVENTS FROM USER ******************
$(document).ready(function() { //

if (getQueryVariable("changeSong")) {
   	changeSong(getQueryVariable("changeSong"));
    setTimeout(function()
    {
    	
    		$('html,body').animate({
					scrollTop: 0
				}, 100); //scroll to top at new load. Just makes it more 
    	  console.log("whee!");
    	
    	},1000);
}


	
	//Possible events
	$(window).resize(function() { //detect if the window is resized, if so, resize the text
		textSizer(function() {});
	});

	//detect keystrokes.
	//do it this complicated way so that holding down a key does not send multiple
	//keystrokes to the engine.  Too much input is bad.  We use an array so that this is
	//only applied on a per-key basis to allow multiple users on the same keyboard while
	//simultaneously preventing accidental multiple-sends of any given key

	$(document).on('keydown', function(event) {
		actualKey = (event.which);
		if (hitOnce[actualKey] !== 1) {
			if (actualKey === 65) { //A chord left

				nudgeChord(-1);
			}

			if (actualKey === 68) { //D chord right

			    	nudgeChord(1);
			}
			if (actualKey === 66) { //B flat/sharp overrride
				sendFlat();
			}

			if (actualKey === 87) { //W modulate key up
				sendMod(1);
			}
			if (actualKey === 83) { //S modulate key down
				sendMod(-1);
			}

			hitOnce[actualKey] = 1;
		} //end keydown area
	}); //end document ready JQuery area

	$(document).on('keyup', function(event) {
		hitOnce[event.which] = 0;
	});
});

//*************** SOCKET.IO LISTENERS ***********************
socket.on('bmod', function(data) { //chord modulation
	modulateChord(data.message);
});

socket.on('bTotMod', function(data) { //total amount of modulation
	totalModulation = data.message;
});

socket.on('bFlat', function(data) {
	if (data.message === 1) {
		swapFlat = 1;
	} else {
		swapFlat = 0;
	} //flat override
	rewriteChord(0);
});



socket.on('bcurrentSong', function(data) { //what is the current song and where are we in it?  Received every left or right movement.
	console.log("got a new bCurrentSong");
    console.log("data");
	if (data.song !== currentSong) { //if there's a new song, or it's the index
		currentSchedulerChord = 0;
		currentChord = 0;
		currentLyric = 0;
		currentSong = data.song;
		averageSpeedMultiplierArray = [];
		averageSpeedMultiplier = 1;
		speedMultiplier = 1;


		$("body").load("/load", function() {
			lyricsArmed = false;
			chordsArmed = false;
			playerMode = "singalong";
			longestLine = Number($('#longestLine').val());
			lastPos = Number($('#lastPos').val()); //the final chord div number
			lastLyric = Number($('#lastLyric').val()); //the final lyric div number
			firstChord = Number($('#firstChord').val()); //
			
			$('html,body').animate({
				scrollTop: 0
			}, 0); //scroll to top at new load. Just makes it more professional
			currentLyric = (data.blid);
		  
			modulateChord(totalModulation);



			if (getQueryVariable("mode") === "tvchordchart") {
				activateTVChordChartMode(data.bid);
			} else if
			(getQueryVariable("mode") === "chordchart") {
				activateChordChartMode(data.bid);
			} else {
				activateKaraokeMode(data.bid);
			} //previous test: if ($('#editorbutton').length)
			//$('#editorbutton').length
		});

		$.getJSON("/timings", function(data) {
			
		});

	}else{		 if(data.blid){   moveLyricHighlight(currentLyric, data.blid, true, function() {});
		                           modulateChord(totalModulation);}
    }
});

//**************HELPER FUNCTIONS
var findMedian = function(array) {
	var values = array.slice(0);
	values.sort(function(a, b) {
		return a - b;
	});
	var half = Math.floor(values.length / 2);
	if (values.length % 2)
		return values[half];
	else
		return (values[half - 1] + values[half]) / 2.0;
};

var textSizer = function(callback) { //resize the text on the page.  The 0.6 has to do with the font ratio for both Vera and Courier New.

	var charWidth = Math.round((($(window).width() - 40) / (longestLine + 2))); //font size is proportional to the width of the screen
	fontSizepx = (charWidth * (1 / 0.60));
	if (karaokeMode === true && currentSong !== "index") {
		fontSizepx = fontSizepx * 1.75;
	}
	$(".indexhead").css("font-size", Math.round(fontSizepx * 1.5) + "px");
	$(".songlink").css("font-size", Math.round(fontSizepx) + "px");
	$(".chords").css("font-size", Math.round(fontSizepx) + "px");
	$(".chordspan").css("font-size", Math.round(fontSizepx) + "px");
	$(".startstop").css("font-size", Math.round(fontSizepx * 0.5) + "px");
	$(".lyrics").css("font-size", Math.round(fontSizepx) + "px");
	document.body.style.margin = "0em 0em 0em 0em"; //left margin
	callback();
};



var goToByScroll = function(toid,speed,stop) { //moves a scroll spot 1/2 of the way down the screen to the currently selected chord
	
	if ((($("#" + toid).offset().top) - $(document).scrollTop() - ($(window).height() / 2)) > (fontSizepx / 2)) { //check to see if they are different otherwise you are wasting cycles
		console.log("We decided to goToByScroll", toid,speed,stop);
		if (stop){
			$('html,body').stop();
		}
		$('html,body').animate({
			scrollTop: $("#" + toid).offset().top - $(window).height() / 2
		}, speed); //this value is how many ms it takes for transitions
	return true;
	}else{return false};
};


var moveChordHighlight = function(fromid, toid, callback) {
	//first, erase the highlight from the previous chord

	$("#chordNumber" + fromid).removeClass("highlightedchord");
	$("#chordNumber" + toid).addClass("highlightedchord");
	callback();
};


var oldPosition = $(document).scrollTop();
var newPosition = $(document).scrollTop();
var pixelsPerSecond=0;

setInterval(function(){

		newPosition = $(document).scrollTop();
		if (newPosition-oldPosition>0){
			var ratePerSecond= (newPosition-oldPosition)/2;
			pixelsPerSecond = (pixelsPerSecond + ratePerSecond)/2;
			console.log(ratePerSecond,pixelsPerSecond);	
		}
		oldPosition=newPosition;
},2000);

var determineNextVerticalChord = function(chordNumber){

	var myPos = ($("#chordNumber" + chordNumber).offset().top);
	var i=0;
	for (i = chordNumber; i<lastPos;i++){
		
		 if ($("#chordNumber" + i).offset().top - myPos>5){
		 	
		  //console.log(i, myPos, $("#chordNumber" + i).offset().top);
		 	return i;
		 	break;
		}
	
	}

}

var nudgeChord = function(increment) {
	//move the active chord given a value relative to the current chord
	var newPos = currentChord + increment;
	moveChordHighlight(currentChord,newPos,function(){});
	currentChord = newPos;
	
	if (currentChord >1){
  	var prevDivScrollTop =  $("#chordNumber" + (currentChord-1)).offset().top 
  }
  var thisDivScrollTop =  $("#chordNumber" + currentChord).offset().top 
	var nextDivScrollTop =  $("#chordNumber" + (determineNextVerticalChord(newPos))).offset().top;
	var scrollTime = (nextDivScrollTop-thisDivScrollTop)/pixelsPerSecond;	
	console.log("--" +  prevDivScrollTop, thisDivScrollTop, nextDivScrollTop, pixelsPerSecond,scrollTime);
	
  if(currentChord >1 && prevDivScrollTop!=thisDivScrollTop){//this is a different level than the last one.
		console.log("scrolling to " + determineNextVerticalChord(newPos) + " for secs:" + scrollTime);
	  var correctedScrollTime;
	  if(goToByScroll("chordNumber"+newPos, 750, true)==false){//didn't actually
				correctedScrollTime = scrollTime*1000;
		}	else{ correctedScrollTime = (scrollTime*1000)-750}
			
			
		goToByScroll("chordNumber"+newPos, 750, true);
		goToByScroll("chordNumber"+determineNextVerticalChord(newPos), correctedScrollTime,false);
	}

};

//***************** EMITTER FUNCTIONS **********************
var sendChord = function(whichchord) { //wherein we send to the server "next" and "id"

	socket.emit('id', {
		data: whichchord
	});

};



  

var changeSong = function(whichsong) {
    
	socket.emit('currentSong', {
		data: whichsong
	}); //User clicked a song or return to index link
};


var jumpToChord = function(whichchord) { //jump a chord given an integer value that corresponds with a chord's div id
	if (playerMode === "singalong") { //playback mode.  This chunk of code triggers lyrics

		//console.log("whichchord is ", whichchord, " and currentSchedulerChord is ", currentSchedulerChord , " and firstchord is ", firstChord); 
		if (whichchord - currentSchedulerChord === 1 || whichchord - firstChord === 1) { //likely pushed the D key
			//triggerLyrics(whichchord - firstChord, speedMultiplier);
		}
	}

	moveChordHighlight(currentSchedulerChord, whichchord, function() { //implemented as a callback theoretically to reduce mobile browser choppiness on the animation

		if (whichchord > firstChord || currentSchedulerChord > firstChord) //don't scroll until you're past the preview.
		{
			if (!(whichchord - currentSchedulerChord === 1 && ($("#chordNumber" + whichchord).offset().top) - $(document).scrollTop() - ($(window).height() / 5) < 0)) {
				goToByScroll("chordNumber" + whichchord, 600,true);
			}
		}
		currentSchedulerChord = parseInt(whichchord);
	});

};


var sendMod = function(increment) {
	totalModulation += increment;
	socket.emit('totmod', {
		data: totalModulation
	});
	socket.emit('mod', {
		data: increment
	});
};

var sendFlat = function() {
	socket.emit('flat', {
		data: "swap"
	});
};


var modulateChord = function(increment) {
	//Modulate all of the chords up or down a half step depending on variable stepdirection.  Guesses if the notation should be sharp or flat as well
	var chordNum; //div value when cycling through
	var toColorName;
	var cellSaid;
	var chordSharp = 0;
	var chordFlat = 0;
	var chordType;
	var chordVal = 0;
	var minChord = /[A-G](#|b)*(m(?!aj))/;

	for (chordNum = 0; chordNum <= lastPos - 1; chordNum = chordNum + 1) { //run through all the chords
		toColorName = "chordNumber" + chordNum;
		cellSaid = $("#" + toColorName).html();
		chordVal = detchordVal(cellSaid); //read the chords from the div cells and assign a numerical value to base tone
		chordVal = (chordVal + increment) % 12; //increase or decrease value
		//if (chordVal === 13) {
		//    chordVal = 1;
		//    }
		if (chordVal === 0) {
			chordVal = 12;
		}

		// Makes a guess at if chords should be represented as sharp or flat.
		// It does so by looking at each of the chords in the new key, and pretends for a moment
		// each one is the key the song has been transposed to.  If a majority of the candidate key signatures require
		// are flat key signatures, the program guesses and assumes it's a flat key.  It usually works for Western
		// compositions.  Assuming I haven't deluded myself.

		if (cellSaid.match(minChord)) {
			chordType = "minor";
		} else {
			chordType = "major";
		} //determine minor or major
		if (chordVal === 1) { //A
			if (chordType === "major") {
				chordSharp = chordSharp + 1;
			}
			//Am is natural
		}
		if (chordVal === 2) { //Bb
			{
				chordFlat = chordFlat + 1;
			}
			//both M and m are flat
		}
		if (chordVal === 3) { //B
			{
				chordSharp = chordSharp + 1;
			}
			//both B and Bm are sharp
		}
		if (chordVal === 4) { //C
			if (chordType === "minor") {
				chordFlat = chordFlat + 1;
			}
			//Cm is flat, C is natural
		}
		if (chordVal === 5) { //Db slash C#
			if (chordType === "major") {
				chordFlat = chordFlat + 1;
			}
			if (chordType === "minor") {
				chordSharp = chordSharp + 1;
			}
			//Db is flat C#m is sharp
		}
		if (chordVal === 6) { //D
			if (chordType === "major") {
				chordSharp = chordSharp + 1;
			}
			if (chordType === "minor") {
				chordFlat = chordFlat + 1;
			}
			//D is sharp, Dm is flat
		}
		if (chordVal === 7) { //Eb
			if (chordType === "major") {
				chordFlat = chordFlat + 1;
			}
			//Eb is flat, D#m/#Ebm both have five sharps/flats, boyee.  So don't lean either way.
		}
		if (chordVal === 8) { //E
			chordSharp = chordSharp + 1;
			//both E and Em are sharp
		}
		if (chordVal === 9) { //F
			chordFlat = chordFlat + 1;
			//both F and Fm are flat
		}
		if (chordVal === 10) { //F#/Gb
			if (chordType === "minor") {
				chordSharp = chordSharp + 1;
			}
			//F#m is sharp F#/Gb both have five sharps/flats, so in that case, don't lean either way.
		}
		if (chordVal === 11) { //G
			if (chordType === "major") {
				chordSharp = chordSharp + 1;
			}
			if (chordType === "minor") {
				chordFlat = chordFlat + 1;
			}
			//G is sharp, Gm is flat
		}
		if (chordVal === 12) { //Ab /G#m
			if (chordType === "major") {
				chordFlat = chordFlat + 1;
			}
			if (chordType === "minor") {
				chordSharp = chordSharp + 1;
			}
			//Ab is flat, G#m is sharp
		}
	}
	if (chordFlat > chordSharp) {
		SongInFlatKey = 1;
	} else {
		SongInFlatKey = 0;
	}
	rewriteChord(increment);
};

var rewriteChord = function(increment) {
	//run through the divs and change the values.  Looks at the global variable SongInFlatKey.
	var chordNum; //div value when cycling through
	var toColorName;
	var cellSaid; //what does the data retrieved from the <SPAN> say </SPAN>
	var chordVal;
	var chordBase;

	for (chordNum = 0; chordNum <= lastPos - 1; chordNum = chordNum + 1) {
		toColorName = "chordNumber" + chordNum;
		cellSaid = $("#" + toColorName).html();
		if (cellSaid.match(/^(([A-G](#|b)?(M|maj|m|min|\+|add|sus|mM|aug|dim|dom|flat)?[0-9]{0,2})|\s)+$/)) { //so that Ready/Go doesn't break
			chordVal = detchordVal(cellSaid); //read the chords from the div cells and assign a numerical value to base tone
			chordVal = (chordVal + increment) % 12;
			//if (chordVal === 13) {
			//    chordVal = 1;
			//}

			if (chordVal === 0) {
				chordVal = 12;
			}
			var secondPart = "";
			cellSaid.match(/[A-G](#|b){0,1}(\w*)/); //
			secondPart = (RegExp.$2); //
			if (chordVal === 1) { //A
				chordBase = "A";
			}
			if (chordVal === 2) { //Bb slas A#
				if ((SongInFlatKey === 1 && swapFlat === 0) || (SongInFlatKey === 0 && swapFlat === 1)) {
					chordBase = "Bb";
				} else {
					chordBase = "A#";
				}
			}
			if (chordVal === 3) { //B
				chordBase = "B";
			}
			if (chordVal === 4) { //C
				chordBase = "C";
			}
			if (chordVal === 5) { //Db slash C#
				if ((SongInFlatKey === 1 && swapFlat === 0) || (SongInFlatKey === 0 && swapFlat === 1)) {
					chordBase = "Db";
				} else {
					chordBase = "C#";
				}
			}
			if (chordVal === 6) { //D
				chordBase = "D";
			}
			if (chordVal === 7) { //Eb slash D#
				if ((SongInFlatKey === 1 && swapFlat === 0) || (SongInFlatKey === 0 && swapFlat === 1)) {
					chordBase = "Eb";
				} else {
					chordBase = "D#";
				}
			}
			if (chordVal === 8) { //E
				chordBase = "E";
			}
			if (chordVal === 9) { //F
				chordBase = "F";
			}
			if (chordVal === 10) { //Gb slash F#
				if ((SongInFlatKey === 1 && swapFlat === 0) || (SongInFlatKey === 0 && swapFlat === 1)) {
					chordBase = "Gb";
				} else {
					chordBase = "F#";
				}
			}
			if (chordVal === 11) { //G
				chordBase = "G";
			}
			if (chordVal === 12) { //Ab slash G#
				if ((SongInFlatKey === 1 && swapFlat === 0) || (SongInFlatKey === 0 && swapFlat === 1)) {
					chordBase = "Ab";
				} else {
					chordBase = "G#";
				}
			}
			$("#" + toColorName).html(chordBase + secondPart); //write
		}
	}
};

var detchordVal = function(chordname) {
	//a helper function for the function called modulateChord
	var chordNum;
	if (chordname.match(/^A/)) {
		chordNum = 1;
	}
	if (chordname.match(/^B/)) {
		chordNum = 3;
	}
	if (chordname.match(/^C/)) {
		chordNum = 4;
	}
	if (chordname.match(/^D/)) {
		chordNum = 6;
	}
	if (chordname.match(/^E/)) {
		chordNum = 8;
	}
	if (chordname.match(/^F/)) {
		chordNum = 9;
	}
	if (chordname.match(/^G/)) {
		chordNum = 11;
	}
	if (chordname.match(/^[A-G]b/)) {
		chordNum = chordNum - 1;
	}
	if (chordname.match(/^[A-G]#/)) {
		chordNum = chordNum + 1;
	}
	if (chordNum === 0) {
		chordNum = 12;
	}
	return chordNum;
};















var singalongMode = function() {
	
	$('#editorbutton').css("fontWeight", "normal");
	$('#singalongbutton').css("fontWeight", "bold");
	$('#editorbutton').css("color", "grey");
	$('#singalongbutton').css("color", "black");
	playerMode = "singalong";
	$('.editor').hide("1000");
	for (var i = 0; i < chordTimings.length; i++) {
		if (chordTimings[i] !== null) {
			$("#chordNumber" + (i + firstChord)).removeClass("recorded");
		}
	}
	for (i = 0; i < lyricTimings.length; i++) {
		if (lyricTimings[i] !== null) {
			$("#lyricNumber" + (i + 1)).removeClass("recorded");
		}
	}

};

var activateTVChordChartMode = function(bid) {
startingChord = 0;
lastSent = 0;
	$('link').attr('href', 'singalong-client-tv.css');
	karaokeMode = false;
	textSizer(function() {});
	setTimeout(function() {
		jumpToChord(bid);
		
	}, 500);

		$(".Parenthesis").addClass("tvwhite"); //Can't for the life of me remember why I called it Parenthesis

		for (var i = 0; i < lastPos; i++) {
			$("#chordNumber" + i).addClass("tvwhite");
		}
		for (i = 0; i < lastLyric; i++) {
	    	$("#lyricNumber" + i).addClass("tvwhite");
		}
//start up a queue to trigger chord change sends



};



var activateChordChartMode = function(bid) {
	$('link').attr('href', 'singalong-client.css');
	karaokeMode = false;
	textSizer(function() {});
	setTimeout(function() {
		jumpToChord(bid);
		
	}, 500);

};


var getQueryVariable = function(variable) {

	var query = window.location.search.substring(1);
	var vars = query.split("&");
	for (var i = 0; i < vars.length; i++) {
		var pair = vars[i].split("=");
		if (pair[0] === variable) {
			return pair[1];
		}
	}
	return (false);
};

//-------------------------------------------The Queue (scheduler)





socket.on('bClientQueue', function(data) { //listen for chord change requests
	if (data.itemType === "chordChange") {

	//	if (data.nextChange <= ntp.serverTime() - displayLag) {
			jumpToChord(data.chordNumber-1	);
	//	} //if zero time, run immediately
	//	else {
	//		playQueue.push(["chordChange", parseInt(data.nextChange) - displayLag, data.chordNumber, data.speedMultiplier]);
	//	} //Set to zero here, but really 180ms for my phone!!! It's a problem!
	}
});

socket.on('bOops', function() { //listen for chord change requests
	console.log("oops!", playQueue[0]);
	console.log(playQueue.splice(1, 1));
	speedMultiplier = averageSpeedMultiplier[0];
	averageSpeedMultiplierArray.pop();
});