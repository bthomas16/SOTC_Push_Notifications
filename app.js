const express = require('express');
const { Expo }  = require('expo-server-sdk');
const AWS = require('aws-sdk');
let port = process.env.PORT || 3000;

const app = express();
const expo = new Expo();

const PUSH_REGISTRATION_ENDPOINT = 'http://ddf558bd.ngrok.io/token';
const MESSAGE_ENPOINT = 'http://ddf558bd.ngrok.io/message';

let savedPushTokens = [];
const saveToken = (token) => {
    if (savedPushTokens.indexOf(token === -1)) {
        console.log(token)
        savedPushTokens.push(token);
    }
  }

const handlePushTokens = (message) => {
    let notifications = [];
    for (let pushToken of savedPushTokens) {
        if (!Expo.isExpoPushToken(pushToken)) {
        console.error(`Push token ${pushToken} is not a valid Expo push token`);
        continue;
        }
        notifications.push({
            to: pushToken,
            sound: 'default',
            title: 'Message received!',
            body: message,
            data: { message }
        })

        let chunks = expo.chunkPushNotifications(notifications);
        (async () => {
            for (let chunk of chunks) {
                try {
                    let receipts = await expo.sendPushNotificationsAsync(chunk);
                    console.log(receipts);
                } catch (error) {
                    console.error(error);
                }
            }
        })();
    };
}

app.use(express.json());

app.get('/', (req, res) => res.send('Push Notification Service is Running!'));

app.post('/token', (req, res) => {
    saveToken(req.body.token.value);
    console.log(`Received push token, ${req.body.token.value}`);
    res.send(`Received push token, ${req.body.token.value}`);
});


app.post('/message', (req, res) => {
    handlePushTokens(req.body.message);
    console.log(`Received message, ${req.body.message}`);
    res.send(`Received message, ${req.body.message}`);
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`));