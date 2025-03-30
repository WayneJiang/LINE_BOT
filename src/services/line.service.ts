import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientConfig, MessageEvent, messagingApi, Postback, PostbackEvent } from '@line/bot-sdk';
import { MessagingApiClient, ReplyMessageResponse } from '@line/bot-sdk/dist/messaging-api/api';
import { utc } from 'moment-timezone';
import { InjectRepository } from '@nestjs/typeorm';
import { Trainee } from 'src/entities/trainee.entity';
import { Repository } from 'typeorm';
import { TrainingRecord } from 'src/entities/training-record.entity';
import { TraineeType } from 'src/enums/enum-constant';

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
                                    contents: [
                                        {
                                            type: 'text',
                                            text: '確認簽到？',
                                            weight: 'bold',
                                            size: 'xl',
                                            align: 'center',
                                            gravity: 'center'
                                        },
                                        {
                                            type: 'separator',
                                            margin: 'md'
                                        },
                                        {
                                            type: 'box',
                                            layout: 'vertical',
                                            margin: 'lg',
                                            spacing: 'sm',
                                            contents: [
                                                {
                                                    type: 'text',
                                                    text: '現在時間：'
                                                },
                                                {
                                                    type: 'text',
                                                    text: now.format('YYYY/MM/DD HH:mm:ss'),
                                                    weight: 'bold',
                                                    align: 'center',
                                                    gravity: 'center',
                                                    size: 'lg',
                                                    color: '#0547c3',
                                                    margin: 'md'
                                                }
                                            ]
                                        }
                                    ]
                                },
                                footer: {
                                    type: 'box',
                                    layout: 'vertical',
                                    spacing: 'sm',
                                    contents: [
                                        {
                                            type: 'button',
                                            style: 'primary',
                                            height: 'sm',
                                            color: '#ff7e47',
                                            action: {
                                                type: 'postback',
                                                label: '確認',
                                                data: 'confirm'
                                            }
                                        },
                                        {
                                            type: 'button',
                                            style: 'secondary',
                                            height: 'sm',
                                            color: '#dddddd',
                                            action: {
                                                type: 'postback',
                                                label: '取消',
                                                data: 'cancel'
                                            }
                                        },
                                        {
                                            type: 'text',
                                            text: '回報問題',
                                            margin: 'xl',
                                            size: 'xxs',
                                            align: 'center',
                                            action: {
                                                type: 'postback',
                                                label: '回報問題',
                                                data: 'report'
                                            },
                                            color: '#982121'
                                        }
                                    ],
                                    flex: 0
                                },
                                styles: {
                                    header: {
                                        separator: true,
                                        backgroundColor: '#0000ff'
                                    }
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

        switch (data) {
            case 'confirm':
                const trainee = await this.traineeRepository.findOne({
                    where: {
                        socialId: profile.userId,
                        traineeType: TraineeType.Trainee
                    }
                });

                if (trainee) {
                    await this.trainingRecordRepository.save(
                        this.trainingRecordRepository.create({
                            trainee: trainee
                        })
                    );

                    await this.messagingApiClient.replyMessage({
                        replyToken: replyToken,
                        messages: [
                            {
                                type: 'flex',
                                altText: '簽到完成',
                                contents: {
                                    type: 'bubble',
                                    body: {
                                        type: 'box',
                                        layout: 'vertical',
                                        contents: [
                                            {
                                                type: 'text',
                                                text: '簽到完成',
                                                weight: 'bold',
                                                size: 'lg',
                                                align: 'center',
                                                gravity: 'center'
                                            },
                                            {
                                                type: 'separator',
                                                margin: 'md'
                                            },
                                            {
                                                type: 'box',
                                                layout: 'vertical',
                                                margin: 'lg',
                                                spacing: 'sm',
                                                contents: [
                                                    {
                                                        type: 'text',
                                                        text: '簽到時間：'
                                                    },
                                                    {
                                                        type: 'text',
                                                        text: '2025/03/30 23:30:00',
                                                        weight: 'bold',
                                                        align: 'center',
                                                        gravity: 'center',
                                                        size: 'xl',
                                                        color: '#f35541',
                                                        margin: 'md'
                                                    }
                                                ]
                                            }
                                        ]
                                    }
                                }
                            }
                        ]
                    });
                } else {
                    await this.traineeRepository.upsert(
                        this.traineeRepository.create({
                            socialId: profile.userId,
                            name: profile.displayName
                        }),
                        {
                            conflictPaths: ['socialId'],
                            upsertType: 'on-conflict-do-update'
                        }
                    );

                    await this.messagingApiClient.replyMessage({
                        replyToken: replyToken,
                        messages: [
                            {
                                type: 'flex',
                                altText: '簽到失敗',
                                contents: {
                                    type: 'bubble',
                                    body: {
                                        type: 'box',
                                        layout: 'vertical',
                                        contents: [
                                            {
                                                type: 'text',
                                                text: '簽到失敗',
                                                weight: 'bold',
                                                size: 'lg',
                                                align: 'center',
                                                gravity: 'center'
                                            },
                                            {
                                                type: 'separator',
                                                margin: 'md'
                                            },
                                            {
                                                type: 'box',
                                                layout: 'vertical',
                                                margin: 'lg',
                                                spacing: 'sm',
                                                contents: [
                                                    {
                                                        type: 'text',
                                                        text: '找不到資料',
                                                        weight: 'bold',
                                                        align: 'center',
                                                        gravity: 'center',
                                                        size: 'xl',
                                                        color: '#cd2828',
                                                        margin: 'md'
                                                    }
                                                ]
                                            }
                                        ]
                                    }
                                }
                            }
                        ]
                    });
                }
                break;
            case 'report':
                await this.messagingApiClient.replyMessage({
                    replyToken: replyToken,
                    messages: [
                        {
                            type: 'text',
                            text: '已回報'
                        }
                    ]
                });
                break;
        }
    }
} 