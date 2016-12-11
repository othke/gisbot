// This is a simple demonstration of how to use turfjs to process
// data with a node script. See the README.md file for full instructions
// on how to install node and run this script: these code comments will describe,
// in depth, how the script works.

// If you ran the installation instructions in README.md, you will have
// run an `npm install` command. This command downloads turf and puts it
// in a local folder called `node_modules`. You can include any of the
// files in the `node_modules` directory in another script by using the
// `require()` function, which takes the name of a module and returns
// an object of the things it exposes. For instance, when we call
// the following line, the variable `turf` becomes the turf library,
// including all of its component functions like `turf.extent` and
// `turf.buffer`
var turf = require('turf');
var fs = require('fs');

var randomAdresses = fs.readFileSync('../data/112data.geojson');
randomAdresses = JSON.parse(randomAdresses);

var exports = module.exports = {}
exports.data = randomAdresses

exports.findNearest = function (lat,lg,service_name)
{
	var nearest;
	var peopleFound = [];

	for(var i=0; i<randomAdresses.features.length; i++){
	if(undefined != (randomAdresses.features[i].properties.libelle) && (randomAdresses.features[i].properties.libelle).localeCompare(service_name)==0)
		{
			peopleFound.push(randomAdresses.features[i]);
		}		
	}
	var point = turf.point([lat, lg]);
	var fc = turf.featurecollection(peopleFound);
	nearest = turf.nearest(point, fc );
	return nearest
}
