import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientConfig, MessageEvent, messagingApi, Postback, PostbackEvent } from '@line/bot-sdk';
import { MessagingApiClient } from '@line/bot-sdk/dist/messaging-api/api';
import { utc } from 'moment-timezone';

@Injectable()
export class LineService {
    private messagingApiClient: MessagingApiClient;

    constructor(private configService: ConfigService) {
        const channelAccessToken = this.configService.get<string>('CHANNEL_ACCESS_TOKEN');

        const clientConfig: ClientConfig = {
            channelAccessToken: channelAccessToken || ''
        }

        this.messagingApiClient = new messagingApi.MessagingApiClient(clientConfig);
    }

    async handleTextMessage(event: MessageEvent): Promise<void> {
        if (event.message.type != 'text') {
            return;
        }

        console.log('Receive textmessage event');

        const replyToken = event.replyToken;

        switch (event.message.text) {
            case '簽到':
                const now = utc().tz('Asia/Taipei').format('YYYY/MM/DD HH:mm:ss');

                this.messagingApiClient.replyMessage({
                    replyToken: replyToken,
                    messages:
                        [{
                            type: 'template',
                            altText: '確認訊息',
                            template: {
                                type: 'confirm',
                                text: `現在時間\n\n${now}\n\n確認要進行簽到嗎？`,
                                actions: [
                                    { label: '確認', type: 'postback', data: 'action=confirm' },
                                    { label: '取消', type: 'postback', data: 'action=cancel' }
                                ]
                            }
                        }]
                });
                break;
        };
    }

    async handlePostBack(event: PostbackEvent): Promise<void> {
        if (event.type != 'postback') {
            return;
        }

        console.log('Receive postback event');

        const replyToken = event.replyToken;

        const data = event.postback.data;

        await this.messagingApiClient.showLoadingAnimation({
            chatId: event.source?.userId || '',
            loadingSeconds: 10
        });

        if (data == 'action=confirm') {
            this.messagingApiClient.replyMessage({
                replyToken: replyToken,
                messages: [
                    {
                        type: 'text',
                        text: '簽到完成'
                    }
                ]
            });
        };
    }
} 