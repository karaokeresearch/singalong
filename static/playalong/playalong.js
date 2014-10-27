(function (root) {

	var playalong  = {};
	
	playalong.init = function (sock) {
		
		
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
