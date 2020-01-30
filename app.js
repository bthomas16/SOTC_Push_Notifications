const port = process.env.PORT || 3000;
const express = require('express');
const Handlers = require('./Handlers/NotificationHandlers');
const ScheduledTasks = require('./ScheduledTaks/Tasks');
const app = express();

app.use(express.json());

app.get('/', (req, res) => res.sendFile(__dirname + '/Views/PushHome.html'));
app.get('/CustomPushNotification', (req, res) => res.sendFile(__dirname + '/Views/CustomPushNotification.html'));
app.get('/WOTDPushNotification', (req, res) => res.sendFile(__dirname + '/Views/WOTDPushNotification.html'));
app.get('/StillWearingWatchPushNotification', (req, res) => res.sendFile(__dirname + '/Views/StillWearingWatchPushNotification.html'));
app.get('/PushSubscribersDetails', (req, res) => res.sendFile(__dirname + '/Views/PushSubscribersDetails.html'));

app.post('/token', async (req, res) => {
    const body = req.body;
    const result = await Handlers.SavePushDetails(body);
    console.log('save token', result)
    res.json(result);
});

app.post('/sendWOTDPushNotification', async (req, res) => {
    const result = await Handlers.SendWOTDPushNotification();
    console.log('send wotd', result)
    res.json(result);
});

app.post('/sendCustomPushNotification', async (req, res) => {
    const body = req.body;
    const result = await Handlers.SendCustomPushNotification(body);
    console.log('send custom', result)
    res.json(result);
});

app.post('/stillWearingWatchPushNotification', async (req, res) => {
    const result = await Handlers.SendStillWearingReminderPushNotification();
    console.log('send still wearing', result)
    res.json(result);
});

app.get('/getUserPushTokenDetails', async (req, res) => {
    const result = await Handlers.GetUserPushTokenDetails(req, res);
    console.log('get user details', result)
    res.json(result);
});

app.listen(port, () => {
    console.log(`SOTC Push Notification Service listening on port ${port}!`)
    ScheduledTasks.wotdJob.schedule();
    ScheduledTasks.wearingReminderJob.schedule();
});