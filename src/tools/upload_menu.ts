import { join } from "node:path";
import { readFileSync } from "node:fs";
import { RichMenuRequest } from "@line/bot-sdk/dist/messaging-api/api";
import { ClientConfig, messagingApi } from "@line/bot-sdk";
import * as dotenv from "dotenv";

// 載入環境變數，指定 .env 檔案的路徑
dotenv.config({ path: join(__dirname, "../../.env") });

const clientConfig: ClientConfig = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN || "",
};

const client = new messagingApi.MessagingApiClient(clientConfig);

const blobClient = new messagingApi.MessagingApiBlobClient(clientConfig);

// const generalRichMenu: RichMenuRequest = {
//     size: {
//         width: 2500,
//         height: 843
//     },
//     selected: true,
//     name: "menu",
//     chatBarText: "選單",
//     areas: [
//         {
//             bounds: {
//                 x: 0,
//                 y: 0,
//                 width: 1250,
//                 height: 843
//             },
//             action: {
//                 type: "message",
//                 text: "簽到",
//             }
//         },
//         {
//             bounds: {
//                 x: 1251,
//                 y: 0,
//                 width: 1250,
//                 height: 843
//             },
//             action: {
//                 type: "message",
//                 text: "個人資訊"
//             }
//         }
//     ]
// };

const adminRichMenu: RichMenuRequest = {
  size: {
    width: 2500,
    height: 843,
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
        height: 843,
      },
      action: {
        type: "message",
        text: "查詢",
      },
    },
    {
      bounds: {
        x: 1251,
        y: 0,
        width: 1250,
        height: 843,
      },
      action: {
        type: "message",
        text: "匯出",
      },
    },
  ],
};

const task = async () => {
  const existedMenu = await client.getRichMenuAliasList();
  for (let index = 0; index < existedMenu["aliases"].length; index++) {
    const menu = existedMenu["aliases"][index];
    console.log(`existed = ${JSON.stringify(menu)}`);
    // await client.deleteRichMenuAlias(menu['richMenuAliasId']);
  }

  //   const filepath = join(__dirname, "../../menu_admin.png");
  //   const buffer = readFileSync(filepath);

  //   const richMenuId = (await client.createRichMenu(adminRichMenu)).richMenuId;
  //   await blobClient.setRichMenuImage(
  //     richMenuId,
  //     new Blob([buffer], { type: "image/png" })
  //   );

  //
  // await client.setDefaultRichMenu(richMenuId);

  //   await client.linkRichMenuIdToUser(
  //     "Ud519e05aed38a9bf1820a30313615cfb",
  //     "richmenu-9b3d96889e3e11c37207705d95367afa"
  //   );

  //   const unlinkRichMenuIdFromUser = await client.unlinkRichMenuIdFromUser(
  //     "U810b33c114ceb29a5ac70dbc05ec27c9"
  //   );

  //
  //   await client.createRichMenuAlias({
  //     richMenuId: richMenuId,
  //     richMenuAliasId: "menu-admin-alias",
  //   });

  console.log("success");
};

task();
