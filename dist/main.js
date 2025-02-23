"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const env = require('dotenv').config();
const bot_sdk_1 = require("@line/bot-sdk");
const express_1 = __importDefault(require("express"));
const clientConfig = {
    channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN || '',
};
const middlewareConfig = {
    channelSecret: process.env.CHANNEL_SECRET || '',
};
const client = new bot_sdk_1.messagingApi.MessagingApiClient(clientConfig);
const app = (0, express_1.default)();
app.get('/', async (_, response) => {
    response.status(200).json({
        status: 'success',
        message: 'Connected successfully!',
    });
});
app.post('/callback', (0, bot_sdk_1.middleware)(middlewareConfig), (request, response) => {
    Promise
        .all(request.body.events.map(handleEvent))
        .then((result) => {
        // 設置 response header
        response.set('ngrok-skip-browser-warning', 'true'); // 忽略 ngrok 警告
        response.json(result);
    })
        .catch((err) => {
        console.error(err);
        response.status(500).end();
    });
});
async function handleEvent(event) {
    if (event.type !== 'message' || event.message.type !== 'text') {
        // ignore non-text-message event
        return Promise.resolve(null);
    }
    // await client.showLoadingAnimation({
    //     chatId: event.source?.userId || '',
    //     loadingSeconds: 5
    // });
    client.replyMessage({
        replyToken: event.replyToken || '',
        messages: [{
                type: 'template',
                altText: 'this is a buttons template',
                template: {
                    type: 'buttons',
                    thumbnailImageUrl: 'https://example.com/bot/images/image.jpg',
                    title: 'Menu',
                    text: 'Please select',
                    actions: [{
                            type: 'postback',
                            label: 'Buy',
                            data: 'action=buy&itemid=123'
                        }, {
                            type: 'postback',
                            label: 'Add to cart',
                            data: 'action=add&itemid=123'
                        }, {
                            type: 'uri',
                            label: 'View detail',
                            uri: 'http://example.com/page/123'
                        }]
                }
            }]
    });
    // await new Promise(() => setTimeout(() => (
    //     client.getProfile(event.source?.userId || '')
    //         .then((result) => {
    //             const msg: Message = { type: 'text', text: `${result.displayName}\n已簽到，抗中保台不缺席！` }
    //             return client.replyMessage({
    //                 replyToken: event.replyToken || '',
    //                 messages: [msg]
    //             });
    //         })
    //         .catch((error) => {
    //             return client.replyMessage({
    //                 replyToken: event.replyToken || '',
    //                 messages: [{ type: 'text', text: error.message }],
    //             });
    //         })
    // ), 5000));
}
;
const port = process.env.PORT || 8000;
app.listen(port, () => {
    console.log(`listening on ${port}`);
});
