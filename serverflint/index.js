import {Client} from 'recastai'
import Flint from 'node-flint'
import webhook from 'node-flint/webhook'
import express from 'express'
import bodyParser from 'body-parser'
import axios from 'axios'
import uuid from 'uuid/v4'
import config from './config.json'
import businessgeo from './businessgeo'
import store from './store'

const app = express()
app.use(bodyParser.json())

const recastClient = new Client(config.recast, config.language)

const TROPO_URL_SESSION = "https://api.tropo.com/1.0/sessions"
const TROPO_TOKEN = "76706f5648414f4a44796444784773666f734a7073527a5477534276534b77496147585849564a4f6564656f";
const RANDOM_PHONE = ["+33663212960", "+33664624473"]

var storeHistory = {};

// init flint
const flint = new Flint(config)
flint.start()
console.log('Starting flint, please wait...')

flint.on('initialized', () => {
    console.log('Flint initialized successfully! [Press CTRL-C to quit]')
})

/***
 ## Process incoming messages
 ****/

flint.hears(/.*/, botAnalysis)

// Recast bot analysis
function botAnalysis(bot, trigger) {
    recastClient.textConverse(trigger.text, {conversationToken: trigger.roomId})
        .then((res) => {
            console.log('####################################################')
            console.log('####################################################')

            const reply = res.reply()
            const replies = res.replies
            const action = res.action
            const entities = res.entities
            const token = res.conversationToken

            // Store the conversation
            if (store[token] == undefined) {
                console.log('store id')
                store[token] = {}
                store[token].id = token
                store[token].name = trigger.personDisplayName
                store[token].state = false
            }

            // No replies
            if (!replies.length) {
                console.log('no replies')
                bot.say('Je ne comprends pas désolé %s :(', trigger.personDisplayName)
                return
            }
            if (!reply || !replies) {
                console.log('no replies')
                bot.say('Je ne comprends pas désolé %s :(')
                return
            }

            console.log('replies')
            console.log(res.entities)

            // Store entities
            entities.forEach(function (entity) {
                if (entity.name == 'job')
                    store[token].job = entity
                if (entity.name == 'location')
                    store[token].location = entity
            })

            // Got the information
            if (action && action.done) {
                console.log('action is done')

                // Get the nearest shop
                var near = businessgeo.findNearest(store[token].location.lng, store[token].location.lat, "chauffagiste");
                var str = JSON.stringify(near)
                console.log(str)
                bot.say(str)

                store[token].state = true
                // Do something if you need: use res.memory('notion') if you got a notion from this action
                // Store history and reset current store
                if (storeHistory[token] == undefined) {
                    storeHistory[token] = []
                }
                storeHistory[token].push(store[token])
                store[token] = undefined;
            }

            replies.forEach(reply => bot.say(reply))
            console.log('END')
        })
        .catch((e) => {
            console.log(e)
            bot.say('%s, J\'ai pas compris', trigger.personDisplayName)
        })
}

/****
 ## Server config & housekeeping
 ****/

app.post('/', webhook(flint))

// Tropo handler
app.post('/tropo', function (req, res) {
    var roomId = req.body.roomId;
    var text = req.body.text;
    var callerId = "+" + req.body.callerId;
    var clientCallerParams = {action: "create", token: TROPO_TOKEN, phonenumber: callerId}
    var artisanCallParams = {action: "create", token: TROPO_TOKEN}

    recastClient.textConverse(text)
        .then(function (res) {

            // Get Properties
            const reply = res.reply()
            const replies = res.replies
            const action = res.action
            const entities = res.entities
            const token = res.conversationToken

            // No replies
            if (!replies.length) {
                clientCallerParams.initialText = "Le service ne comprends pas votre demande"
                responseGet(TROPO_URL_SESSION, clientCallerParams)
                return
            }
            if (!reply || !replies) {
                clientCallerParams.initialText = "Le service ne comprends pas votre demande"
                responseGet(TROPO_URL_SESSION, clientCallerParams)
                return
            }

            // Store entities
            var job, location, datetime;
            entities.forEach(function (entity) {
                if (entity.name == 'job')
                    job = entity
                if (entity.name == 'location')
                    location = entity
                if(entity.name =='datetime')
                    datetime = entity
            })

            if (location == undefined) {
                clientCallerParams.initialText = "Le service ne parvient pas a determiner l emplacement de l intervention"
                responseGet(TROPO_URL_SESSION, clientCallerParams)
                return
            }
            if (job == undefined) {
                clientCallerParams.initialText = "Le service ne parvient pas a determiner l artisan que vous recherchez"
                responseGet(TROPO_URL_SESSION, clientCallerParams)
                return
            }
            if (datetime == undefined) {
                clientCallerParams.initialText = "Le service ne parvient pas a determiner l horaire d intervention"
                responseGet(TROPO_URL_SESSION, clientCallerParams)
                return
            }

            // Got the information
            if (action && action.done) {
                var uid = uuid()
                console.log(uid)
                store[uid] = {}
                store[uid].state = false

                // Get the nearest shop
                var nearShop = businessgeo.findNearest(location.lng, location.lat, "chauffagiste");
                // Fake Phone
                nearShop.properties.telephone = RANDOM_PHONE[Math.floor(Math.random()*RANDOM_PHONE.length)];

                // Notify client
                // clientCallerParams.initialText = "Nous avons identifie la societe: " + nearShop.properties.denomination +
                //     ". Nous vous communiquerons sa reponse. " + config.webhookUrl + "/index.html?id=" + uid
                clientCallerParams.initialText = "Le service est en train de rechercher un artisan " + job.raw.toUpperCase()
                responseGet(TROPO_URL_SESSION, clientCallerParams)


                // Notify Artisan
                artisanCallParams.phonenumber = nearShop.properties.telephone
                artisanCallParams.initialText = "Vous avez une nouvelle demande. \n " + config.webhookUrl + "/index.html?id=" + uid
                responseGet(TROPO_URL_SESSION, artisanCallParams)

                store[uid].clientPhone = clientCallerParams.phonenumber
                store[uid].artisantPhone = artisanCallParams.phonenumber
                store[uid].client = {location: location, ask: text, job: job, datetime: datetime}
                store[uid].artisan = nearShop
            }
            console.log('end')
            // Do your code
        }).catch(function (err) {
            console.log(err)
    })
})

app.get('/commandid', function(req, res){
    var id = req.query.id
    res.json(store[id])
})

// Static content
app.use(express.static('public'));

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

// AJAX Post
function responsePost() {
    axios.post(url, {
        params: params
    })
        .then(function (response) {
            console.log("success");
        })
        .catch(function (error) {
            console.log(error);
        });
}

const server = app.listen(config.port, () => {
    flint.debug('Flint listening on port %s', config.port)
})


// gracefully shutdown (ctrl-c)
process.on('SIGINT', () => {
    flint.debug('stoppping...')
    server.close()
    flint.stop().then(() => {
        process.exit()
    })
})
