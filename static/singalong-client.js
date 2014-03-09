/*!
* singalong-client v0.5.0
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
var currentChord=0;
var currentLyric=1;
var longestLine =0;
var lastPos=0; //the final div number
var lastLyric=0; //the final div number
var hitOnce =new Array();//determines if a user has hit a key or not
var SongInFlatKey=0;
var actualKey;
var totalModulation=0;
var loadedModulation=0;
var currentSong;
var swapFlat=0;
var lyricTimings =new Array();
var chordTimings =new Array();
var lyricOffsets = new Array();
var chordTimeouts = new Array();
var lyricTimeouts = new Array();
var playerMode="singalong";
var lyricsArmed=false;
var chordsArmed=false;
var prevChordTimeStamp;
var speedMultiplier=1;
var currentScroll=0;
var fontSizepx;
var karaokeMode=false;

//********************** JQUERY LISTENS FOR LOCAL EVENTS FROM USER ******************
$(document).ready(function(){ //

	

	//Possible events
	$(window).resize(function() { //detect if the window is resized, if so, resize the text
		textSizer(function(){});
	});


	$( "body" ).click(function() {


           if (karaokeMode==false){
           	$('link').attr('href','singalong-client-karaokemode.css');
            karaokeMode=true;
        }else{$('link').attr('href','singalong-client.css');
			karaokeMode=false;
        	}
			textSizer(function(){});

	});


	//detect keystrokes.
	//do it this complicated way so that holding down a key does not send multiple
	//keystrokes to the engine.  Too much input is bad.  We use an array so that this is
	//only applied on a per-key basis to allow multiple users on the same keyboard while
	//simultaneously preventing accidental multiple-sends of any given key

	$(document).on('keydown',function(event){
		actualKey=(event.which);
		if (hitOnce[actualKey]!= 1){
			if (actualKey==65){ //A chord left
				
			nudgeChord(-1);}

			if (actualKey==68){ //D chord right

				if (playerMode=="editor" && chordsArmed==true && (document.getElementById('audioplayer').paused ==false)){//we are actively recording chord timings
					chordTimings[currentChord + 1] = document.getElementById('audioplayer').currentTime;
					$("#chordNumber" + (currentChord +1)).addClass("recorded");

					//set CurrentChord array item associated with the related DIV to have a time value stored in it.  Same below for lyrics.
				}
				nudgeChord(1);
			}
			if (actualKey==66){ //B flat/sharp overrride
			sendFlat();}

			if (actualKey==87){ //W modulate key up
			sendMod(1);}
			if (actualKey==83){ //S modulate key down
			sendMod(-1);}

			if (actualKey==74){ //J lyric left
			nudgeLyric(-1);}
			if (actualKey==76){ //K lyric right
				if (lyricsArmed==true && (document.getElementById('audioplayer').paused ==false)){//we are active recording lyrics timings
					lyricTimings[currentLyric + 1] = document.getElementById('audioplayer').currentTime;
					$("#lyricNumber" + (currentLyric+1)).addClass("recorded");

				}
				nudgeLyric(1);
			}

			hitOnce[actualKey]=1;
		}//end keydown area
	});//end document ready JQuery area
 
    $(document).on('keyup',function(event){
        hitOnce[event.which]=0;
    });
});


//*************** SOCKET.IO LISTENERS ***********************
socket.on('bmod', function(data) { //chord modulation
    modulateChord(data.message);
});

socket.on('bTotMod', function(data) { //total amount of modulation
    totalModulation=data.message;
});

socket.on('bFlat', function(data) {
    if (data.message==1){swapFlat=1;}else{swapFlat=0;} //flat override
        rewriteChord(0);
    });

socket.on('bcurrentSong', function(data) { //what is the current song and where are we in it?  Sent every left or right movement.
	if (data.song!=currentSong){ //if there's a new song, or it's the index
		currentChord=0;
		currentLyric=1;
		currentSong=data.song;


		jQuery("body").load("/load",function(){
			longestLine =Number($('#longestLine').val());
			lastPos=Number($('#lastPos').val())//the final chord div number
			lastLyric=Number($('#lastLyric').val())//the final lyric div number
			$('html,body').animate({scrollTop: 0},0); //just makes it more professional
			textSizer(function(){
				jumpToChord(data.bid);
				jumpToLyric(data.blid);
				modulateChord(totalModulation);
			});
		});


		$.getJSON( "/timings", function( data ) {
        if (data.lyricOffsets && data.chordTimings && data.lyricTimings ){
        	lyricOffsets=data.lyricOffsets;
        	chordTimings=data.chordTimings;
        	lyricTimings=data.lyricTimings;
        } else{
        	lyricOffsets=[];
        	chordTimings=[];
        	lyricTimings=[];
        }
		});

	}else{//if the song is the same, it's just updates
		if(data.bid!=null){jumpToChord(data.bid)}
		if(data.blid!=null){jumpToLyric(data.blid)}

	};
});



//**************HELPER FUNCTIONS
function textSizer(callback) { //resize the text on the page.  The 0.6 has to do with the font ratio for both Vera and Courier New.
	
    var charWidth = Math.round((($(window).width() - 40) / (longestLine + 2))); //font size is proportional to the width of the screen
    fontSizepx =(charWidth * (1 / 0.60));
    if (karaokeMode==true){fontSizepx = fontSizepx*2;}
    $(".indexhead").css("font-size", Math.round(fontSizepx*1.5) + "px")
    $(".songlink").css("font-size", Math.round(fontSizepx) + "px")
    $(".chords").css("font-size", Math.round(fontSizepx) + "px");
    $(".chordspan").css("font-size", Math.round(fontSizepx) + "px");
    $(".startstop").css("font-size", Math.round(fontSizepx*.5) + "px");
    $(".lyrics").css("font-size", Math.round(fontSizepx) + "px");
    document.body.style.margin = "0em 0em 0em 0em"; //left margin
    callback();
}

function goToByScroll(fromid, toid) {//moves a scroll spot 1/5 of the way down the screen to the currently selected chord
      if (Math.abs(($("#" + toid).offset().top) - $(document).scrollTop() - ($(window).height() / 5 ))>(fontSizepx/2)) { //check to see if they are different otherwise you are wasting cycles
        currentScroll=$("#" + toid).offset().top;
        $('html,body').animate({
            scrollTop: $("#" + toid).offset().top - $(window).height() / 5
        }, 600); //this value is how many ms it takes for transitions
     
    }
}

function moveHighlight(fromid, toid, callback) {
    //first, erase the highlight from the previous chord

    $("#chordNumber" + fromid).removeClass("highlightedchord");
    $("#chordNumber" + toid).addClass("highlightedchord");
    callback();
}


function moveLyricHighlight(fromid, toid, callback) {
toid=parseInt(toid);
fromid=parseInt(fromid);

    if (currentSong != 'index'){
	    fromidString = "lyricNumber" + fromid;
	    toidString= "lyricNumber" + toid;
	    
	    //clean up the old one
	    if ((fromid>toid) || (Math.abs(fromid-toid)>1)){//going backwards
			//    $("#" + fromidString).removeClass("highlightedlyric");
                $("#" + fromidString).removeClass("underlinedlyric");

	    	}
	    else{
			    $("#" + fromidString).removeClass("underlinedlyric");
    	} 

			    $("#" + toidString).addClass("highlightedlyric");
			    $("#" + toidString).addClass("underlinedlyric");
               
				if (Math.abs(($("#lyricNumber" + (toid+1)).offset().top) -($(window).height() / 5) -(fontSizepx *1.25) - $(document).scrollTop())>(fontSizepx/2)) { //if the next lyric is on a new line, pre-scroll it.
					currentScroll=$("#lyricNumber" + (toid)).offset().top;
			        var scrollnext=((lyricTimings[toid+1]-lyricTimings[toid])*1000*speedMultiplier)-900;
			        if (scrollnext<0){scrollnext=0;}
			        setTimeout(function(){

			        $('html,body').animate({
			            scrollTop: ($("#lyricNumber" + (toid+1)).offset().top - $(window).height() / 5) -(fontSizepx *1.25) 
			        }, 600); //this value is how many ms it takes for transitions
			        	
		        	},scrollnext);
			    
			    }
					        
		        
		        
	
	}
    callback();
}




function nudgeChord(increment) {
    //move the active chord given a value relative to the current chord
    var newPos = currentChord + increment;
    if (newPos < 0) {
        newPos = lastPos;
    }
    if (newPos > lastPos) {
        newPos = 0;
    }
    sendChord(newPos)
}


function nudgeLyric(increment) {
    //move the active chord given a value relative to the current chord
    var newPos = currentLyric + increment;
    if (newPos < 1) {
        newPos = 1;
    }
    if (newPos > lastLyric) {
        newPos = lastLyric;
    }
    sendLyric(newPos)
}


//***************** EMITTERS **********************
function sendChord(whichchord){
    socket.emit('id', { data: whichchord }); //A or D key was tapped
    if (playerMode=="editor" && document.getElementById('audioplayer').paused ==true && chordTimings[whichchord]!=null) {//rewind or fast forward
    		document.getElementById('audioplayer').currentTime = chordTimings[whichchord];} 

}

function sendLyric(whichLyric){
    socket.emit('lid', { data: whichLyric }); //J or L key was tapped
}


function changeSong(whichsong){
    socket.emit('currentSong', { data: whichsong}); //User clicked a song or return to index link
}

function jumpToChord(whichchord) { //jump a chord given an integer value that corresponds with a chord's div id
	if (playerMode=="singalong"){//playback mode.  This chunk of code triggers lyrics

        if (whichchord<currentChord){				        
        for (i = 0; i < lyricTimeouts[currentChord].length; i++) {
					clearTimeout(lyricTimeouts[currentChord][i]);
				}
		}
				
        else{
					var currentChordTimeStamp = new Date();
					speedMultiplier = ((currentChordTimeStamp-prevChordTimeStamp)/((chordTimings[currentChord + 1] - chordTimings[currentChord])*1000));
					//console.log(speedMultiplier);
					if (speedMultiplier>0.33 && speedMultiplier<3){
						triggerLyrics(whichchord,speedMultiplier);
					}else{
						triggerLyrics(whichchord,1);//reset the speed multiplier to 1 since there's bad data, for a variety of reasons
					}
					prevChordTimeStamp = new Date();
				}
        }
 
    moveHighlight(currentChord, whichchord, function(){ //implemented as a callback theoretically to reduce mobile browser choppiness on the animation
        if (karaokeMode==false){goToByScroll("chordNumber" + currentChord, "chordNumber" +whichchord);}
        currentChord = parseInt(whichchord);
    });
  
}


function jumpToLyric(whichLyric) { //jump a lyric given an integer value that corresponds with a lyric's div id
    moveLyricHighlight(currentLyric, whichLyric, function(){ //implemented as a callback theoretically to reduce mobile browser choppiness on the animation
        //goToByScroll(fromcolorname, toColorName);
    currentLyric = parseInt(whichLyric);

    });
}



function sendMod(increment){
    totalModulation += increment;
    socket.emit('totmod', { data: totalModulation });
    socket.emit('mod', { data: increment});
}

function sendFlat(){
    socket.emit('flat', { data: "swap"});
}

function modulateChord(increment) {
    //Modulate all of the chords up or down a half step depending on variable stepdirection.  Guesses if the notation should be sharp or flat as well
    var chordNum; //div value when cycling through
    var toColorName;
    var cellSaid;
    var chordBase;
    var chordSharp = 0;
    var chordFlat = 0;
    var chordType;
    var chordVal = 0;
    var minChord = /[A-G](#|b)*(m(?!aj))/;

    for (chordNum = 1; chordNum <= lastPos - 1; chordNum = chordNum + 1) {//run through all the chords
        toColorName = "chordNumber" + chordNum;
        cellSaid = $("#" + toColorName).html();
        chordVal = detchordVal(cellSaid); //read the chords from the div cells and assign a numerical value to base tone
        chordVal = (chordVal + increment)%12; //increase or decrease value
        //if (chordVal == 13) {
        //    chordVal = 1;
        //    }
        if (chordVal == 0) {
            chordVal = 12;
        }
        /*!
        Makes a guess at if chords should be represented as sharp or flat.
        It does so by looking at each of the chords in the new key, and pretends for a moment
        each one is the key the song has been transposed to.  If a majority of the candidate key signatures require
        are flat key signatures, the program guesses and assumes it's a flat key.  It usually works for Western
        compositions.  Assuming I haven't deluded myself.
        */
        if (cellSaid.match(minChord)) {
            chordType = "minor";
        } else {
            chordType = "major";
        } //determine minor or major
        if (chordVal == 1) { //A
            if (chordType == "major") {
                chordSharp = chordSharp + 1;
            }
            //Am is natural
        }
        if (chordVal == 2) { //Bb
            {
                chordFlat = chordFlat + 1;
            }
            //both M and m are flat
        }
        if (chordVal == 3) { //B
            {
                chordSharp = chordSharp + 1;
            }
            //both B and Bm are sharp
        }
        if (chordVal == 4) { //C
            if (chordType == "minor") {
                chordFlat = chordFlat + 1;
            }
            //Cm is flat, C is natural
        }
        if (chordVal == 5) { //Db slash C#
            if (chordType == "major") {
                chordFlat = chordFlat + 1;
            }
            if (chordType == "minor") {
                chordSharp = chordSharp + 1;
            }
            //Db is flat C#m is sharp
        }
        if (chordVal == 6) { //D
            if (chordType == "major") {
                chordSharp = chordSharp + 1;
            }
            if (chordType == "minor") {
                chordFlat = chordFlat + 1;
            }
            //D is sharp, Dm is flat
        }
        if (chordVal == 7) { //Eb
            if (chordType == "major") {
                chordFlat = chordFlat + 1;
            }
            //Eb is flat, D#m/#Ebm both have five sharps/flats, boyee.  So don't lean either way.
        }
        if (chordVal == 8) { //E
            chordSharp = chordSharp + 1;
            //both E and Em are sharp
        }
        if (chordVal == 9) { //F
            chordFlat = chordFlat + 1;
            //both F and Fm are flat
        }
        if (chordVal == 10) { //F#/Gb
            if (chordType == "minor") {
                chordSharp = chordSharp + 1;
            }
            //F#m is sharp F#/Gb both have five sharps/flats, so in that case, don't lean either way.
        }
        if (chordVal == 11) { //G
            if (chordType == "major") {
                chordSharp = chordSharp + 1;
            }
            if (chordType == "minor") {
                chordFlat = chordFlat + 1;
            }
            //G is sharp, Gm is flat
        }
        if (chordVal == 12) { //Ab /G#m
            if (chordType == "major") {
                chordFlat = chordFlat + 1;
            }
            if (chordType == "minor") {
                chordSharp = chordSharp + 1;
            }
            //Ab is flat, G#m is sharp
        }
    }
    if (chordFlat > chordSharp) {
        SongInFlatKey = 1;
    }
    else{SongInFlatKey = 0;}
