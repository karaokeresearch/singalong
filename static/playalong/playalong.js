(function (root) {

	var playalong = {};
	var playQueue = [];
	
	playalong.init = function (sock) {
	var socket=sock;

	setInterval(function () { //the queue
		while ((playQueue.length>0) &&(playQueue[0][1] - ntp.serverTime() <500)){//although it's tested every 250 ms, we can schedule up to 500ms away.
			
			if (playQueue[0][0] ==="chordChange"){
				(function (){
					var whatsnext=playQueue[0][2];
					setTimeout(function (){
						changeChord(whatsnext);
					}, (playQueue[0][1] - ntp.serverTime()));
				}());
			}
			
			playQueue.shift();
		}
	},250);
	
				
	socket.on('bClientQueue', function (data) { //listen for chord change requests
			if (data.itemType==="chordChange"){
				playQueue.push(["chordChange", parseInt(data.nextChange)-playalong.lagOffset,data.nextChord])
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


			if (data.message==="startCount"){
			//alert(data.number);
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
