
var chordRegex = /^(([A-G](#|b)?(M|maj|m|min|\+|add|sus|mM|aug|dim|dom|flat)?[0-9]{0,2})|\s)+$/;
var justChordRegex=/([A-G](#|b)?(M|maj|m|min|\+|add|sus|mM|aug|dim|dom|flat)?[0-9]{0,2})/;
var sectionRegex = /(^[^\s]*?:\s*$)/;


var songLines=[];
var chords=[]; //chord index, array containing [distanceToNextChord, distanceToNextLine]
var longestLine=0

var printPage=function(){
	
	var h="" //html to print
	var chordNumber=0;	
	
	for (var i=0; i <songLines.length; i++){
		
		

	if (songLines[i].lineType=="chord"){
				 h +='<div class="chordLine">';
				 
				 var chordSplit=[];
				 var thisLine=songLines[i].line;
				 chordSplit=thisLine.split(/(\s)/);
				 var linePos=0;
				 for (var j=0; j<chordSplit.length;j++){ //go through each chord on this line.
					 if (chordSplit[j].match(/\w/)){ // it's an actual Chord					 	
					  h += '<a href="' + chordNumber+ '">' +chordSplit[j] +'</a>';	
					 	chordNumber++;
					 	}
					 	else if (chordSplit[j].match(/\s/)){
					 		h += '&nbsp';
					  }
					 	
					 	
				 linePos+=chordSplit[j].length;
				 }
			h +='</div>';
			}	
		
		if (songLines[i].lineType=="section"){
			 h +='<div class="sectionLine">';
	  	 h +='<b>' + songLines[i].line.replace(/\s/g, '&nbsp;')  + '</b>';
	  	 h +='</div>';
	  }
		
		if (songLines[i].lineType=="lyrics"){
			 h +='<div class="lyricLine">';
	  	h +=songLines[i].line.replace(/\s/g, '&nbsp;');
	  	 h +='</div>';
	  }
	
	if (songLines[i].lineType=="empty"){
			 h +='<div class="emptyLine"><br></div>';
	  }
	
	
	
	 var thisLine= songLines[i].line;
	 thisLine= thisLine.replace(/\s/g,"&nbsp;");
	 
	 //h += thisLine + "<br>";	
	}
	
	
	$( "#pageContainer" ).html( h ); 
}



$( document ).ready(function() {

	$.get( "/songs/test.txt", function( data ) {

	  
	  	longestLine=0;
			var lineType="unknown";
			
	  
	  
	  
	  
	  
	  var lines = data.split(/\n/); //split into lines
      
      
      for (var i =0; i<lines.length; i++){//determine which lines do what, also 
				
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
				songLines[i].line=lines[i].replace(/\s+$/,'');//strip trailing whitespace and add the line to songLines
				songLines[i].lineType=lineType;
      	console.log(i + "\t" +  songLines[i].lineType + "\t" + songLines[i].line);
      	lineType="unknown";
    	}// end for
 
 
 	var chordNumber=0;
  for (var i =0; i<songLines.length; i++){ //what chords exist and what line and position qualities do they hold?
			
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
  for (var i =0; i<songLines.length; i++){ //finally, let's add distance to next chord and distance to next line with chord info for predictive scroll purposes.
			
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
  $("#pageContainer").css('font-size', ((100/(longestLine+2))/0.6)+'vw')//auto-size, baybeee!! I'm so 2015.
	$("#pageContainer").html( "ready."); 
	 printPage();
	  
	  
	})//end get

});//end document ready