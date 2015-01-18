(function (root) {

	var playalong = {};
	playalong.playQueue = [];
	playalong.playing=false;
	playalong.calibrating=false;
	playalong.focusMuted=false;
	playalong.serverMuted=false;
	playalong.isCalibrator=false;
	playalong.sounds={};
	playalong.preLoadDelay=0;

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


playalong.fullscreen = function(element) {
      if(document.documentElement.requestFullscreen) {
         document.documentElement.requestFullscreen();
      } else if(document.documentElement.webkitRequestFullscreen) {
         document.documentElement.webkitRequestFullscreen();
      } else if(document.documentElement.mozRequestFullScreen) {
         document.documentElement.mozRequestFullScreen();
      } else if(document.documentElement.msRequestFullscreen) {
         element.msRequestFullscreen();
      }
};


playalong.lockOrientation= function() {
			if (typeof screen.orientation !== "undefined" && screen.orientation.lock !== "undefined" ){
				screen.orientation.lock('portrait-primary');
			} else if(window.screen.lockOrientation){
				window.screen.lockOrientation('portrait-primary');
			} else if(window.screen.mozLockOrientation){
				window.screen.mozLockOrientation('portrait-primary');
			} else if (window.screen.msLockOrientation){
			window.screen.msLockOrientation('portrait-primary');
			} 
};


















	playalong.loadIOS= function(){
		var a=playalong.fullscreen();

		playalong.sounds.silence.play();

		playalong.lockOrientation();
	}
	
	
	var serverMute=function(){
		if (playalong.serverMuted===false && playalong.isCalibrator===false){
			Howler.volume(0);		
			}
		$("#console").html("REMOTELY MUTED. PLEASE STAND BY.");

	}
	
	var serverUnMute=function(){
		if (playalong.focusMuted===false){
			Howler.volume(1);
		}
		playalong.serverMuted=false;
		if (playalong.calibrating===true){
			$("#console").html('Calibration mode activated');
			$("#currentChord").css("visibility", "hidden");}else{
		$("#console").html(instructions);
		$("#currentChord").css("visibility", "visible");
		}

		
	}

	var focusMute=function(){
		Howler.volume(0);		
		playalong.focusMuted=true;
	}
	
	var focusUnMute=function(){
		if (playalong.serverMuted===false){
		Howler.volume(1);
		}
		playalong.focusMuted=false;
	}



	setInterval(function () { //the queue (scheduler)

	if (document.hidden){//phone screensaver engages or tab switched? Stop making any noise.
		focusMute();
	}
	
	if (document.hidden===false && playalong.focusMuted===true){
		focusUnMute();
	}

		
		while ((playalong.playQueue.length>0) &&(playalong.playQueue[0][1] - ntp.serverTime() <500)){//although it's tested every 250 ms, we can schedule up to 500ms away.
			
			if (playalong.playQueue[0][0] ==="chordChange"){
				(function (){
					var whatsnext=playalong.playQueue[0][2];
					setTimeout(function (){
						changeChord(whatsnext);
						playalong.currentChord=whatsnext;

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
		//console.log(data);
			if (data.itemType==="chordChange"){
			if (data.nextChange<=ntp.serverTime()){
				changeChord(data.nextChord);
				playalong.currentChord=data.nextChord;
				}//if timestamped in the past, don't wait 0.25sec to run
				else{			
				playalong.playQueue.push(["chordChange", (parseInt(data.nextChange)-playalong.lagOffset)-	playalong.preLoadDelay,data.nextChord])
			}
		}
			
	});

	
				
	socket.on('bUpdateLag', function (data) { //listen for chord change requests

		playalong.lagOffset= data.lag;
		playalong.lagScore= 1;
		Cookies.set('lag', data.lag, { expires: '01/01/2030' })
		Cookies.set('score', 1, { expires: '01/01/2030' })		
	});

	
	
	
	
				
	socket.on('bCalibrate', function (data) { //listen for calibration requests

			if (data.message==="start"){
		    socket.emit('calibrationRegistry', {
			        ua: navigator.userAgent,
			        uuid: Cookies('uuid'),
			        lag: playalong.lagOffset,
			        score: playalong.lagScore
			  }); 

			}

			if (data.message==="stop"){
				if(playalong.calibrating===true){
					playalong.calibrating=false;
					clearInterval(playalong.calibrateInterval);
					startPlaying();
					//console.log("Calibration off or stopped.");
					$("#console").html(instructions);
					$("#calibrate").html("");	
					$("#currentChord").css("visibility","visible");
				}
			}


			if (data.message==="startCount"){//start the calibration procedure.
				stopPlaying();
				if (playalong.calibrating===false){
					playalong.calibrating=true;
					$("#console").html('Calibration mode activated');
					$("#currentChord").css("visibility", "hidden");
					$("#calibrate").html(data.number);	

	    		playalong.calibrateInterval=setInterval(function () { //demo: add items to the queue once a second
						var serverTime=ntp.serverTime();
	
	
						var count=(Math.round((serverTime + 1000-(serverTime%1000) +1000 )/1000)%4 )+1;
	   				playalong.playQueue.push(["calibrate", (serverTime + 1000-(serverTime%1000) +1000) -playalong.lagOffset,count]);
		
			
	   				//console.log(serverTime + " queueing a " + count+ " event at " + (serverTime + 1000-(serverTime%1000) +1000 ));
	    		},1000);
				}
			}
	});






	socket.on('bSelectedChord', function (data) { //should only happen at startup
		//console.log("received bSelectedChord " + data.chord);
		changeChord(data.chord);
		playalong.currentChord=data.chord;
	});


	socket.on('bServerMute', function (data) { //server has asked you to mute svp
		if (data.serverMute===true){
			serverMute();
		}else{
			serverUnMute();
		}
	});







	
	
		$.getJSON("/ua", function (data) {  //don't set these into a cookie until adjusted by server
		
		if (Cookies('lag') && Cookies('score') && Cookies('uuid')){
				playalong.lagOffset=parseInt(Cookies('lag'));
				playalong.lagScore=parseInt(Cookies('score'));		
		}else{	
			playalong.lagOffset= data.lag;
			playalong.lagScore= data.score;
		}
			if (data.serverMuted===true){serverMute();}
			Cookies.set('uuid', data.uuid, { expires: '01/01/2030' });
		});
	



		
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
