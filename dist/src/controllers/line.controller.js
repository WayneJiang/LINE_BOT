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
exports.LineController = void 0;
const common_1 = require("@nestjs/common");
const line_service_1 = require("../services/line.service");
let LineController = class LineController {
    constructor(lineService) {
        this.lineService = lineService;
    }
    async handleWebhook(body) {
        for (const event of body.events) {
            if (event.type == 'message' && event.message.type == 'text') {
                await this.lineService.handleTextMessage(event);
            }
            else if (event.type == 'postback') {
                await this.lineService.handlePostBack(event);
            }
        }
    }
};
exports.LineController = LineController;
__decorate([
    (0, common_1.Post)('webhook'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], LineController.prototype, "handleWebhook", null);
exports.LineController = LineController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [line_service_1.LineService])
], LineController);
//# sourceMappingURL=line.controller.js.map