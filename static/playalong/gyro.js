/**
 * A JavaScript project for accessing the accelerometer and gyro from various devices
 *
 * @author Tom Gallacher <tom.gallacher23@gmail.com>
 * @copyright Tom Gallacher <http://www.tomg.co>
 * @version 0.0.1a
 * @license MIT License
 * @options frequency, callback
 */
(function (root, factory) {
		if (typeof define === 'function' && define.amd) {
				// AMD. Register as an anonymous module.
				define(factory);
		} else if (typeof exports === 'object') {
				// Node. Does not work with strict CommonJS, but
				// only CommonJS-like enviroments that support module.exports,
				// like Node.
				module.exports = factory();
		} else {
				// Browser globals (root is window)
				root.gyro = factory();
	}
}(this, function () {
	var measurements = {
				x: null,
				y: null,
				z: null,
				alpha: null,
				beta: null,
				gamma: null
			},
			calibration = {
				x: 0,
				y: 0,
				z: 0,
				alpha: 0,
				beta: 0,
				gamma: 0
			},
			interval = null,
			features = [];

	var gyro = {};

	/**
	 * @public
	 */
	gyro.frequency = 500; //ms

	gyro.calibrate = function() {
		for (var i in measurements) {
			calibration[i] = (typeof measurements[i] === 'number') ? measurements[i] : 0;
		}
	};

	gyro.getOrientation = function() {
		return measurements;
	};

	gyro.startTracking = function(callback) {
		interval = setInterval(function() {
			callback(measurements);
		}, gyro.frequency);
	};

	gyro.stopTracking = function() {
		clearInterval(interval);
	};

	/**
	 * Current available features are:
	 * MozOrientation
	 * devicemotion
	 * deviceorientation
	 */
	gyro.hasFeature = function(feature) {
		for (var i in features) {
			if (feature == features[i]) {
				return true;
			}
		}
		return false;
	};

	gyro.getFeatures = function() {
		return features;
	};


	/**
	 * @private
	 */
	// it doesn't make sense to depend on a "window" module
	// since deviceorientation & devicemotion make just sense in the browser
	// so old school test used.
	if (window && window.addEventListener) {
		function setupListeners() {
			function MozOrientationInitListener (e) {
				features.push('MozOrientation');
				e.target.removeEventListener('MozOrientation', MozOrientationInitListener, true);

				e.target.addEventListener('MozOrientation', function(e) {
					measurements.x = e.x - calibration.x;
					measurements.y = e.y - calibration.y;
					measurements.z = e.z - calibration.z;
				}, true);
			}
			function deviceMotionListener (e) {
				features.push('devicemotion');
				e.target.removeEventListener('devicemotion', deviceMotionListener, true);
				
				e.target.addEventListener('devicemotion', function(e) {
					measurements.x = e.acceleration.x - calibration.x;
					measurements.y = e.acceleration.y - calibration.y;
					measurements.z = e.acceleration.z - calibration.z;
				}, true);
			}
			function deviceOrientationListener (e) {
				features.push('deviceorientation');
				e.target.removeEventListener('deviceorientation', deviceOrientationListener, true);
				
				e.target.addEventListener('deviceorientation', function(e) {
					measurements.alpha = e.alpha - calibration.alpha;
					measurements.beta = e.beta - calibration.beta;
					measurements.gamma = e.gamma - calibration.gamma;
				}, true);
			}

			window.addEventListener('MozOrientation', MozOrientationInitListener, true);
			window.addEventListener('devicemotion', deviceMotionListener, true);
			window.addEventListener('deviceorientation', deviceOrientationListener, true);
		}
		setupListeners();
	}

	return gyro;
}));
