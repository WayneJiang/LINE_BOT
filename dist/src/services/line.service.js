"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LineService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const bot_sdk_1 = require("@line/bot-sdk");
const moment_timezone_1 = require("moment-timezone");
const typeorm_1 = require("@nestjs/typeorm");
const trainee_entity_1 = require("../entities/trainee.entity");
const typeorm_2 = require("typeorm");
const trainingRecord_entity_1 = require("../entities/trainingRecord.entity");
let LineService = class LineService {
    constructor(configService, traineeRepository, trainingRecordRepository) {
        this.configService = configService;
        this.traineeRepository = traineeRepository;
        this.trainingRecordRepository = trainingRecordRepository;
        const channelAccessToken = this.configService.get('CHANNEL_ACCESS_TOKEN');
        const clientConfig = {
            channelAccessToken: channelAccessToken || ''
        };
        this.messagingApiClient = new bot_sdk_1.messagingApi.MessagingApiClient(clientConfig);
    }
    async handleTextMessage(event) {
        if (event.message.type != 'text') {
            return;
        }
        console.log('Receive textmessage event');
        const replyToken = event.replyToken;
        const now = (0, moment_timezone_1.utc)().tz('Asia/Taipei');
        let lineResponse;
        switch (event.message.text) {
            case '簽到':
                lineResponse = await this.messagingApiClient.replyMessage({
                    replyToken: replyToken,
                    messages: [{
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
                                            action: {
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
                const info = await this.traineeRepository.findOne({
                    relations: ['trainingPlan', 'trainingRecord'],
                    where: { 'socialId': event.source.userId }
                });
                lineResponse = await this.messagingApiClient.replyMessage({
                    replyToken: replyToken,
                    messages: [{
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
        }
        ;
        console.log(lineResponse);
    }
    async handlePostBack(event) {
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
            await this.trainingRecordRepository.save(this.trainingRecordRepository.create({
                trainee: trainee
            }));
            this.messagingApiClient.replyMessage({
                replyToken: replyToken,
                messages: [
                    {
                        type: 'text',
                        text: '簽到完成'
                    }
                ]
            });
        }
        ;
    }
};
exports.LineService = LineService;
exports.LineService = LineService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, typeorm_1.InjectRepository)(trainee_entity_1.Trainee)),
    __param(2, (0, typeorm_1.InjectRepository)(trainingRecord_entity_1.TrainingRecord)),
    __metadata("design:paramtypes", [config_1.ConfigService,
        typeorm_2.Repository,
        typeorm_2.Repository])
], LineService);
//# sourceMappingURL=line.service.js.map