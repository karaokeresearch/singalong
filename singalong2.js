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
      var lines = data.split(/\s*\n/); //split into lines and strip trailing spaces as well
      
      
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
      		lineType="regular";
      	}
				

				songLines[i]={};
				songLines[i].line=lines[i];
				songLines[i].lineType=lineType;
      	console.log(i + "\t" +  songLines[i].lineType + "\t" + songLines[i].line);
      	lineType="unknown";
    	}// end for
 
 
 	var chordNumber=0;
  for (var i =0; i<songLines.length; i++){ //what chords exist?
			
			if (songLines[i].lineType=="chord"){
				 var chordSplit=[];
				 var thisLine=songLines[i].line;
				 chordSplit=thisLine.split(/(\s)/);
				 var linePos=0;
				 for (var j=0; j<chordSplit.length;j++){ //go through each chord on this line.
					 if (chordSplit[j].match(/\w/)){ // it's an actual Chord					 	
					 	chords[chordNumber]={};
					 	chords[chordNumber]={'chord': chordSplit[j], 'line': i, 'linePos': linePos};
					 	//console.log(chordSplit[j], linePos);
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


