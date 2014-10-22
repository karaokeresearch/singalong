(function (root) {

	var playalong  = {};
	
	playalong.init = function (sock) {

	};

	playalong.fingerStrum = function () {
	$( "#content" ).load( "nonsense.html", function() {
  	//load was performed
		});
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
