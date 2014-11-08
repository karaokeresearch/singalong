(function (root) {

	var playalong = {};
	playalong.playQueue = [];
	playalong.playing=false;
	playalong.calibrating=false;
	playalong.serverMuted=false;
	playalong.sounds={};
	playalong.sounds.silence= new Howl({
				urls: ['../silence.wav'],
				autoplay: false,
				loop: false,
				volume: 1,
				});
	
	playalong.sounds.one = new Howl({
		urls: ['../one.wav']
	});
	playalong.sounds.two = new Howl({
		urls: ['../two.wav']
	});
	playalong.sounds.three = new Howl({
		urls: ['../three.wav']
	});
	playalong.sounds.four = new Howl({
		urls: ['../four.wav']
	});
				
				

	playalong.init = function (sock) {
	var socket=sock;

	playalong.loadIOS= function(){
		playalong.sounds.silence.play();
	}
	
	
	var muteAll=function(){
		Howler.volume(0);		
	}
	var unMuteAll=function(){
		if (playalong.serverMuted===false)
		Howler.volume(1);		
	}



	setInterval(function () { //the queue

	if (document.hidden){//phone screensaver engages or tab switched? Stop making any noise.
			muteAll();
		}else{
			unMuteAll();
		}

		
		while ((playalong.playQueue.length>0) &&(playalong.playQueue[0][1] - ntp.serverTime() <500)){//although it's tested every 250 ms, we can schedule up to 500ms away.
			
			if (playalong.playQueue[0][0] ==="chordChange"){
				(function (){
					var whatsnext=playalong.playQueue[0][2];
					setTimeout(function (){
						changeChord(whatsnext);
					}, (playalong.playQueue[0][1] - ntp.serverTime()));
				}());
			}

			if (playalong.playQueue[0][0] ==="calibrate"){
				(function (){
					var count=playalong.playQueue[0][2];
					setTimeout(function (){
						if (count===1){
							playalong.sounds.one.play();
						}
						if (count===2){
							playalong.sounds.two.play();
						}
						if (count===3){
							playalong.sounds.three.play();
						}
						if (count===4){
							playalong.sounds.four.play();
						}				
						
					}, (playalong.playQueue[0][1] - ntp.serverTime()));
				}());
			}
			
			playalong.playQueue.shift();
		}
	},250);
	
				
	socket.on('bClientQueue', function (data) { //listen for chord change requests
			if (data.itemType==="chordChange"){
				playalong.playQueue.push(["chordChange", parseInt(data.nextChange)-playalong.lagOffset,data.nextChord])
			}
	});

	
				
	socket.on('bUpdateLag', function (data) { //listen for chord change requests
		playalong.lagOffset= data.lag;
		playalong.lagScore= 1;
		Cookies.set('lag',data.lag)
		Cookies.set('score',1)		
	});

	
	
	
	
				
	socket.on('bCalibrate', function (data) { //listen for chord change requests

			if (data.message==="start"){
		    socket.emit('calibrationRegistry', {
			        ua: navigator.userAgent,
			        uuid: Cookies('uuid'),
			        lag: playalong.lagOffset,
			        score: playalong.lagScore
			  }); 

			}

			if (data.message==="stop"){
				playalong.calibrating=false;
				clearInterval(playalong.calibrateInterval);
				startPlaying();
				console.log("stopping calibration");
				document.getElementById("console").innerHTML = instructions;
				document.getElementById("calibrate").innerHTML ="";	

			}


			if (data.message==="startCount"){//start the calibration procedure.
				stopPlaying();
				if (playalong.calibrating===false){
					playalong.calibrating=true;
					document.getElementById("console").innerHTML ='<span>Calibration mode activated</span>';
					document.getElementById("calibrate").innerHTML =data.number;	

	    		playalong.calibrateInterval=setInterval(function () { //demo: add items to the queue once a second
						var serverTime=ntp.serverTime();
	    			var count=(Math.round((serverTime + 1000-(serverTime%1000) +1000 )/1000)%4 )+1;
	   				playalong.playQueue.push(["calibrate", (serverTime + 1000-(serverTime%1000) +1000) -playalong.lagOffset,count])
	   				//console.log(serverTime + " queueing a " + count+ " event at " + (serverTime + 1000-(serverTime%1000) +1000 ));
	    		},1000);
				}
			}
	});






	socket.on('bSelectedChord', function (data) { //should only happen at startup
		console.log("received bSelectedChord " + data.chord);
		changeChord(data.chord);
	});


	socket.on('bMute', function (data) { //server has asked you to mute svp
		if (data.mute===true){
			muteAll();
		}else{
			unMuteAll();
		}
	});










if (Cookies('lag') && Cookies('score') && Cookies('uuid')){
		playalong.lagOffset=parseInt(Cookies('lag'));
		playalong.lagScore=parseInt(Cookies('score'));		
}else{
	$.getJSON("/ua", function (data) {  //don't set these into a cookie until adjusted by server
		playalong.lagOffset= data.lag;
		playalong.lagScore= data.score;
		Cookies.set('uuid', data.uuid);
	});
}





		
};//end of init

				



	playalong.calibrate = function () {
	//load the calibrator

  };

	// AMD/requirejs
	if (typeof define === 'function' && define.amd) {
		define('playalong', [], function () {
			return playalong;
		});
	} else {
		root.playalong = playalong;
	}

})(window);
