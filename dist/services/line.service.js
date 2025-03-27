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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LineService = void 0;
var common_1 = require("@nestjs/common");
var config_1 = require("@nestjs/config");
var bot_sdk_1 = require("@line/bot-sdk");
var moment_timezone_1 = require("moment-timezone");
var LineService = /** @class */ (function () {
    function LineService(configService) {
        this.configService = configService;
        var channelAccessToken = this.configService.get('CHANNEL_ACCESS_TOKEN');
        var clientConfig = {
            channelAccessToken: channelAccessToken || ''
        };
        this.messagingApiClient = new bot_sdk_1.messagingApi.MessagingApiClient(clientConfig);
    }
    LineService.prototype.handleTextMessage = function (event) {
        return __awaiter(this, void 0, void 0, function () {
            var replyToken, now;
            return __generator(this, function (_a) {
                if (event.message.type != 'text') {
                    return [2 /*return*/];
                }
                console.log('Receive textmessage event');
                replyToken = event.replyToken;
                switch (event.message.text) {
                    case '簽到':
                        now = (0, moment_timezone_1.utc)().tz('Asia/Taipei').format('YYYY/MM/DD HH:mm:ss');
                        this.messagingApiClient.replyMessage({
                            replyToken: replyToken,
                            messages: [{
                                    type: 'template',
                                    altText: '確認訊息',
                                    template: {
                                        type: 'confirm',
                                        text: "\u73FE\u5728\u6642\u9593\n\n".concat(now, "\n\n\u78BA\u8A8D\u8981\u9032\u884C\u7C3D\u5230\u55CE\uFF1F"),
                                        actions: [
                                            { label: '確認', type: 'postback', data: 'action=confirm' },
                                            { label: '取消', type: 'postback', data: 'action=cancel' }
                                        ]
                                    }
                                }]
                        });
                        break;
                }
                ;
                return [2 /*return*/];
            });
        });
    };
    LineService.prototype.handlePostBack = function (event) {
        return __awaiter(this, void 0, void 0, function () {
            var replyToken, data;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (event.type != 'postback') {
                            return [2 /*return*/];
                        }
                        console.log('Receive postback event');
                        replyToken = event.replyToken;
                        data = event.postback.data;
                        return [4 /*yield*/, this.messagingApiClient.showLoadingAnimation({
                                chatId: ((_a = event.source) === null || _a === void 0 ? void 0 : _a.userId) || '',
                                loadingSeconds: 10
                            })];
                    case 1:
                        _b.sent();
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
                        }
                        ;
                        return [2 /*return*/];
                }
            });
        });
    };
    LineService = __decorate([
        (0, common_1.Injectable)(),
        __metadata("design:paramtypes", [config_1.ConfigService])
    ], LineService);
    return LineService;
}());
exports.LineService = LineService;
//# sourceMappingURL=line.service.js.map