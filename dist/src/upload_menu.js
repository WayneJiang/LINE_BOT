"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_path_1 = require("node:path");
const node_fs_1 = require("node:fs");
const bot_sdk_1 = require("@line/bot-sdk");
require('dotenv').config();
const clientConfig = {
    channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN || '',
};
const client = new bot_sdk_1.messagingApi.MessagingApiClient(clientConfig);
const blobClient = new bot_sdk_1.messagingApi.MessagingApiBlobClient(clientConfig);
const richMenu = {
    size: {
        width: 2500,
        height: 843
    },
    selected: true,
    name: "menu",
    chatBarText: "選單",
    areas: [
        {
            bounds: {
                x: 0,
                y: 0,
                width: 1250,
                height: 843
            },
            action: {
                type: "message",
                text: "簽到",
            }
        },
        {
            bounds: {
                x: 1251,
                y: 0,
                width: 1250,
                height: 843
            },
            action: {
                type: "message",
                text: "個人資訊"
            }
        }
    ]
};
const task = async () => {
    const existedMenu = await client.getRichMenuAliasList();
    for (let index = 0; index < existedMenu['aliases'].length; index++) {
        const menu = existedMenu['aliases'][index];
        console.log(`existed = ${JSON.stringify(menu)}`);
        await client.deleteRichMenuAlias(menu['richMenuAliasId']);
    }
    const filepath = (0, node_path_1.join)(__dirname, '../menu.png');
    const buffer = (0, node_fs_1.readFileSync)(filepath);
    const richMenuId = (await client.createRichMenu(richMenu)).richMenuId;
    await blobClient.setRichMenuImage(richMenuId, new Blob([buffer], { type: 'image/png' }));
    await client.setDefaultRichMenu(richMenuId);
    await client.createRichMenuAlias({
        richMenuId: richMenuId,
        richMenuAliasId: 'menu-alias'
    });
    console.log('success');
};
task();
//# sourceMappingURL=upload_menu.js.map