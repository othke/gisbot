/**
 * Created by OTHOMAS on 11/12/2016.
 */
const TROPO_URL_SESSION = "https://api.tropo.com/1.0/sessions"
const TROPO_TOKEN = "76706f5648414f4a44796444784773666f734a7073527a5477534276534b77496147585849564a4f6564656f";

var CLIENT_URL = "/commandid?id="
var id;
var commandDescription;
var map

$(document).ready(init)

// Init app
function init() {

    // Get id
    try {
        var idString = decodeURIComponent(window.location.search.substring(1))
        id = idString.split('=')[1]
    }
    catch (e) {
        console.log(e)
    }
    var url = CLIENT_URL + id
    axios.get(url).then(function (response) {
        commandDescription = response.data

        // Set Accept action
        $('#btnAccept').click(function () {
            var message = "La societe: \"" + commandDescription.artisan.properties.denomination + "\" vous prend en charge"
            var clientCallerParams = {
                action: "create",
                token: TROPO_TOKEN,
                phonenumber: commandDescription.clientPhone,
                initialText: message
            }

            axios.get(TROPO_URL_SESSION, {
                params: clientCallerParams
            })
                .then(function (response) {
                    console.log("success");
                    alert("Le client est informé de la prise en charge")
                    $('#btnAccept').hide()
                    $('#btnReject').hide()
                    window.location.replace("./home.html");
                })
                .catch(function (error) {
                    console.log(error);
                });
        })

        // Set Reject action
        $('#btnReject').click(function () {
            window.location.replace("./home.html");
        })

        // Set customer info
        $('#customerPhone').append("<strong>Téléphone du client: </strong><br>" + commandDescription.clientPhone)
        $('#customerAddress').append("<strong>Adresse du client: </strong><br>" + commandDescription.client.location.formatted)
        $('#customerRequest').append("<strong>Demande du client: </strong><br>" + commandDescription.client.ask)

        // Add client marker
        var latlng = [commandDescription.client.location.lat, commandDescription.client.location.lng]
        L.marker(latlng).addTo(map)
        map.setView(latlng, 19);
    })

    // Init Map
    map = L.map('map').fitWorld();

    L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpandmbXliNDBjZWd2M2x6bDk3c2ZtOTkifQ._QA7i5Mpkd_m30IGElHziw', {
        maxZoom: 19,
        id: 'mapbox.streets'
    }).addTo(map)


    // map.on('locationfound', onLocationFound);
    // map.on('locationerror', onLocationError);
    //map.locate({setView: true, maxZoom: 18});

}

// function onLocationFound(e) {
//     var radius = e.accuracy / 2;
//
//     L.marker(e.latlng).addTo(map)
//         .bindPopup("You are within " + radius + " meters from this point").openPopup();
//
//     L.circle(e.latlng, radius).addTo(map);
// }

// function onLocationError(e) {
//     alert(e.message);
// }

// AJAX Get
function responseGet(url, params) {
    axios.get(url, {
        params: params
    })
        .then(function (response) {
            console.log("success");
        })
        .catch(function (error) {
            console.log(error);
        });
}