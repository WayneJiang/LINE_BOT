import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientConfig, MessageEvent, messagingApi, Postback, PostbackEvent } from '@line/bot-sdk';
import { MessagingApiClient } from '@line/bot-sdk/dist/messaging-api/api';
import { utc } from 'moment-timezone';
import { InjectRepository } from '@nestjs/typeorm';
import { Trainee } from 'src/entities/Trainee.entity';
import { Repository } from 'typeorm';

@Injectable()
export class LineService {
    private messagingApiClient: MessagingApiClient;

    constructor(
        private configService: ConfigService, @InjectRepository(Trainee)
        private traineeRepository: Repository<Trainee>) {
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
        const now = utc().tz('Asia/Taipei');

        switch (event.message.text) {
            case '簽到':
                this.messagingApiClient.replyMessage({
                    replyToken: replyToken,
                    messages:
                        [{
                            type: 'template',
                            altText: '確認訊息',
                            template: {
                                type: 'confirm',
                                text: `現在時間\n\n${now.format('YYYY/MM/DD HH:mm:ss')}\n\n確認要進行簽到嗎？`,
                                actions: [
                                    { label: '確認', type: 'postback', data: 'action=confirm' },
                                    { label: '取消', type: 'postback', data: 'action=cancel' }
                                ]
                            }
                        }]
                });
                break;
            case '個人資訊':
                const count = await this.traineeRepository.count();

                const response = await
                    this.messagingApiClient.replyMessage({
                        replyToken: replyToken,
                        messages:
                            [{
                                type: 'text',
                                text: `查詢成功\n\n截至${now.format('YYYY/MM/DD')}為止\n已簽到${count}次`
                            }]
                    });

                console.log(response);
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

        const profile = await this.messagingApiClient.getProfile(event.source?.userId || '');
        console.log(profile.displayName);

        if (data == 'action=confirm') {
            await this.traineeRepository.save(
                this.traineeRepository.create({
                    socialId: profile.userId,
                    name: profile.displayName
                })
            );

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