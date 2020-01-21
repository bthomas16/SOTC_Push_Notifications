const express = require('express');
const { Expo }  = require('expo-server-sdk');
const config = require('./config.js');
const isDev = process.env.NODE_ENV !== 'production';

let port = process.env.PORT || 3000;

const app = express();
const expo = new Expo();

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
    if (isDev) {
        AWS.config.update(config.aws_local_config);
      } else {
        AWS.config.update(config.aws_remote_config);
      }

    const { token, useremail, isAcceptingPushNotifications, ownerId } = req.body;

    saveToken(token);
    console.log(`Received push token, ${token}`);
    res.send(`Received push token, ${token}`);
});

app.post('/message', (req, res) => {
    if (isDev) {
        AWS.config.update(config.aws_local_config);
      } else {
        AWS.config.update(config.aws_remote_config);
    }

    const { message } = req.body;


    handlePushTokens(message);
    console.log(`Received message, ${message}`);
    res.send(`Received message, ${message}`);
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`));