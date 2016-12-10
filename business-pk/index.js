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

var nearest;
var randomAdresses = fs.readFileSync('./data/112data.geojson');
randomAdresses = JSON.parse(randomAdresses);
var peopleFound=[];
			
function findNearest(lat,lg,service_name)
{
	for(var i=0; i<randomAdresses.features.length; i++){
	if(undefined != (randomAdresses.features[i].properties.libelle) && (randomAdresses.features[i].properties.libelle).localeCompare(service_name)==0)
		{
			peopleFound.push(randomAdresses.features[i]);
		}		
	}
	console.log(peopleFound.length);
	var point = turf.point([lat, lg]);
	var fc = turf.featurecollection(peopleFound);
	nearest = turf.nearest(point, fc );
}
/****testing function****/
findNearest(2,40,"chauffagiste");
console.log(nearest);




//var feature_collection = turf.featurecollection(randomAdresses);
//var fc = turf.featurecollection(randomAdresses);
/*var point = turf.point([-97.522259, 35.469100], {
    "uid": "#8E8E8E",
    "title": "Determining Point"
});
var nearest = turf.nearest(point, fc);
console.log(nearest);*/