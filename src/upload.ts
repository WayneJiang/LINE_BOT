import { join } from "node:path";
import { readFileSync } from "node:fs";
import { RichMenuRequest } from '@line/bot-sdk/dist/messaging-api/api';
import { ClientConfig, messagingApi } from "@line/bot-sdk";

const env = require('dotenv').config();

const clientConfig: ClientConfig = {
    channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN || '',
}

const client = new messagingApi.MessagingApiClient(clientConfig);

const blobClient = new messagingApi.MessagingApiBlobClient(clientConfig);

const richMenu: RichMenuRequest = {
    size: {
        width: 1200,
        height: 800
    },
    selected: false,
    name: "check-in",
    chatBarText: "簽到",
    areas: [
        {
            bounds: {
                x: 0,
                y: 0,
                width: 1200,
                height: 800
            },
            action: {
                type: "message",
                text: "簽到"
            }
        }
    ]
};

const task = async () => {
    const richMenuId = (await client.createRichMenu(richMenu)).richMenuId;

    // 3. Upload image to rich menu A
    const filepath = join(__dirname, '../check-in.jpg')
    const buffer = readFileSync(filepath)

    await client.deleteRichMenuAlias("check-in-alias");

    await blobClient.setRichMenuImage(richMenuId, new Blob([buffer], { type: 'image/jpeg' }));

    // 6. Set rich menu A as the default rich menu
    await client.setDefaultRichMenu(richMenuId);

    // 7. Create rich menu alias A
    await client.createRichMenuAlias({
        richMenuId: richMenuId,
        richMenuAliasId: 'check-in-alias'
    });

    console.log('success')
}

task();