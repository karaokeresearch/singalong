(function (root) {

	var playalong = {};
	playalong.playQueue = [];
	playalong.playing=false;
	playalong.calibrating=false;
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


	setInterval(function () { //the queue
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
				startPlaying();	
			}
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

			}


			if (data.message==="startCount"){//start the calibration procedure.
				if (playalong.calibrating===false){
					playalong.calibrating=true;
					document.getElementById("console").innerHTML ='<span>Calibration mode activated</span>';
					document.getElementById("calibrate").innerHTML =data.number;	



    		calibrateInterval=setInterval(function () { //demo: add items to the queue once a second
    			var count=(Math.round(ntp.serverTime()/1000)%4 )+1;
    		
					playalong.playQueue.push(["calibrate", ntp.serverTime() + 1000-(ntp.serverTime()%1000) +1000 -playalong.lagOffset,count])
    		},1000);
    

		

				}
			}


	});





	$.getJSON("/ua", function (data) {
		playalong.lagOffset= data.lag;
		playalong.lagScore= data.score;
	});


		
};

				



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
