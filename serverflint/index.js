import {Client} from 'recastai'
import Flint from 'node-flint'
import webhook from 'node-flint/webhook'
import express from 'express'
import bodyParser from 'body-parser'
import config from './config.json'
import uuidV4 from 'uuid/v4'

const app = express()
app.use(bodyParser.json())

const recastClient = new Client(config.recast, config.language)

var store = {};
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

flint.hears(/.*/, (bot, trigger) => {
    recastClient.textConverse(trigger.text, {conversationToken: trigger.roomId})
        .then((res) => {
            const reply = res.reply()
            const replies = res.replies
            const action = res.action
            const entities = res.entities
            const token = res.conversationToken

            // No replies
            if (!replies.length) {
                bot.say('Je ne comprends pas désolé %s :(', trigger.personDisplayName)
            }
            if (!reply || !replies) {
                bot.say('Je ne comprends pas désolé %s :(')
            } else {

                // Start conversation
                if(action.reply == 'Quel type de professionnel cherchez-vous ?'){

                    // Store the conversation
                    if(store[token] == undefined){
                        console.log('store id')
                        store[token] = {}
                        store[token].id = token
                        store[token].name = trigger.personDisplayName
                        store[token].state = false
                    }
                }

                // Store entities
                if(entities.length > 0){
                    // Store job entities
                    if(entities[0].name == 'job'){
                        store[token].job = entities[0].raw
                    }
                    // Store location entities
                    else if(entities[0].name == 'location'){
                        store[token].location = entities[0].raw
                    }
                }

                // Got the information
                if (action && action.done) {
                    console.log('action is done')
                    store[token].state = true
                    // Do something if you need: use res.memory('notion') if you got a notion from this action
                }

                // Store history and reset current store
                if(storeHistory[token] == undefined){
                    storeHistory[token] = []
                }
                storeHistory[token].push(store[token])
                store[token] = undefined;

                replies.forEach(reply => bot.say(reply))
            }
        })
        .catch((e) => {
            console.log(e)
            bot.say('%s, J\'ai pas compris', trigger.personDisplayName)
        })
})

/****
 ## Server config & housekeeping
 ****/

app.post('/', webhook(flint))

app.post('/tropo', function(req, res){
    res.send("ok")
})

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
