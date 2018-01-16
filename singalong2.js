const express = require('express')
const app = express()
var fs = require("fs");
var chordRegex = /^(([A-G](#|b)?(M|maj|m|min|\+|add|sus|mM|aug|dim|dom|flat)?[0-9]{0,2})|\s)+$/;
var justChordRegex=/([A-G](#|b)?(M|maj|m|min|\+|add|sus|mM|aug|dim|dom|flat)?[0-9]{0,2})/;
var sectionRegex = /(^[^\s]*?:\s*$)/;


var songFile = './songs/test.txt';
var songLines=[];
var chords=[]; //chord index, array containing [distanceToNextChord, distanceToNextLine]
var longestLine=0

fs.readFile(songFile, 'utf8', function (err, data) {
	longestLine=0;
	var songData;
	var lineType="unknown";
  if (err) {
      console.log('Error: ' + err);
  } else {
      var lines = data.split(/\n/); //split into lines and strip trailing spaces as well
      
      
      for (var i =0; i<lines.length; i++){//determine which lines do what
				
				if (longestLine<lines[i].length){longestLine=lines[i].length;} //we need to determine this so we can size the fonts later
      	if (lines[i].match(chordRegex)){
      		if (lines[i].match(justChordRegex)){
      			lineType = "chord";
      		}else {lineType="empty";}
      	}
      	else if (lines[i].match(sectionRegex)){
      		lineType = "section";
      	} else {
      		
      		if (lines[i].match(/\w/)){lineType="lyrics";} else{lineType="empty"}
      	}
				

				songLines[i]={};
				songLines[i].line=lines[i];
				songLines[i].lineType=lineType;
      	console.log(i + "\t" +  songLines[i].lineType + "\t" + songLines[i].line);
      	lineType="unknown";
    	}// end for
 
 
 	var chordNumber=0;
  for (var i =0; i<songLines.length; i++){ //what chords exist and white line and position qualities do they hold?
			
			if (songLines[i].lineType=="chord"){
				 var chordSplit=[];
				 var thisLine=songLines[i].line;
				 chordSplit=thisLine.split(/(\s)/);
				 var linePos=0;
				 for (var j=0; j<chordSplit.length;j++){ //go through each chord on this line.
					 if (chordSplit[j].match(/\w/)){ // it's an actual Chord					 	
					 	chords[chordNumber]={};
					 	chords[chordNumber]={'chord': chordSplit[j], 'line': i, 'linePos': linePos};
					 
					 	chordNumber++;
					 	}
				 linePos+=chordSplit[j].length;
				 }
			
			}
	} 


 	var chordNumber=0;
  for (var i =0; i<songLines.length; i++){ //finally, let's add distance to next chord and distance to next line with chord.
			
			if (songLines[i].lineType=="chord"){
				 var chordSplit=[];
				 var thisLine=songLines[i].line;
				 chordSplit=thisLine.split(/(\s)/);
				 var linePos=0;
				 for (var j=0; j<chordSplit.length;j++){ //go through each chord on this line.
					 if (chordSplit[j].match(/\w/)){ // it's an actual Chord					 	
						if (chordNumber+1<chords.length && chords[chordNumber].line!= chords[chordNumber+1].line){//last chord of line. We need to calculate distance to next chord and next line with chord. Skip the last line
							var distanceSoFar=0;
							//console.log(chords[chordNumber].line+1, "-",chords[chordNumber+1].line);
							for (var k = chords[chordNumber].line+1; k< chords[chordNumber+1].line; k++){ //check the intervening lines to see if they're lyrics lines and add their length if so
							 
							  if (songLines[k].lineType=="lyrics"){
								 	
								 	if (k-chords[chordNumber].line==1){//it's the next line (we're above a lyric line), so don't count any characters that happened so far.
								 		distanceSoFar+= songLines[k].line.length-chords[chordNumber].linePos;
								 	}else{//they're lines without chord lines above. Count the whole line
								 		distanceSoFar+= songLines[k].line.length;
								  }
							 	
							 	
							 	}
							 
							
							}
							chords[chordNumber].distanceToNextLine=distanceSoFar;
							
							distanceSoFar+=chords[chordNumber+1].linePos; //and add the distance the next chord is out from the left
							chords[chordNumber].distanceToNextChord=distanceSoFar;
						}else {//Not last chord of line. The next chord is one the same line. Just count over how many characters until the next one.
							if (chordNumber+1<chords.length){//not the last chord
								chords[chordNumber].distanceToNextChord= chords[chordNumber+1].linePos-chords[chordNumber].linePos;;
							}
						}
						
					 	//chords[chordNumber]={'chord': chordSplit[j], 'line': i, 'linePos': linePos};
					 	
					 	chordNumber++;
					 	}
				 linePos+=chordSplit[j].length;
				 }
			
			}
	} 




  console.log(chords);
  console.log("longest line:", longestLine);
  }//not an error
});






//app.get('/', (req, res) => res.send('Hello World!'))

//app.listen(8080, () => console.log('Singalong listening on port 8080.'))


