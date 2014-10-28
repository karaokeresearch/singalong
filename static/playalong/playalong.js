(function (root) {

	var playalong  = {};
	
	playalong.init = function (sock) {
	var socket=sock;

	setInterval(function () { //the queue
		while ((playQueue.length>0) &&(playQueue[0][0] - ntp.serverTime() <500)){//although it's tested every 250 ms, we can schedule up to 500ms away.
			(function (){
				var whatsnext=playQueue[0][1];
				setTimeout(function (){
					changeChord(whatsnext);
				}, (playQueue[0][0] - ntp.serverTime()));
			}());
			playQueue.shift();
		}
	},250);
	
				
	socket.on('bnext', function (data) { //what's the next chord and when
			playQueue.push([parseInt(data.nextChange)-lagOverride,data.nextChord])
	});

		
	};

	playalong.calabrate = function () {
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
