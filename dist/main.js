"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const env = require('dotenv').config();
const bot_sdk_1 = require("@line/bot-sdk");
const express_1 = __importDefault(require("express"));
const clientConfig = {
    channelSecret: process.env.CHANNEL_SECRET || '',
    channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN || ''
};
const middlewareConfig = {
    channelSecret: process.env.CHANNEL_SECRET || '',
    channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN || ''
};
const client = new bot_sdk_1.messagingApi.MessagingApiClient(clientConfig);
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`listening on ${port}`);
});
app.get('/', async (_, response) => {
    response.status(200).json({
        status: 'success',
        message: 'Connected successfully!',
    });
});
app.post('/callback', (0, bot_sdk_1.middleware)(middlewareConfig), (request, response) => {
    Promise
        .all(request.body.events.map(handleEvent))
        .then((result) => response.json(result))
        .catch((err) => {
        console.error(err);
        response.status(500).end();
    });
});
function handleEvent(event) {
    if (event.type !== 'message' || event.message.type !== 'text') {
        // ignore non-text-message event
        return Promise.resolve(null);
    }
    // use reply API
    return client.replyMessage({
        replyToken: event.replyToken || '',
        messages: [{ type: 'text', text: event.message.text }],
    });
}
;
