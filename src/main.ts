const env = require('dotenv').config();

import {
    ClientConfig,
    MessageAPIResponseBase,
    messagingApi,
    middleware,
    MiddlewareConfig,
    webhook,
    HTTPFetchError,
} from '@line/bot-sdk';
import express, { Application, Request, Response } from 'express';

const clientConfig: ClientConfig = {
    channelSecret: process.env.CHANNEL_SECRET || '',
    channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN || ''
}

const middlewareConfig: MiddlewareConfig = {
    channelSecret: process.env.CHANNEL_SECRET || '',
    channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN || ''
}

const client = new messagingApi.MessagingApiClient(clientConfig);

const app: Application = express();

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`listening on ${port}`);
});

app.get('/', async (_: Request, response: Response) => {
    response.status(200).json({
        status: 'success',
        message: 'Connected successfully!',
    });
});

app.post('/callback', middleware(middlewareConfig),
    async (request: Request, response: Response) => {
        const callbackRequest: webhook.CallbackRequest = request.body;
        const events: webhook.Event[] = callbackRequest.events!;

        // Process all the received events asynchronously.
        const results = await Promise.all(
            events.map(async (event: webhook.Event) => {
                try {
                    await textEventHandler(event);
                } catch (err: unknown) {
                    if (err instanceof HTTPFetchError) {
                        console.error(err.status);
                        console.error(err.headers.get('x-line-request-id'));
                        console.error(err.body);
                    } else if (err instanceof Error) {
                        console.error(err);
                    }

                    // Return an error message.
                    return response.status(500).json({
                        status: 'error',
                    });
                }
            })
        );

        // Return a successful message.
        response.status(200).json({
            status: 'success',
            results,
        });
    }
);

const textEventHandler = async (event: webhook.Event): Promise<MessageAPIResponseBase | undefined> => {
    // Process all variables here.

    // Check if for a text message
    if (event.type !== 'message' || event.message.type !== 'text') {
        return;
    }

    // Process all message related variables here.

    // Check if message is repliable
    if (!event.replyToken) return;

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