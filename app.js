const express = require('express');
const { Expo } = require('expo-server-sdk');
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
const PUSH_TOKEN_TABLENAME = "PushToken-npgjtlybgnfk7cxn6jgxihw7w4-local";
const WATCH_TABLENAME = "Watch-npgjtlybgnfk7cxn6jgxihw7w4-local";

let port = process.env.PORT || 3000;

const app = express();
const expo = new Expo();

app.use(express.json());

app.get('/', (req, res) => res.sendFile(__dirname + '/Views/PushHome.html'));
app.get('/CustomPushNotification', (req, res) => res.sendFile(__dirname + '/Views/CustomPushNotification.html'));
app.get('/WOTDPushNotification', (req, res) => res.sendFile(__dirname + '/Views/WOTDPushNotification.html'));
app.get('/StillWearingWatchPushNotification', (req, res) => res.sendFile(__dirname + '/Views/StillWearingWatchPushNotification.html'));
app.get('/PushSubscribersDetails', (req, res) => res.sendFile(__dirname + '/Views/PushSubscribersDetails.html'));

app.post('/token', async (req, res) => {
    AWS.config.update(config.aws_remote_config);
    const db = new AWS.DynamoDB.DocumentClient();
    const tokenData = req.body;
    tokenData.id = uuid();

    try {
        const scanParams = {
            TableName: PUSH_TOKEN_TABLENAME
        };
        let data = await db.scan(scanParams).promise();
        const existingPushTokens = data.Items;
        const sameToken = existingPushTokens.filter(existingToken => existingToken.token === tokenData.token);
        if (!sameToken.length) {
            const saveParams = {
                TableName: PUSH_TOKEN_TABLENAME,
                Item: tokenData
            };
            try {
                let result = await db.put(saveParams).promise();
                if (result) {
                    res.json({
                        success: true,
                        message: 'Success: Saved push token successfully',
                        data: result
                    });
                }
            } catch (err) {
                res.json({
                    success: false,
                    message: 'Error: Server error saving push token',
                    errMessage: err.message
                });
            }
        }
    } catch (err) {
        res.json({
            success: false,
            message: 'Unable to scan db for existing push tokens',
            errMessage: err.message
        });
    }
});

app.post('/sendWOTDPushNotification', async (req, res) => {
    AWS.config.update(config.aws_remote_config);
    const db = new AWS.DynamoDB.DocumentClient();

    try {
        const params = {
            TableName: PUSH_TOKEN_TABLENAME
        };
        let data = await db.scan(params).promise();
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
               title: 'Your WOTD is Ready!'
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
               res.json({
                   success: true,
                   message: 'Successfully sent WOTD push notifications'
               });
           })();
        };

    } catch (err) {
        res.json({
            success: false,
            message: 'Unable to find WOTD Push Notification tokens to send',
            errMessage: err.message
        });
    }
});

app.post('/sendCustomPushNotification', async (req, res) => {
    AWS.config.update(config.aws_remote_config);
    const db = new AWS.DynamoDB.DocumentClient();
    const pushData = req.body;

    const params = {
        TableName: PUSH_TOKEN_TABLENAME
    };

    try {
        let data = await db.scan(params).promise();
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
               message: pushData.message
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
               res.json({
                    success: true,
                    message: 'Successfully sent Custom WOTD push notifications'
                });
           })();
        };
    } catch (err) {
        res.json({
            success: false,
            message: 'Unable to find WOTD Push Notification tokens to send',
            errMessage: err.message
        })   
    }
});

app.get('/getUserPushTokenDetails', async (req, res) => {
    AWS.config.update(config.aws_remote_config);
    const db = new AWS.DynamoDB.DocumentClient();

    const params = {
        TableName: PUSH_TOKEN_TABLENAME
    };

    try {
        let data = await db.scan(params).promise();
        res.json(data);
    } catch (err) {
        res.json({
            success: false,
            message: 'Unable to find WOTD Push Notification tokens to send',
            errMessage: err.message
        })
    }
});

app.post('/stillWearingWatchPushNotification', async (req, res) => {
    AWS.config.update(config.aws_remote_config);
    const db = new AWS.DynamoDB.DocumentClient();

    try { // get all watches current wearing for all users
        let notifications = [];
        const wearingStatus = true;
        const scanParams = {
            TableName: WATCH_TABLENAME,
            FilterExpression: 'isCurrentlyWearing = :w',
            ExpressionAttributeValues: {
                ':w': wearingStatus
            }
        };

        let watches = await db.scan(scanParams).promise();

        const watchesCurrentlyWearing = watches.Items;
        if (watchesCurrentlyWearing.length >= 1) {
            for (let watchWorn of watchesCurrentlyWearing) {
                let userId = watchWorn.owner;
                const params = {
                    TableName: PUSH_TOKEN_TABLENAME,
                    FilterExpression: 'userId = :u',
                    ExpressionAttributeValues: {
                        ':u': userId
                    }
                };
                try { // get push token for each user with a watch current wearing
                    let userPushData = await db.scan(params).promise();

                    if (userPushData.Items) {
                        let pushToken = await userPushData.Items[0].token;
                        notifications.push({
                            to: pushToken,
                            sound: 'default',
                            title: 'Are you still wearing:' + ' ' + watchWorn.name + '?',
                        })
                    }
                } catch (err) {
                    res.json({
                        success: false,
                        message: 'Unable to find User Push Token',
                        errMessage: err.message
                    })
                }     
            }
            let chunks = expo.chunkPushNotifications(notifications);
                (() => {
                    console.log('GOT NOTIES', notifications)
                    for (let chunk of chunks) {
                        try {
                            let receipts = expo.sendPushNotificationsAsync(chunk);
                            console.log('receipts', receipts);
                        } catch (error) {
                            console.error(error);
                        }
                    }
                    res.json({
                        success: true,
                        message: `Successfully sent still wearing watch reminder push notifications to ${notifications.length} users`
                    });
                })();
        }
    } catch (err) {
        res.json({
            success: false,
            message: 'Unable to find watches',
            errMessage: err.message
        })
    }
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`));