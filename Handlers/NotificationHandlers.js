const scanParams = {
    TableName: 'PushToken-npgjtlybgnfk7cxn6jgxihw7w4-local'
}

const saveToken = async (tokenData, db) => {
    const params = {
        TableName: 'PushToken-npgjtlybgnfk7cxn6jgxihw7w4-local',
        Item: tokenData
    }

    return await db.scan(scanParams, async (err, data) => {
        if (err) {
            return {
                success: false,
                message: 'Unable to scan db for existing push tokens',
                errMessage: err
            };
        };

        const existingPushTokens = data.Items;
        const sameToken = existingPushTokens.filter(existingToken => existingToken.token === tokenData.token);
        if (!sameToken[0].token) {
            console.log('NEW TOKEN', data)
            return await db.put(params, async (err, data) => {
                if (err) {
                    console.log('Unable to save item in table:', params.TableName, token, err)
                    return await {
                        success: false,
                        message: 'Error: Server error saving push token',
                        errMessage: err
                    };
                } else {
                    return await {
                        success: true,
                        message: 'Success: Saved push token successfully',
                        data: data
                    };
                }
            });
        }
    });
}

// const updatePushToken = (params, db) => {
//     console.log('UPDATING')
//     return db.update(params, function(err, data) {
//         if (err) {
//             console.error('Unable update item in table:', params.TableName)
//             return {
//                 success: false,
//                 message: 'Error: Server error updating push token',
//                 errMessage: err
//             };
//         } else {
//             return {
//                 success: true,
//                 message: 'Success: Saved push token successfully'
//             };
//         }

//     });
// }

const sendWOTDPushNotification = async (db) => {
    return await db.scan(scanParams, (err, data) => {
        if (err) {
            return {
                success: false,
                message: 'Unable to find WOTD Push Notification tokens to send',
                errMessage: err
            }
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
               // data: { message }
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
    let result = {
        success: true,
        message: 'Successfully sent WOTD push notifications'
    };
    return result;
});
}

const sendCustomPushNotification = async (pushData, db) => {
    return await db.scan(scanParams, (err, data) => {
        if (err) {
            return {
                success: false,
                message: 'Unable to find WOTD Push Notification tokens to send',
                errMessage: err
            }
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
               data: pushData.message
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
    let result = {
        success: true,
        message: 'Successfully sent Custom WOTD push notifications'
    };
    return result;
});
}

const getUserPushTokenDetails = async (db) => {
    return await db.scan(scanParams, async (err, data) => {
        if (err) {
            return {
                success: false,
                message: 'Unable to find WOTD Push Notification tokens to send',
                errMessage: err
            }
        }
        return await data.Items;
    });
}

module.exports = {
    saveToken,
    sendWOTDPushNotification,
    sendCustomPushNotification,
    getUserPushTokenDetails
}