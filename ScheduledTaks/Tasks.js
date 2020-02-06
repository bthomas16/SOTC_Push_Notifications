const schedule = require('node-schedule');
const Handlers = require('../Handlers/NotificationHandlers');

const wotdSchedule = new schedule.RecurrenceRule();
wotdSchedule.minute = 0;
wotdSchedule.hour = 5;

const wotdJob = schedule.scheduleJob(wotdSchedule, async function() {
    let result = await Handlers.SendWOTDPushNotification();
    console.log('WOTD JOB SCHEDULED', result);
});

const wearingReminderSchedule = new schedule.RecurrenceRule();
wearingReminderSchedule.minute = 0;

const wearingReminderJob = schedule.scheduleJob(wearingReminderSchedule, async function() {
    let result = await Handlers.SendStillWearingReminderPushNotification();
    console.log('WEARING REMINDER JOB SCHEDULED', result);
});

const cancelWOTdJob = wotdJob.cancel();
const cancelWearingReminderJob = wearingReminderJob.cancel();

module.exports = {
    wotdJob,
    wearingReminderJob,
    cancelWOTdJob,
    cancelWearingReminderJob
}