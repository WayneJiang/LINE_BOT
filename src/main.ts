const env = require('dotenv').config();

import {
    ClientConfig,
    Message,
    messagingApi,
    middleware,
    MiddlewareConfig
} from '@line/bot-sdk';
import { Event } from '@line/bot-sdk/dist/webhook/api';
import express, { Application, json, Request, Response } from 'express';

const clientConfig: ClientConfig = {
    channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN || '',
}

const middlewareConfig: MiddlewareConfig = {
    channelSecret: process.env.CHANNEL_SECRET || '',
}

const client = new messagingApi.MessagingApiClient(clientConfig);

const app: Application = express();

app.get('/', async (_: Request, response: Response) => {
    response.status(200).json({
        status: 'success',
        message: 'Connected successfully!',
    });
});

app.post('/callback', middleware(middlewareConfig), (request: Request, response: Response) => {
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

async function handleEvent(event: Event) {
    if (event.type !== 'message' || event.message.type !== 'text') {
        // ignore non-text-message event
        return Promise.resolve(null);
    }

    await client.showLoadingAnimation({
        chatId: event.source?.userId || '',
        loadingSeconds: 5
    });

    await new Promise(() => setTimeout(() => (
        client.getProfile(event.source?.userId || '')
            .then((result) => {
                const msg: Message = { type: 'text', text: `${result.displayName}\n已簽到，抗中保台不缺席！` }

                return client.replyMessage({
                    replyToken: event.replyToken || '',
                    messages: [msg]
                });
            })
            .catch((error) => {
                return client.replyMessage({
                    replyToken: event.replyToken || '',
                    messages: [{ type: 'text', text: error.message }],
                });
            })
    ), 5000));
};

const port = process.env.PORT || 8000;
app.listen(port, () => {
    console.log(`listening on ${port}`);
});
