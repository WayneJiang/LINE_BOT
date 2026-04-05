import { join } from "node:path";
import { messagingApi } from "@line/bot-sdk";
import * as dotenv from "dotenv";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { readFileSync } from "node:fs";

// 載入環境變數，指定 .env 檔案的路徑
dotenv.config({ path: join(__dirname, "../../.env") });

const clientConfig = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN || "",
};

const client = new messagingApi.MessagingApiClient(clientConfig);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const blobClient = new messagingApi.MessagingApiBlobClient(clientConfig);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const generalRichMenu: messagingApi.RichMenuRequest = {
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
        text: "訓練簽到",
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
        text: "個人資訊",
      },
    },
  ],
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const adminRichMenu: messagingApi.RichMenuRequest = {
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
        text: "管理頁面",
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
        text: "產生報表",
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

  // await client.deleteRichMenuAlias('menu-general-alias');

  // const filepath = join(__dirname, "../../menu_general.jpg");
  // const buffer = readFileSync(filepath);

  // const richMenuId = (await client.createRichMenu(generalRichMenu)).richMenuId;
  // await blobClient.setRichMenuImage(
  //   richMenuId,
  //   new Blob([buffer], { type: "image/png" })
  // );

  // await client.createRichMenuAlias({
  //   richMenuId: richMenuId,
  //   richMenuAliasId: "menu-general-alias",
  // });

  // await client.setDefaultRichMenu(richMenuId);

  // await client.unlinkRichMenuIdFromUser(
  //   "Ud519e05aed38a9bf1820a30313615cfb",
  //   "richmenu-9b3d96889e3e11c37207705d95367afa"
  // );

  // await client.linkRichMenuIdToUser(
  //   'U810b33c114ceb29a5ac70dbc05ec27c9',
  //   'richmenu-ac2be865a348a51e8bc0c6121c7b143b'
  // )

  // await client.unlinkRichMenuIdFromUser(
  //   "U810b33c114ceb29a5ac70dbc05ec27c9"
  // );

  await client.linkRichMenuIdToUser(
    "U810b33c114ceb29a5ac70dbc05ec27c9",
    "richmenu-a20c07484b1a02a6c9f20cac61ef5222",
  );

  console.log("success");
};

void task();
