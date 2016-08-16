
var express = require('express');
var bodyParser = require('body-parser');
var request = require('request');
var app = express();

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
//app.listen((process.env.PORT || 3000));

function ChatServer() {

    // ***************************************************************************
    // Express routes helpers
    // ***************************************************************************

    // init phrase store
    var tasks = [];

    var taskCount = 0;

    var self = this;

    var convoCount = 0;
    // init phrase store
    self._lexicon = [];

    function Conversation(task, message) {

        this.messages = [];
        this.sent = [];
        this.transcript = [];

        this.events = {};

        this.vars = {};

        this.topics = {};
        this.topic = null;

        this.status = 'new';
        this.task = task;
        this.source_message = message;
        this.handler = null;
        this.responses = {};
        this.capture_options = {};
        this.startTime = new Date();
        this.lastActive = new Date();

        this.capture = function (response) {
            var capture_key = this.sent[this.sent.length - 1].text;

            response.text = response.text.trim();

            if (this.capture_options.key) {
                capture_key = this.capture_options.key;
            }

            // capture the question that was asked
            // if text is an array, get 1st
            if (typeof(this.sent[this.sent.length - 1].text) == 'string') {
                response.question = this.sent[this.sent.length - 1].text;
            } else {
                response.question = this.sent[this.sent.length - 1].text[0];
            }

            if (this.capture_options.multiple) {
                if (!this.responses[capture_key]) {
                    this.responses[capture_key] = [];
                }
                this.responses[capture_key].push(response);
            } else {
                this.responses[capture_key] = response;
            }

        };

        this.handle = function (message) {

            this.lastActive = new Date();
            this.transcript.push(message);

            // do other stuff like call custom callbacks
            if (this.handler) {
                console.log('I am in the part of execution of the call back function');

                this.capture(message);

                // if the handler is a normal function, just execute it!
                // NOTE: anyone who passes in their own handler has to call
                // convo.next() to continue after completing whatever it is they want to do.
                if (typeof(this.handler) == 'function') {
                    console.log('call back function for ask has been excuted!');
                    this.handler(message, this);
                } else {
                    // handle might be a mapping of keyword to callback.
                    // lets see if the message matches any of the keywords
                    var match, patterns = this.handler;
                    //for (var p = 0; p < patterns.length; p++) {
                    //	if (patterns[p].pattern && botkit.hears_test([patterns[p].pattern], message)) {
                    //		patterns[p].callback(message, this);
                    //		return;
                    //	}
                    //}

                    // none of the messages matched! What do we do?
                    // if a default exists, fire it!
                    for (var p = 0; p < patterns.length; p++) {
                        if (patterns[p].default) {
                            patterns[p].callback(message, this);
                            return;
                        }
                    }

                }
            } else {
                // do nothing
            }
        };

        this.activate = function () {
            this.status = 'active';
        };

        /**
         * active includes both ACTIVE and ENDING
         * in order to allow the timeout end scripts to play out
         **/
        this.isActive = function () {
            return (this.status == 'active' || this.status == 'ending');
        };

        this.deactivate = function () {
            this.status = 'inactive';
        };

        this.say = function (message) {
            console.log("-----you have added message to messsages----");
            this.addMessage(message);
        };

        this.sayFirst = function (message) {
            if (typeof(message) == 'string') {
                message = {
                    text: message,
                    room: this.source_message.room,
                };
            } else {
                message.room = this.source_message.room;
            }
            this.messages.unshift(message);
        };


        this.on = function (event, cb) {

            var events = event.split(/\,/g);
            for (var e in events) {
                if (!this.events[events[e]]) {
                    this.events[events[e]] = [];
                }
                this.events[events[e]].push(cb);
            }
            return this;
        };

        this.trigger = function (event, data) {
            if (this.events[event]) {
                for (var e = 0; e < this.events[event].length; e++) {
                    var res = this.events[event][e].apply(this, data);
                    if (res === false) {
                        return;
                    }
                }
            } else {
            }
        };

        // proceed to the next message after waiting for an answer
        this.next = function () {
            this.handler = null;
        };

        this.repeat = function () {
            if (this.sent.length) {
                this.messages.push(this.sent[this.sent.length - 1]);
            } else {
                // console.log('TRIED TO REPEAT, NOTHING TO SAY');
            }
        };

        this.silentRepeat = function () {
            return;
        };

        this.addQuestion = function (message, cb, capture_options, topic) {
            if (typeof(message) == 'string') {
                message = {
                    text: message,
                    room: this.source_message.room
                };
            } else {
                message.room = this.source_message.room;
            }

            if (capture_options) {
                message.capture_options = capture_options;
            }

            message.handler = cb;
            this.addMessage(message, topic);
        };


        this.ask = function (message, cb, capture_options) {
            this.addQuestion(message, cb, capture_options, this.topic || 'default');
        };

        this.addMessage = function (message, topic) {
            if (!topic) {
                topic = this.topic;
            }
            if (typeof(message) == 'string') {
                message = {
                    text: message,
                    room: this.source_message.room,
                };
            } else {
                message.room = this.source_message.room;
            }

            if (!this.topics[topic]) {
                this.topics[topic] = [];
            }
            this.topics[topic].push(message);

            // this is the current topic, so add it here as well
            if (this.topic == topic) {
                this.messages.push(message);
            }
        };

        this.changeTopic = function (topic) {
            this.topic = topic;

            if (!this.topics[topic]) {
                this.topics[topic] = [];
            }
            this.messages = this.topics[topic].slice();

            this.handler = null;
        };

        this.combineMessages = function (messages) {
            if (!messages) {
                return '';
            }
            ;
            if (messages.length > 1) {
                var txt = [];
                var last_user = null;
                var multi_users = false;
                last_user = messages[0].user;
                for (var x = 0; x < messages.length; x++) {
                    if (messages[x].user != last_user) {
                        multi_users = true;
                    }
                }
                last_user = '';
                for (var x = 0; x < messages.length; x++) {
                    if (multi_users && messages[x].user != last_user) {
                        last_user = messages[x].user;
                        if (txt.length) {
                            txt.push('');
                        }
                        txt.push('<@' + messages[x].user + '>:');
                    }
                    txt.push(messages[x].text);
                }
                return txt.join('\n');
            } else {
                if (messages.length) {
                    return messages[0].text;
                } else {
                    return messages.text;
                }
            }
        };

        this.getResponses = function () {

            var res = {};
            for (var key in this.responses) {

                res[key] = {
                    question: this.responses[key].length ?
                        this.responses[key][0].question : this.responses[key].question,
                    key: key,
                    answer: this.extractResponse(key),
                };
            }
            return res;
        };

        this.getResponsesAsArray = function () {

            var res = [];
            for (var key in this.responses) {

                res.push({
                    question: this.responses[key].length ?
                        this.responses[key][0].question : this.responses[key].question,
                    key: key,
                    answer: this.extractResponse(key),
                });
            }
            return res;
        };


        this.extractResponses = function () {

            var res = {};
            for (var key in this.responses) {
                res[key] = this.extractResponse(key);
            }
            return res;
        };

        this.extractResponse = function (key) {
            return this.combineMessages(this.responses[key]);
        };

        this.replaceTokens = function (text) {

            var vars = {
                identity: this.task.bot.identity,
                responses: this.extractResponses(),
                origin: this.task.source_message,
                vars: this.vars,
            };

            var rendered = '';

            try {
                rendered = mustache.render(text, vars);
            } catch (err) {
                //botkit.log('Error in message template. Mustache failed with error: ', err);
                rendered = text;
            }
            ;

            return rendered;
        };

        this.stop = function (status) {
            this.handler = null;
            this.messages = [];
            this.status = status || 'stopped';
            //botkit.debug('Conversation is over!');
            this.task.conversationEnded(this);
        };

        this.tick = function () {
            var now = new Date();

            if (this.isActive()) {
                if (this.handler) {
                    // check timeout!
                    // how long since task started?
                    var duration = (now.getTime() - this.task.startTime.getTime());
                    // how long since last active?
                    var lastActive = (now.getTime() - this.lastActive.getTime());

                    if (this.task.timeLimit && // has a timelimit
                        (duration > this.task.timeLimit) && // timelimit is up
                        (lastActive > this.task.timeLimit) // nobody has typed for 60 seconds at least
                    ) {

                        if (this.topics.timeout) {
                            this.status = 'ending';
                            this.changeTopic('timeout');
                        } else {
                            this.stop('timeout');
                        }
                    }
                    // otherwise do nothing
                } else {
                    if (this.messages.length) {
                        if (typeof(this.messages[0].timestamp) == 'undefined' ||
                            this.messages[0].timestamp <= now.getTime()) {
                            var message = this.messages.shift();
                            //console.log('HANDLING NEW MESSAGE',message);
                            // make sure next message is delayed appropriately
                            if (this.messages.length && this.messages[0].delay) {
                                this.messages[0].timestamp = now.getTime() + this.messages[0].delay;
                            }
                            if (message.handler) {
                                //console.log(">>>>>> SET HANDLER IN TICK");
                                this.handler = message.handler;
                            } else {
                                this.handler = null;
                                //console.log(">>>>>>> CLEARING HANDLER BECAUSE NO HANDLER NEEDED");
                            }
                            if (message.capture_options) {
                                this.capture_options = message.capture_options;
                            } else {
                                this.capture_options = {};
                            }

                            this.sent.push(message);
                            this.transcript.push(message);
                            this.lastActive = new Date();

                            if (message.text || message.attachments) {

                                this.task.bot.say(message, this.source_message);
                            }
                            if (message.action) {
                                if (typeof(message.action) == 'function') {
                                    message.action(this);
                                } else if (message.action == 'repeat') {
                                    this.repeat();
                                } else if (message.action == 'wait') {
                                    this.silentRepeat();
                                } else if (message.action == 'stop') {
                                    this.stop();
                                } else if (message.action == 'timeout') {
                                    this.stop('timeout');
                                } else if (this.topics[message.action]) {
                                    this.changeTopic(message.action);
                                }
                            }
                        } else {
                            //console.log('Waiting to send next message...');
                        }

                        // end immediately instad of waiting til next tick.
                        // if it hasn't already been ended by a message action!
                        if (this.isActive() && !this.messages.length && !this.handler) {
                            this.status = 'completed';
                            //botkit.debug('Conversation is over!');
                            this.task.conversationEnded(this);
                        }

                    } else if (this.sent.length) { // sent at least 1 message
                        this.status = 'completed';
                        //botkit.debug('Conversation is over!');
                        this.task.conversationEnded(this);
                    }
                }
            }
        };

        //botkit.debug('CREATED A CONVO FOR', this.source_message.user, this.source_message.channel);
        this.changeTopic('default');
    };

    function Task(bot, message) {

        this.convos = [];
        this.bot = bot;

        this.events = {};
        this.source_message = message;
        this.status = 'active';
        this.startTime = new Date();

        this.isActive = function () {
            return this.status == 'active';
        };

        this.startConversation = function (message) {
            var convo = new Conversation(this, message);
            convo.id = convoCount++;

            convo.activate();
            this.convos.push(convo);
            this.trigger('conversationStarted', [convo]);
            return convo;
        };

        this.conversationEnded = function (convo) {
            this.trigger('conversationEnded', [convo]);
            convo.trigger('end', [convo]);
            var actives = 0;
            for (var c = 0; c < this.convos.length; c++) {
                if (this.convos[c].isActive()) {
                    actives++;
                }
            }
            if (actives == 0) {
                this.taskEnded();
            }

        };

        this.endImmediately = function (reason) {

            for (var c = 0; c < this.convos.length; c++) {
                if (this.convos[c].isActive()) {
                    this.convos[c].stop(reason || 'stopped');
                }
            }

        };

        this.taskEnded = function () {

            this.status = 'completed';
            this.trigger('end', [this]);

        };

        this.on = function (event, cb) {

            var events = event.split(/\,/g);
            for (var e in events) {
                if (!this.events[events[e]]) {
                    this.events[events[e]] = [];
                }
                this.events[events[e]].push(cb);
            }
            return this;
        };

        this.trigger = function (event, data) {
            if (this.events[event]) {
                for (var e = 0; e < this.events[event].length; e++) {
                    var res = this.events[event][e].apply(this, data);
                    if (res === false) {
                        return;
                    }
                }
            } else {

            }
        };


        this.getResponsesByUser = function () {

            var users = {};

            // go through all conversations
            // extract normalized answers
            for (var c = 0; c < this.convos.length; c++) {

                var user = this.convos[c].source_message.user;
                users[this.convos[c].source_message.user] = {};
                var convo = this.convos[c];
                users[user] = convo.extractResponses();
            }

            return users;

        };

        this.getResponsesBySubject = function () {
            var answers = {};

            // go through all conversations
            // extract normalized answers
            for (var c = 0; c < this.convos.length; c++) {
                var convo = this.convos[c];

                for (var key in convo.responses) {
                    if (!answers[key]) {
                        answers[key] = {};
                    }
                    answers[key][convo.source_message.user] = convo.extractResponse(key);
                }
            }

            return answers;
        };

        this.tick = function () {

            for (var c = 0; c < this.convos.length; c++) {
                if (this.convos[c].isActive()) {
                    this.convos[c].tick();
                }
            }
        };
    };

    function find_conversation(message) {
        for (var t = 0; t < tasks.length; t++) {
            for (var c = 0; c < tasks[t].convos.length; c++) {
                if (
                    tasks[t].convos[c].isActive() &&
                    tasks[t].convos[c].source_message.room == message.room
                ) {
                    // modify message text to prune off the bot's name (@bot hey -> hey)
                    // and trim whitespace that is sometimes added
                    // this would otherwise happen in the handleSlackEvents function
                    // which does not get called for messages attached to conversations.

                    if (message.text) {
                        message.text = message.text.trim();
                    }

                    tasks[t].convos[c].handle(message);
                    return;
                }
            }
        }
    }

    function check_match(tests, message) {
        for (var t = 0; t < tests.length; t++) {
            if (message.text) {

                // the pattern might be a string to match (including regular expression syntax)
                // or it might be a prebuilt regular expression
                var test;
                if (typeof(tests[t]) == 'string') {
                    test = new RegExp(tests[t], 'i');
                } else {
                    test = tests[t];
                }

                if (match = message.text.match(test)) {
                    //message.match = match;
                    return true;
                }
            }
        }
        return false;
    }

    function process_hear(message) {

        self._lexicon.forEach(function (lex) {
            if (check_match(lex.phrase, message) && typeof lex.action === 'function') {
                lex.action(message);
            }
        });
    }

    // ***************************************************************************
    // Facebook Webhook
    // ***************************************************************************
    // Start bot
    app.listen(process.env.PORT || 3000, function () {
        console.log('bot started');

        self.tickInterval = setInterval(function() {
            self.tick();
        }, 1000);
    });

    // Server frontpage
    app.get('/', function (req, res) {
        res.send('This is TestBot Server');
    });

    app.get('/webhook', function (req, res) {
        if (req.query['hub.verify_token'] === 'testbot_verify_token') {
            res.send(req.query['hub.challenge']);
        } else {
            res.send('Invalid verify token');
        }
    });

    // handler receiving messages
    app.post('/webhook', function (req, res) {
        var events = req.body.entry[0].messaging;
        for (i = 0; i < events.length; i++) {
            var event = events[i];
            if (event.message && event.message.text) {
                message = {
                    text: event.message.text,
                    room: event.sender.id
                };
                //processEvent(event);
                process_hear(message);
                find_conversation(message);
            } else if(event.postback) {
                payload = event.postback.payload;
                if(payload === 'yes') {
                    sendMessage(event.sender.id, {text: "What's your phone number (I promise I won't share :wink:?"});
                }
            }
        }

        res.sendStatus(200);
    });

    self.startTask = function (message, cb) {


        var task = new Task(this, message);

        task.id = taskCount++;

        var convo = task.startConversation(message);

        tasks.push(task);

        if (cb) {
            cb(task, convo);
        } else {
            return task;
        }

    };

    self.tick = function () {
        for (var t = 0; t < tasks.length; t++) {
            tasks[t].tick();
        }

        for (var t = tasks.length - 1; t >= 0; t--) {
            if (!tasks[t].isActive()) {
                tasks.splice(t, 1);
            }
        }
    };

    //say to reply
    self.say = function (objAns, message) {

        var recipientId = message.room;

        var new_message = {text:objAns.text};

        request({
            url: 'https://graph.facebook.com/v2.6/me/messages',
            qs: {access_token: process.env.PAGE_ACCESS_TOKEN},
            method: 'POST',
            json: {
                recipient: {id: recipientId},
                message: new_message,
            }
        }, function(error, response, body) {
            if (error) {
                console.log('Error sending message: ', error);
            } else if (response.body.error) {
                console.log('Error: ', response.body.error);
            }
        });
    };

    //self.tickInterval = setInterval(function() {
    //    self.tick();
    //}, 1000);
}

// add action to be performed when bot hears a phrase
ChatServer.prototype.hears = function(phrase, action) {
    var self = this;

    // parse args
    var args = Array.prototype.slice.call(arguments);
    phrase = args.shift();
    action = args.pop();

    if (typeof(phrase) == 'string') {
        phrase = [phrase];
    }

    self._lexicon.push({'phrase': phrase, 'action': action });
};

ChatServer.prototype.startConversation = function(message, cb) {
    this.startTask(message, function(task, convo) {
        cb(null, convo);
    });
};

module.exports = ChatServer
