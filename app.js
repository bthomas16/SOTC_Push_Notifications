const express = require('express');
const { Expo } = require('expo-server-sdk');
// const Handlers = require('./Handlers/NotificationHandlers');
// const isDev = process.env.NODE_ENV !== 'production';
const AWS = require('aws-sdk');
const isDev = false;
const uuid = require('uuid/v1');
const config = {
    aws_table_name: 'fruitsTable',
    aws_local_config: {
        region: 'local',
        endpoint: 'http://localhost:3000'
    },
    aws_remote_config: {
        accessKeyId: '',
        secretAccessKey: '',
        region: 'us-east-2',
    }
};

let port = process.env.PORT || 3000;

const app = express();
const expo = new Expo();

app.use(express.json());

app.get('/', (req, res) => res.sendFile(__dirname + '/Views/PushHome.html'));
app.get('/CustomPushNotification', (req, res) => res.sendFile(__dirname + '/Views/CustomPushNotification.html'));
app.get('/PushSubscribersDetails', (req, res) => res.sendFile(__dirname + '/Views/PushSubscribersDetails.html'));
app.get('/WOTDPushNotification', (req, res) => res.sendFile(__dirname + '/Views/WOTDPushNotification.html'));

const scanParams = {
    TableName: 'PushToken-npgjtlybgnfk7cxn6jgxihw7w4-local'
}

// const saveToken = (tokenData, db) => {
    
// }

// const sendWOTDPushNotification = (db) => {
    
// }

// const sendCustomPushNotification = (pushData, db) => {
//     console.log('sending custom data', pushData);
    
// }

// const getUserPushTokenDetails = (db) => {
//     return 
// }

app.post('/token', (req, res) => {
    AWS.config.update(config.aws_remote_config);

    
    const tokenData = req.body;
    tokenData.id = uuid();
    
    const params = {
        TableName: 'PushToken-npgjtlybgnfk7cxn6jgxihw7w4-local',
        Item: tokenData
    };
    
    const db = new AWS.DynamoDB.DocumentClient();
    db.scan(scanParams, (err, data) => {
        if (err) {
            res.send({
                success: false,
                message: 'Unable to scan db for existing push tokens',
                errMessage: err
            });
        };

        const existingPushTokens = data.Items;
        const sameToken = existingPushTokens.filter(existingToken => existingToken.token === tokenData.token);
        if (!sameToken.length) {
            db.put(params, (err, data) => {
                if (err) {
                    console.log('Unable to save item in table:', params.TableName, token, err)
                    res.send({
                        success: false,
                        message: 'Error: Server error saving push token',
                        errMessage: err
                    });
                } else {
                    res.send({
                        success: true,
                        message: 'Success: Saved push token successfully',
                        data: data
                    });
                }
            });
        }
    });
});

app.post('/sendWOTDPushNotification', (req, res) => {
    // if (isDev) {
    //     AWS.config.update(config.aws_local_config);
    //   } else {
    AWS.config.update(config.aws_remote_config);
    // }
    const db = new AWS.DynamoDB.DocumentClient();

    db.scan(scanParams, (err, data) => {
        if (err) {
            res.send({
                success: false,
                message: 'Unable to find WOTD Push Notification tokens to send',
                errMessage: err
            })
        }
        const pushTokenObjects = data.Items;
        for (let pushToken of pushTokenObjects) {
           if (!Expo.isExpoPushToken(pushToken.token)) {
               console.error(`Push token ${pushToken} is not a valid Expo push token`);
               continue;
           }
           let notifications = [];
           notifications.push({
               to: pushToken.token,
               sound: 'default',
               title: 'Your WOTD is Ready!',
               // body: message,
           })
   
           let chunks = expo.chunkPushNotifications(notifications);
           (() => {
               for (let chunk of chunks) {
                   try {
                       let receipts = expo.sendPushNotificationsAsync(chunk);
                       console.log(receipts);
                   } catch (error) {
                       console.error(error);
                   }
               }
           })();
        };
        res.send({
            success: true,
            message: 'Successfully sent WOTD push notifications'
        });
    });
});

app.post('/sendCustomPushNotification', (req, res) => {
    AWS.config.update(config.aws_remote_config);

    const db = new AWS.DynamoDB.DocumentClient();

    const pushData = req.body

    db.scan(scanParams, (err, data) => {
        if (err) {
            res.send({
                success: false,
                message: 'Unable to find WOTD Push Notification tokens to send',
                errMessage: err
            })
        }
        const pushTokenObjects = data.Items;
        for (let pushToken of pushTokenObjects) {
           if (!Expo.isExpoPushToken(pushToken.token)) {
               console.error(`Push token ${pushToken} is not a valid Expo push token`);
               continue;
           }

           let notifications = [];
           notifications.push({
               to: pushToken.token,
               sound: pushData.sound,
               title: pushData.title,
               body: pushData.body,
               message: pushData.message,
               // data: pushData.data // needs to be an object
           })
   
           let chunks = expo.chunkPushNotifications(notifications);
           (() => {
               for (let chunk of chunks) {
                   try {
                       let receipts = expo.sendPushNotificationsAsync(chunk);
                       console.log('receipts', receipts);
                   } catch (error) {
                       console.error(error);
                   }
               }
           })();
        };
        res.send({
            success: true,
            message: 'Successfully sent Custom WOTD push notifications'
        });
    });
});

app.get('/getUserPushTokenDetails', (req, res) => {
    // if (isDev) {
    //     AWS.config.update(config.aws_local_config);
    //   } else {
    AWS.config.update(config.aws_remote_config);
    // }
    const db = new AWS.DynamoDB.DocumentClient();

    db.scan(scanParams, (err, data) => {
        if (err) {
            res.send({
                success: false,
                message: 'Unable to find WOTD Push Notification tokens to send',
                errMessage: err
            })
        }
        console.log('help me help you', data)
        res.send(data);
    });
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`));