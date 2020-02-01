const { Expo } = require('expo-server-sdk');
const config = require('../config/config');
const AWS = require('aws-sdk');
const uuid = require('uuid/v1');

const PUSH_TOKEN_TABLENAME = "PushToken-npgjtlybgnfk7cxn6jgxihw7w4-local";
const WATCH_TABLENAME = "Watch-npgjtlybgnfk7cxn6jgxihw7w4-local";

const expo = new Expo();

async function SavePushDetails(tokenData) {
    AWS.config.update(config.aws_remote_config);
    const db = new AWS.DynamoDB.DocumentClient();
    tokenData.id = uuid();

    try {
        let userId = tokenData.userId;
        const scanParams = {
            TableName: PUSH_TOKEN_TABLENAME,
            FilterExpression: 'userId = :u',
            ExpressionAttributeValues: {
                ':u': userId
            }
        };
        let data = await db.scan(scanParams).promise();
        const sameToken = data.Items;
        if (sameToken.length == 0) {
            const saveParams = {
                TableName: PUSH_TOKEN_TABLENAME,
                Item: tokenData
            };
            try {
                let result = await db.put(saveParams).promise();
                if (result) {
                    return {
                        success: true,
                        message: 'Success: Saved push token successfully',
                        data: result
                    };
                }
            } catch (err) {
                return {
                    success: false,
                    message: 'Error: Server error saving push token',
                    errMessage: err.message
                };
            }
        }
    } catch (err) {
        return {
            success: false,
            message: 'Unable to scan db for existing push tokens',
            errMessage: err.message
        };
    }
}

async function SendWOTDPushNotification() {
    AWS.config.update(config.aws_remote_config);
    const db = new AWS.DynamoDB.DocumentClient();

    try {
        const params = {
            TableName: PUSH_TOKEN_TABLENAME
        };
        // Get all push tokens to send WOTD to
        let data = await db.scan(params).promise();
        const pushTokenObjects = data.Items;
        let notifications = [];
        for (let pushToken of pushTokenObjects) {
           if (!Expo.isExpoPushToken(pushToken.token)) {
               console.error(`Push token ${pushToken} is not a valid Expo push token`);
               continue;
           }

        const scanParams = {
            TableName: WATCH_TABLENAME,
            FilterExpression: 'owner = :w',
            ExpressionAttributeValues: {
                ':w': pushToken.userId
            }
        };
        
        let watches = await db.scan(scanParams).promise();
        if (watches.length >= 1) {
            let randomIndex = Math.floor(Math.random() * Math.floor(watches.length));
            let watch = watches[randomIndex];
    
               notifications.push({
                   to: pushToken.token,
                   sound: 'default',
                   title: 'Your WOTD is Ready!',
                   body: BuildWOTDText(watch)
               });
            }
        };

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

        return {
            success: true,
            message: `Successfully sent WOTD push ${notifications.length} notifications`
        };
    } catch (err) {
        return {
            success: false,
            message: 'Unable to find WOTD Push Notification tokens to send',
            errMessage: err.message
        };
    }
}

function BuildWOTDText(watch) {
    let name = watch.name;
    if (watch.brand) {
        return watch.brand + ' - ' + name;
    }
    return name;
}

async function SendCustomPushNotification(pushData) {
    AWS.config.update(config.aws_remote_config);
    const db = new AWS.DynamoDB.DocumentClient();

    const params = {
        TableName: PUSH_TOKEN_TABLENAME
    };

    try {
        let data = await db.scan(params).promise();
        const pushTokenObjects = data.Items;
        let notifications = [];
        for (let pushToken of pushTokenObjects) {
            if (!Expo.isExpoPushToken(pushToken.token)) {
                console.error(`Push token ${pushToken} is not a valid Expo push token`);
                continue;
            }
            notifications.push({
               to: pushToken.token,
               sound: pushData.sound,
               title: pushData.title,
               body: pushData.body,
               message: pushData.message
           });
        };

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

        return {
            success: true,
            message: 'Successfully sent Custom WOTD push notifications'
        };
    } catch (err) {
        return {
            success: false,
            message: 'Unable to find WOTD Push Notification tokens to send',
            errMessage: err.message
        };  
    }
}

Date.prototype.subtractHours = function(h) {
    this.setHours(this.getHours()-h);
    return this;
}

async function SendStillWearingReminderPushNotification() {
    AWS.config.update(config.aws_remote_config);
    const db = new AWS.DynamoDB.DocumentClient();

    try { // get all watches current wearing for all users
        const scanParams = {
            TableName: WATCH_TABLENAME,
            FilterExpression: 'isCurrentlyWearing = :w AND dateLastWorn > :r AND dateLastReminded > :dlr',
            ExpressionAttributeValues: {
                ':w': true,
                ':r': new Date().subtractHours(12),
                ':dlr': new Date().subtractHours(8)
            }
        };
        
        let watches = await db.scan(scanParams).promise();
        
        const watchesCurrentlyWearing = watches.Items;
        if (watchesCurrentlyWearing.length >= 1) {
            let notifications = [];
            for (let watchWorn of watchesCurrentlyWearing) {
                let userId = watchWorn.owner;
                const params = {
                    TableName: PUSH_TOKEN_TABLENAME,
                    FilterExpression: 'userId = :u',
                    ExpressionAttributeValues: {
                        ':u': userId
                    }
                };
                try { // get push token for each user with a watch currently wearing
                    let userPushData = await db.scan(params).promise();

                    if (userPushData.Items) {
                        let pushToken = await userPushData.Items[0].token;
                        notifications.push({
                            to: pushToken,
                            sound: 'default',
                            title: 'Are you still wearing:' + ' ' + watchWorn.name + '?',
                        });

                        let updateParams = {
                            TableName: WATCH_TABLENAME,
                            Key:{
                                "id": watchWorn.id,
                                "owner": watchWorn.owner
                            },
                            UpdateExpression: "set dateLastReminded = :d",
                            ExpressionAttributeValues: {
                                ":d": BuildCurrentDate(new Date())
                            },
                            ReturnValues:"UPDATED_NEW"
                        };

                        let updatedWatchDateLastReminded = await db.update(updateParams).promise();
                    };
                } catch (err) {
                    return {
                        success: false,
                        message: 'Unable to find User Push Token',
                        errMessage: err.message
                    };
                };     
            };

            const BuildCurrentDate = (dateValue) => {
                dateValue = new Date(dateValue);
                let mm = dateValue.getMonth() + 1;
                let dd = dateValue.getDate();
                let yyyy = dateValue.getFullYear();
                let date = mm + '/' + dd + '/' + yyyy;
                return date;
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
            })();

            return {
                success: true,
                message: `Successfully sent still wearing watch reminder push notifications to ${notifications.length} users`
            };
        };
    } catch (err) {
        return {
            success: false,
            message: 'Unable to find watches',
            errMessage: err.message
        };
    }
}

async function GetUserPushTokenDetails(req, res) {
    AWS.config.update(config.aws_remote_config);
    const db = new AWS.DynamoDB.DocumentClient();

    const params = {
        TableName: PUSH_TOKEN_TABLENAME
    };

    try {
        let data = await db.scan(params).promise();
        return data;
    } catch (err) {
        return {
            success: false,
            message: 'Unable to find WOTD Push Notification tokens to send',
            errMessage: err.message
        };
    }
}

module.exports = {
    SavePushDetails,
    SendWOTDPushNotification,
    SendCustomPushNotification,
    SendStillWearingReminderPushNotification,
    GetUserPushTokenDetails
}