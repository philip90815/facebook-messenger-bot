var MessengerChatServer = require("./chatServer");
var chatServer = new MessengerChatServer();

chatServer.hears(['hello', 'hi'], function(message) {
    chatServer.say({text:'hi', room:'room'}, message);
});

chatServer.hears(['thanks', 'thank you'], function(message) {
    chatServer.say({text:'You are welcome'}, message);
});

chatServer.hears(['are you human', 'are you a chatServer', 'are you AI', 'are you ai'], function(message) {
    chatServer.say({text:'I\'m human assisted artificial intelligence, and I\'m learning to become a better team member, everyday! Let me know how I can help :)'}, message);
});

chatServer.hears(['how much does it cost','pricing','rates'], function(message) {
    chatServer.say({text:'Rates are dependent on project type. And we usually provide a fixed quote.'}, message);
});

//Pizza Module

chatServer.hears('pizzatime', function(message) {
    chatServer.startConversation(message, askFlavor);
});

askFlavor = function(response, convo) {
    convo.ask("What flavor of pizza do you want?", function(response, convo) {
        console.log("-----you should say awesome----");
        convo.say("Awesome.");
        askSize(response, convo);
        convo.next();
    });
}
askSize = function(response, convo) {
    convo.ask("What size do you want?", function(response, convo) {
        convo.say("Ok.")
        askWhereDeliver(response, convo);
        convo.next();
    });
}
askWhereDeliver = function(response, convo) {
    convo.ask("So where do you want it delivered?", function(response, convo) {
        convo.say("Ok! Goodbye.");
        convo.next();
    });
}

//function processEvent(event) {
//    text = event.message.text || "";
//    var values = text.split(' ');
//
//    if(values.length === 1 && values[0].toLowerCase() === 'hi') {
//        sendMessage(event.sender.id, {text: "Hey, I'm Dr. Buckley (full disclosure: I'm a chat bot :))\n How are you feeling today/tonight?"});
//    } else if (values.length === 2 && values[0].toLowerCase() === 'feeling' && (values[1].toLowerCase() === 'great' || values[1].toLowerCase() === 'good' || values[1].toLowerCase() === 'fine')) {
//        sendMessage(event.sender.id, {text: "Alright then, no Buckley's for you :smile: What are you doing here? Go outside, enjoy the sun!"});
//    } else if (text.toLowerCase() === 'i have a cough') {
//        sendMessage(event.sender.id, {text: "Oh, sorry to hear that. It's 8:26 pm right now so I suggest you take a drop of Buckley's Night Time Syrup. (PS. It tastes awful. And it works)."});
//    } else if (text.toLowerCase() === 'upsell heyday') {
//        message = {
//            "attachment": {
//                "type": "template",
//                "payload": {
//                    "template_type": "generic",
//                    "elements": [{
//                        "title": "Upsell Heyday",
//                        "subtitle": "If you want me to follow up with tips & tricks for your cough, I can text you every day to monitor your health until you feel better.",
//                        "buttons": [{
//                            "type": "postback",
//                            "title": "Yes please",
//                            "payload": "yes"
//                        }, {
//                            "type": "postback",
//                            "title": "No thanks",
//                            "payload": "no"
//                        }]
//                    }]
//                }
//            }
//        };
//
//        sendMessage(event.sender.id, message);
//    } else if (text.toLowerCase() === 'yes please') {
//        sendMessage(event.sender.id, {text: "What's your phone number (I promise I won't share :wink:?"});
//    }
//}

//// generic function sending messages
//function sendMessage(recipientId, message) {
//    request({
//        url: 'https://graph.facebook.com/v2.6/me/messages',
//        qs: {access_token: process.env.PAGE_ACCESS_TOKEN},
//        method: 'POST',
//        json: {
//            recipient: {id: recipientId},
//            message: message,
//        }
//    }, function(error, response, body) {
//        if (error) {
//            console.log('Error sending message: ', error);
//        } else if (response.body.error) {
//            console.log('Error: ', response.body.error);
//        }
//    });
//};

// send rich message with kitten
//function kittenMessage(recipientId, text) {
//
//    text = text || "";
//    var values = text.split(' ');
//
//    if (values.length === 3 && values[0] === 'kitten') {
//        if (Number(values[1]) > 0 && Number(values[2]) > 0) {
//
//            var imageUrl = "https://placekitten.com/" + Number(values[1]) + "/" + Number(values[2]);
//
//            message = {
//                "attachment": {
//                    "type": "template",
//                    "payload": {
//                        "template_type": "generic",
//                        "elements": [{
//                            "title": "Kitten",
//                            "subtitle": "Cute kitten picture",
//                            "image_url": imageUrl ,
//                            "buttons": [{
//                                "type": "web_url",
//                                "url": imageUrl,
//                                "title": "Show kitten"
//                            }, {
//                                "type": "postback",
//                                "title": "I like this",
//                                "payload": "User " + recipientId + " likes kitten " + imageUrl,
//                            }]
//                        }]
//                    }
//                }
//            };
//
//            sendMessage(recipientId, message);
//
//            return true;
//        }
//    }
//
//    return false;
//
//};