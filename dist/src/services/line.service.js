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
const Trainee_entity_1 = require("../entities/Trainee.entity");
const typeorm_2 = require("typeorm");
let LineService = class LineService {
    constructor(configService, traineeRepository) {
        this.configService = configService;
        this.traineeRepository = traineeRepository;
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
                lineResponse = await this.messagingApiClient.replyMessage({
                    replyToken: replyToken,
                    messages: [{
                            type: 'text',
                            text: `查詢成功\n\n截至${now.format('YYYY/MM/DD')}為止\n已簽到${count}次`
                        }]
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
        console.log(profile.displayName);
        if (data == 'action=confirm') {
            await this.traineeRepository.save(this.traineeRepository.create({
                socialId: profile.userId,
                name: profile.displayName
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
    __param(1, (0, typeorm_1.InjectRepository)(Trainee_entity_1.Trainee)),
    __metadata("design:paramtypes", [config_1.ConfigService,
        typeorm_2.Repository])
], LineService);
//# sourceMappingURL=line.service.js.map