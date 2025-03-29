import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientConfig, MessageEvent, messagingApi, Postback, PostbackEvent } from '@line/bot-sdk';
import { MessagingApiClient, ReplyMessageResponse } from '@line/bot-sdk/dist/messaging-api/api';
import { utc } from 'moment-timezone';
import { InjectRepository } from '@nestjs/typeorm';
import { Trainee } from 'src/entities/trainee.entity';
import { Repository } from 'typeorm';
import { TrainingRecord } from 'src/entities/training-record.entity';

@Injectable()
export class LineService {
    private messagingApiClient: MessagingApiClient;

    constructor(
        private configService: ConfigService,
        @InjectRepository(Trainee)
        private traineeRepository: Repository<Trainee>,
        @InjectRepository(TrainingRecord)
        private trainingRecordRepository: Repository<TrainingRecord>) {

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
        let lineResponse: ReplyMessageResponse;

        switch (event.message.text) {
            case '簽到':
                lineResponse = await this.messagingApiClient.replyMessage({
                    replyToken: replyToken,
                    messages:
                        [{
                            type: 'flex',
                            altText: '簽到',
                            contents: {
                                type: 'bubble',
                                body: {
                                    type: 'box',
                                    layout: 'vertical',
                                    spacing: 'md',
                                    contents: [
                                        {
                                            type: 'text',
                                            text: `簽到`,
                                            weight: 'bold'
                                        },
                                        { type: 'separator' },
                                        {
                                            type: 'text',
                                            contents: [
                                                {
                                                    type: 'span',
                                                    text: `現在時間\n`
                                                },
                                                {
                                                    type: 'span',
                                                    text: `${now.format('YYYY/MM/DD HH:mm:ss')}\n\n`,
                                                    weight: 'bold',
                                                },
                                                {
                                                    type: 'span',
                                                    text: '要進行簽到嗎？',
                                                    color: '#ff0000',
                                                    weight: 'bold',
                                                    size: 'lg'
                                                }
                                            ],
                                            wrap: true
                                        },
                                        {
                                            type: 'button',
                                            style: 'primary',
                                            action:
                                            {
                                                label: '確認',
                                                type: 'postback',
                                                data: 'action=confirm'
                                            }
                                        },
                                        {
                                            type: 'button',
                                            style: 'secondary',
                                            action: {
                                                label: '取消',
                                                type: 'postback',
                                                data: 'action=cancel'
                                            }
                                        }
                                    ]
                                }
                            }
                        }
                        ]
                });
                break;
            case '個人資訊':
                await this.messagingApiClient.showLoadingAnimation({
                    chatId: event.source?.userId || '',
                    loadingSeconds: 10
                });

                const info =
                    await this.traineeRepository.findOne
                        ({
                            relations: ['trainingPlan', 'trainingRecord'],
                            where: { 'socialId': event.source.userId }
                        });

                lineResponse = await
                    this.messagingApiClient.replyMessage({
                        replyToken: replyToken,
                        messages:
                            [{
                                type: 'flex',
                                altText: '個人資訊',
                                contents: {
                                    type: 'bubble',
                                    body: {
                                        type: 'box',
                                        layout: 'vertical',
                                        spacing: 'md',
                                        contents: [
                                            {
                                                type: 'text',
                                                text: `${info.name} 查詢成功`,
                                                wrap: true,
                                                weight: 'bold'
                                            },
                                            { type: 'separator' },
                                            {
                                                type: 'text',
                                                text: `訓練計畫\n\n`,
                                            },
                                            {
                                                type: 'text',
                                                contents: [
                                                    {
                                                        type: 'span',
                                                        text: '從'
                                                    },
                                                    {
                                                        type: 'span',
                                                        text: ` ${info.createdDate.toLocaleDateString()} `,
                                                        size: 'lg',
                                                        weight: 'bold'
                                                    },
                                                    {
                                                        type: 'span',
                                                        text: '開始'
                                                    }
                                                ]
                                            },
                                            {
                                                type: 'text',
                                                contents: [
                                                    {
                                                        type: 'span',
                                                        text: '規劃'
                                                    },
                                                    {
                                                        type: 'span',
                                                        text: ` ${info.trainingPlan[info.trainingPlan.length - 1].quota} `,
                                                        color: '#0000ff',
                                                        size: 'xxl',
                                                        weight: 'bold'
                                                    },
                                                    {
                                                        type: 'span',
                                                        text: '次'
                                                    }
                                                ]
                                            },
                                            {
                                                type: 'text',
                                                contents: [
                                                    {
                                                        type: 'span',
                                                        text: '截至'
                                                    },
                                                    {
                                                        type: 'span',
                                                        text: ` ${now.format('YYYY/MM/DD')} `,
                                                        size: 'lg',
                                                        weight: 'bold'
                                                    },
                                                    {
                                                        type: 'span',
                                                        text: '為止'
                                                    }
                                                ]
                                            },
                                            {
                                                type: 'text',
                                                contents: [
                                                    {
                                                        type: 'span',
                                                        text: '已簽到'
                                                    },
                                                    {
                                                        type: 'span',
                                                        text: ` ${info.trainingRecord.length} `,
                                                        color: '#008000',
                                                        size: 'xxl',
                                                        weight: 'bold'
                                                    },
                                                    {
                                                        type: 'span',
                                                        text: '次'
                                                    }
                                                ]
                                            },
                                            {
                                                type: 'text',
                                                contents: [
                                                    {
                                                        type: 'span',
                                                        text: `剩餘`
                                                    },
                                                    {
                                                        type: 'span',
                                                        text: ` ${info.trainingPlan[info.trainingPlan.length - 1].quota - info.trainingRecord.length} `,
                                                        color: '#ffa500',
                                                        size: 'xxl',
                                                        weight: 'bold'
                                                    },
                                                    {
                                                        type: 'span',
                                                        text: '次'
                                                    }
                                                ]
                                            }
                                        ]
                                    }
                                }
                            }
                            ]
                    });

                break;
        };

        console.log(lineResponse);
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
        console.log(JSON.stringify(profile));

        if (data == 'action=confirm') {
            const trainee = await this.traineeRepository.findOne({ where: { socialId: profile.userId } });

            await this.trainingRecordRepository.save(
                this.trainingRecordRepository.create({
                    trainee: trainee
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