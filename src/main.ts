const env = require('dotenv').config();

import {
    ClientConfig,
    messagingApi,
    middleware,
    MiddlewareConfig
} from '@line/bot-sdk';
import { Event } from '@line/bot-sdk/dist/webhook/api';
import express, { Application, Request, Response } from 'express';
import moment from 'moment';
import { tz } from 'moment-timezone';

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
    if (event.type == 'message' && event.message.type == 'text') {
        switch (event.message.text) {
            case '簽到':
                return client.replyMessage({
                    replyToken: event.replyToken || '',
                    messages:
                        [{
                            type: 'template',
                            altText: '確認訊息',
                            template: {
                                type: 'confirm',
                                text: `現在時間\n\n${tz('Asia/Taipei').format('YYYY/MM/DD HH:mm:ss')}\n\nf確認要進行簽到嗎？`,
                                actions: [
                                    { label: '確認', type: 'postback', data: 'action=confirm' },
                                    { label: '取消', type: 'postback', data: 'action=cancel' }
                                ]
                            }
                        }]
                });
                break;
        }
    } else if (event.type == 'postback') {
        const data = event.postback.data;

        await client.showLoadingAnimation({
            chatId: event.source?.userId || '',
            loadingSeconds: 5
        });

        if (data == 'action=confirm') {
            return client.replyMessage({
                replyToken: event.replyToken || '',
                messages: [
                    {
                        type: 'text',
                        text: '簽到完成'
                    }
                ]
            });
        }
    }

    // await client.showLoadingAnimation({
    //     chatId: event.source?.userId || '',
    //     loadingSeconds: 5
    // });

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
};

const port = process.env.PORT || 8000;
app.listen(port, () => {
    console.log(`listening on ${port}`);
});
