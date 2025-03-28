import { join } from "node:path";
import { readFileSync } from "node:fs";
import { RichMenuRequest } from '@line/bot-sdk/dist/messaging-api/api';
import { ClientConfig, messagingApi } from "@line/bot-sdk";

require('dotenv').config();

const clientConfig: ClientConfig = {
    channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN || '',
}

const client = new messagingApi.MessagingApiClient(clientConfig);

const blobClient = new messagingApi.MessagingApiBlobClient(clientConfig);

const richMenu: RichMenuRequest = {
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

    //
    const filepath = join(__dirname, '../menu.png');
    const buffer = readFileSync(filepath);

    //
    const richMenuId = (await client.createRichMenu(richMenu)).richMenuId;
    await blobClient.setRichMenuImage(richMenuId, new Blob([buffer], { type: 'image/png' }));

    //
    await client.setDefaultRichMenu(richMenuId);

    //
    await client.createRichMenuAlias({
        richMenuId: richMenuId,
        richMenuAliasId: 'menu-alias'
    });

    console.log('success')
}

task();