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

app.post('/callback', middleware(config), (request, response) => {
    Promise
        .all(request.body.events.map(handleEvent))
        .then((result) => response.json(result))
        .catch((error) => {
            console.error(error);
            response.status(500).end();
        });
});

const handleEvent = async (event) => {
    // Process all variables here.
    // Check if for a text message
    if (event.type !== 'message' || event.message.type !== 'text') {
        return;
    }
    // Process all message related variables here.
    // Check if message is repliable
    if (!event.replyToken)
        return;
    // Create a new message.
    // Reply to the user.
    await client.replyMessage({
        replyToken: event.replyToken,
        messages: [{
            type: 'text',
            text: event.message.text,
        }],
    });
};
