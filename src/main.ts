const env = require('dotenv').config();

import {
    ClientConfig,
    messagingApi,
    middleware,
    MiddlewareConfig,
} from '@line/bot-sdk';
import { Event } from '@line/bot-sdk/dist/webhook/api';
import express, { Application, Request, Response } from 'express';

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
        .then((result) => response.json(result))
        .catch((err) => {
            console.error(err);
            response.status(500).end();
        });
});

function handleEvent(event: Event) {
    if (event.type !== 'message' || event.message.type !== 'text') {
        // ignore non-text-message event
        return Promise.resolve(null);
    }

    // use reply API
    return client.replyMessage({
        replyToken: event.replyToken || '',
        messages: [{ type: 'text', text: event.source?.userId || '' }],
    });
};

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`listening on ${port}`);
});