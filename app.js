const express = require('express');
const { Expo }  = require('expo-server-sdk');
const config = require('./config.js');
const isDev = process.env.NODE_ENV !== 'production';
const AWS = require('aws-sdk');
const isDev = process.env.NODE_ENV !== 'production';

let port = process.env.PORT || 3000;
const config = {
    aws_table_name: 'fruitsTable',
    aws_local_config: {
        region: 'local',
        endpoint: 'http://localhost:3000'
    },
    aws_remote_config: {
        accessKeyId: '__',
        secretAccessKey: '__',
        region: 'us-east-2',
    }
};

const app = express();
const expo = new Expo();

const scanParams = {
    TableName: 'PushToken-npgjtlybgnfk7cxn6jgxihw7w4-local'
}

const saveToken = async (token) => {
    console.log(token)
    
    const params = {
        TableName: 'PushToken-npgjtlybgnfk7cxn6jgxihw7w4-local',
        Token: token
    }

    const db = new AWS.DynamoDB.DocumentClient();
    const existingPushTokens = await db.scan(scanParams, (err, data) => {
        if (!err) {
            return data;
        }
    })

    existingPushTokens = existingPushTokens.filter(ft => {
        if (ft.id == token.id) {
            return existingPushTokens;
        };
    })

    if (existingPushTokens.length != 0) {
        return await db.put(params, function(err, data) {
            if (err) {
                console.err('Unable to save item in table:', params.TableName)
                return {
                    success: false,
                    message: 'Error: Server error saving push token'
                };
            }

            return {
                success: true,
                message: 'Success: Saved push token successfully'
            };
        });
    } else {
        return await updatePushToken(token, db)
    };
  }

const updatePushToken = async (token, db) => {
    return await db.update(params, function(err, data) {
        if (err) {
            console.err('Unable update item in table:', params.TableName)
            return {
                success: false,
                message: 'Error: Server error updating push token'
            };
        }

        return {
            success: true,
            message: 'Success: Saved push token successfully'
        };
    });
}

const handlePushTokens = (message) => {
    let notifications = [];
    const existingPushTokens = await db.scan(scanParams, (err, data) => {
        if (!err) {
            return data;
        }
    })

    for (let pushToken of existingPushTokens) {
        if (!Expo.isExpoPushToken(pushToken)) {
        console.error(`Push token ${pushToken} is not a valid Expo push token`);
        continue;
        }
        console.log('Going to send this push token', pushToken)

        notifications.push({
            to: pushToken.token,
            sound: 'default',
            title: 'WOTD is Ready!',
            // body: message,
            // data: { message }
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

app.post('/token', async (req, res) => {
    if (isDev) {
        AWS.config.update(config.aws_local_config);
      } else {
        AWS.config.update(config.aws_remote_config);
      }

    const tokenData = req.body;

    let result = await saveToken(tokenData);
    console.log(`Received push token, ${result}`);
    res.send(result);
});

app.post('/sendWOTDPush', async (req, res) => {
    if (isDev) {
        AWS.config.update(config.aws_local_config);
      } else {
        AWS.config.update(config.aws_remote_config);
    }

    const result = await handlePushTokens();
    console.log(`Received message, ${result}`);
    res.send(result);
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`));