rewriteChord(increment);
}

function rewriteChord(increment) {
    //run through the divs and change the values.  Looks at the global variable SongInFlatKey.
    var chordNum; //div value when cycling through
    var toColorName;
    var cellSaid; //what does the data retrieved from the <SPAN> say </SPAN>
    var chordVal;
    var chordBase;

    for (chordNum = 1; chordNum <= lastPos - 1; chordNum = chordNum + 1) {
        toColorName = "chordNumber" + chordNum;
        cellSaid = $("#" + toColorName).html();
        chordVal = detchordVal(cellSaid); //read the chords from the div cells and assign a numerical value to base tone
        chordVal = (chordVal + increment)%12;
        //if (chordVal == 13) {
        //    chordVal = 1;
        //}

        if (chordVal == 0) {
            chordVal = 12;
        }
        var secondPart = "";
        cellSaid.match(/[A-G](#|b){0,1}(\w*)/); //
        secondPart = (RegExp.$2); //
        if (chordVal == 1) { //A
            chordBase = "A";
        }
        if (chordVal == 2) { //Bb slas A#
            if ((SongInFlatKey == 1 &&  swapFlat==0) || (SongInFlatKey == 0 && swapFlat==1)) {
                chordBase = "Bb";
            } else {
                chordBase = "A#";
            }
        }
        if (chordVal == 3) { //B
            chordBase = "B";
        }
        if (chordVal == 4) { //C
            chordBase = "C";
        }
        if (chordVal == 5) { //Db slash C#
            if ((SongInFlatKey == 1 &&  swapFlat==0) || (SongInFlatKey == 0 && swapFlat==1)) {
                chordBase = "Db";
            } else {
                chordBase = "C#";
            }
        }
        if (chordVal == 6) { //D
            chordBase = "D";
        }
        if (chordVal == 7) { //Eb slash D#
            if ((SongInFlatKey == 1 &&  swapFlat==0) || (SongInFlatKey == 0 && swapFlat==1)) {
                chordBase = "Eb";
            } else {
                chordBase = "D#";
            }
        }
        if (chordVal == 8) { //E
            chordBase = "E";
        }
        if (chordVal == 9) { //F
            chordBase = "F";
        }
        if (chordVal == 10) { //Gb slash F#
            if ((SongInFlatKey == 1 &&  swapFlat==0) || (SongInFlatKey == 0 && swapFlat==1)) {
                chordBase = "Gb";
            } else {
                chordBase = "F#";
            }
        }
        if (chordVal == 11) { //G
            chordBase = "G";
        }
        if (chordVal == 12) { //Ab slash G#
            if ((SongInFlatKey == 1 &&  swapFlat==0) || (SongInFlatKey == 0 && swapFlat==1)) {
                chordBase = "Ab";
            } else {
                chordBase = "G#";
            }
        }
        $("#" + toColorName).html(chordBase + secondPart); //write
    }
}

function detchordVal(chordname) {
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
    if (chordNum == 0) {
        chordNum = 12;
    }
    return chordNum;
}


function compileTimings(){
	var i;
	var j;
     
     
    //prepare the array called lyricOffsets for use auto-highlighting lyrics
	for (i = 0; i < chordTimings.length; i++) {
		lyricOffsets[i]=[];
		if (chordTimings[i] != null){

			for (j = 0; j < lyricTimings.length; j++) { //inefficient.  cycle through all timings to find the ones after the current chord.
				if (lyricTimings[j] != null &&  ( (lyricTimings[j] >= chordTimings[i])&& (lyricTimings[j] < chordTimings[i+1])) || (lyricTimings[j] >= chordTimings[i])&& (chordTimings[i+1]==null)){
					lyricOffsets[i].push([Math.round((parseFloat(lyricTimings[j]) - parseFloat(chordTimings[i]))*1000)/1000,j]); 
				}
			}
		}
	}
}


function playAudio(){
	var i;
	var j;


	compileTimings();
	
	
	//read chord and lyrics timings out of arrays and auto-play the lyrics.
	for (i = 0; i < chordTimings.length; i++) {
		if ((chordTimings[i] != null) && (chordTimings[i] - document.getElementById('audioplayer').currentTime>=-0.1)){
			    (function(i){
			    chordTimeouts[i] = setTimeout(function(){
				if (chordsArmed==false){jumpToChord(i);}
				triggerLyrics(i,1);
				},(chordTimings[i]-document.getElementById('audioplayer').currentTime)*1000);
				})(i);
		}
	}
		
		


	document.getElementById('audioplayer').play();

}

function pauseAudio(){
    document.getElementById('audioplayer').pause()
	for (i = 0; i < chordTimings.length; i++) {
	    clearTimeout(chordTimeouts[i]);
	}
	compileTimings();
	
}


function triggerLyrics(chordnum,multiplier){
var i=0;
lyricTimeouts[chordnum]=[];
            if (lyricOffsets[chordnum]!=null){
				lyricOffsets[chordnum].forEach(function(name){
					i++;
					lyricTimeouts[chordnum][i]=	setTimeout(function(){jumpToLyric(name[1]);},name[0]*1000*multiplier);
				});
			}
}


function sendJSON(){
var myList = [
    {lyricTimings:lyricTimings, chordTimings:chordTimings}
];
            socket.emit('timings', { lyricOffsets: lyricOffsets, chordTimings:chordTimings, lyricTimings:lyricTimings}); //reset the flat/sharp override


}



function editorMode(){
if (document.getElementById('audioplayer').error ==null){
	$('#editorbutton').css( "fontWeight", "bold" );	
	$('#singalongbutton').css( "fontWeight", "normal" );	
	$('#editorbutton').css( "color", "black" );	
	$('#singalongbutton').css( "color", "grey" );	
	playerMode="editor";
	$('.editor').show( "1000" );
     for (i = 0; i < chordTimings.length; i++) {
		if (chordTimings[i] != null){
		    $("#chordNumber" + i).addClass("recorded");
		 }  
	 }
     for (i = 0; i < lyricTimings.length; i++) {
		if (lyricTimings[i] != null){
		    $("#lyricNumber" + i).addClass("recorded");
		 }  
	 }




}else{alert ('ERROR: Could not load ' + currentSong + '.mp3');}

}

function singalongMode(){
	pauseAudio();
	$('#editorbutton').css( "fontWeight", "normal" );	
	$('#singalongbutton').css( "fontWeight", "bold" );	
	$('#editorbutton').css( "color", "grey" );	
	$('#singalongbutton').css( "color", "black" );	
	playerMode="singalong";
	$('.editor').hide( "1000" );	
     for (i = 0; i < chordTimings.length; i++) {
		if (chordTimings[i] != null){
		    $("#chordNumber" + i).removeClass("recorded");
		 }  
	 }
     for (i = 0; i < lyricTimings.length; i++) {
		if (lyricTimings[i] != null){
		    $("#lyricNumber" + i).removeClass("recorded");
		 }  
	 }



}

function armLyrics(){
	if (document.getElementById('audioplayer').paused ==true){
		lyricsArmed ^=true;
		if (lyricsArmed==true){
			$('#armlyricsbutton').css( "color", "red" );
		}else{$('#armlyricsbutton').css( "color", "black" );}
	}
}


function armChords(){
	if (document.getElementById('audioplayer').paused ==true){

		chordsArmed ^=true;
		if (chordsArmed==true){
			$('#armchordsbutton').css( "color", "red" );
		}else{$('#armchordsbutton').css( "color", "black" );
		}

	}

}

