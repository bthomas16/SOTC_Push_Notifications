const schedule = require('node-schedule');
const Handlers = require('../Handlers/NotificationHandlers');

const wotdJob = schedule.scheduleJob('0 5 * * *', async function() {
    let result = await Handlers.SendWOTDPushNotification();
    console.log('WOTD JOB SCHEDULED', result);
});

const wearingReminderJob = schedule.scheduleJob('0 * * * *', async function() {
    let result = await Handlers.SendStillWearingReminderPushNotification();
    console.log('WEARING REMINDER JOB SCHEDULED', result);
});

module.exports = {
    wotdJob,
    wearingReminderJob
}