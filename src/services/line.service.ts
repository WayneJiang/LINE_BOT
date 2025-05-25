import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  ClientConfig,
  MessageEvent,
  messagingApi,
  PostbackEvent,
} from "@line/bot-sdk";
import {
  MessagingApiClient,
  ReplyMessageResponse,
} from "@line/bot-sdk/dist/messaging-api/api";
import { utc } from "moment-timezone";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TrainingRecord } from "src/entities/training-record.entity";
import { Trainee } from "src/entities/trainee.entity";
import { TrainingPlan } from "src/entities/training-plan.entity";
import dayjs from "dayjs";

@Injectable()
export class LineService {
  private messagingApiClient: MessagingApiClient;

  constructor(
    private configService: ConfigService,
    @InjectRepository(Trainee)
    private traineeRepository: Repository<Trainee>,
    @InjectRepository(TrainingRecord)
    private trainingRecordRepository: Repository<TrainingRecord>,
    @InjectRepository(TrainingPlan)
    private trainingPlanRepository: Repository<TrainingPlan>
  ) {
    const channelAccessToken = this.configService.get<string>(
      "CHANNEL_ACCESS_TOKEN"
    );

    const clientConfig: ClientConfig = {
      channelAccessToken: channelAccessToken || "",
    };

    this.messagingApiClient = new messagingApi.MessagingApiClient(clientConfig);
  }

  async handleTextMessage(event: MessageEvent): Promise<void> {
    if (event.message.type != "text") {
      return;
    }

    console.log("Receive textmessage event");

    const replyToken = event.replyToken;
    const now = utc().tz("Asia/Taipei");
    let lineResponse: ReplyMessageResponse;

    console.log(event.source.userId);

    switch (event.message.text) {
      case "簽到":
        lineResponse = await this.messagingApiClient.replyMessage({
          replyToken: replyToken,
          messages: [
            {
              type: "flex",
              altText: "簽到",
              contents: {
                type: "bubble",
                body: {
                  type: "box",
                  layout: "vertical",
                  contents: [
                    {
                      type: "text",
                      text: "確認簽到？",
                      weight: "bold",
                      size: "xl",
                      align: "center",
                      gravity: "center",
                    },
                    {
                      type: "separator",
                      margin: "md",
                    },
                    {
                      type: "box",
                      layout: "vertical",
                      margin: "lg",
                      spacing: "sm",
                      contents: [
                        {
                          type: "text",
                          text: "現在時間：",
                        },
                        {
                          type: "text",
                          text: now.format("YYYY/MM/DD HH:mm:ss"),
                          weight: "bold",
                          align: "center",
                          gravity: "center",
                          size: "lg",
                          color: "#0547c3",
                          margin: "md",
                        },
                      ],
                    },
                  ],
                },
                footer: {
                  type: "box",
                  layout: "vertical",
                  spacing: "sm",
                  contents: [
                    {
                      type: "button",
                      style: "primary",
                      height: "sm",
                      color: "#ff7e47",
                      action: {
                        type: "postback",
                        label: "確認",
                        data: "confirm",
                      },
                    },
                    {
                      type: "button",
                      style: "secondary",
                      height: "sm",
                      color: "#dddddd",
                      action: {
                        type: "postback",
                        label: "取消",
                        data: "cancel",
                      },
                    },
                    {
                      type: "text",
                      text: "回報問題",
                      margin: "xl",
                      size: "xxs",
                      align: "center",
                      action: {
                        type: "postback",
                        label: "回報問題",
                        data: "report",
                      },
                      color: "#982121",
                    },
                  ],
                  flex: 0,
                },
                styles: {
                  header: {
                    separator: true,
                    backgroundColor: "#0000ff",
                  },
                },
              },
            },
          ],
        });
        break;
      case "個人資訊":
        lineResponse = await this.messagingApiClient.replyMessage({
          replyToken: replyToken,
          messages: [
            {
              type: "flex",
              altText: "簽到",
              contents: {
                type: "bubble",
                body: {
                  type: "box",
                  layout: "vertical",
                  contents: [
                    {
                      type: "text",
                      text: "個人資訊",
                      weight: "bold",
                      size: "xl",
                    },
                    {
                      type: "box",
                      layout: "vertical",
                      margin: "lg",
                      spacing: "sm",
                      contents: [
                        {
                          type: "box",
                          layout: "horizontal",
                          spacing: "sm",
                          contents: [
                            {
                              type: "text",
                              text: "點擊打開網頁",
                              color: "#aaaaaa",
                              size: "sm",
                              flex: 1,
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
                footer: {
                  type: "box",
                  layout: "vertical",
                  spacing: "sm",
                  contents: [
                    {
                      type: "button",
                      style: "link",
                      height: "sm",
                      action: {
                        type: "uri",
                        label: "開啟",
                        uri: `https://managment-web.vercel.app/?socialId=${event.source?.userId}`,
                      },
                    },
                  ],
                },
              },
            },
          ],
        });
        break;
    }

    console.log(lineResponse);
  }

  async handlePostBack(event: PostbackEvent): Promise<void> {
    if (event.type != "postback") {
      return;
    }

    console.log("Receive postback event");

    const replyToken = event.replyToken;

    const data = event.postback.data;

    await this.messagingApiClient.showLoadingAnimation({
      chatId: event.source?.userId || "",
      loadingSeconds: 10,
    });

    const profile = await this.messagingApiClient.getProfile(
      event.source?.userId || ""
    );
    console.log(JSON.stringify(profile));

    switch (data) {
      case "confirm":
        const trainee = await this.traineeRepository.findOneBy({
          socialId: profile.userId,
        });

        if (trainee) {
          const trainingPlan = await this.trainingPlanRepository
            .createQueryBuilder("trainingPlan")
            .where("trainingPlan.planEndedAt = 'infinity'::timestamp")
            .andWhere("trainingPlan.planQuota - trainingPlan.usedQuota > 0")
            .orderBy("trainingPlan.id", "ASC")
            .getOne();

          if (trainingPlan) {
            await this.trainingRecordRepository.save(
              this.trainingRecordRepository.create({
                trainee: trainee,
                trainingPlan: trainingPlan,
              })
            );

            if (trainingPlan.planQuota - trainingPlan.usedQuota == 1) {
              trainingPlan.planEndedAt = dayjs().toDate();
              trainingPlan.usedQuota = trainingPlan.usedQuota + 1;
            } else {
              trainingPlan.planStartedAt = dayjs().toDate();
              trainingPlan.usedQuota = trainingPlan.usedQuota + 1;
            }
            await this.trainingPlanRepository.save(trainingPlan);

            await this.messagingApiClient.replyMessage({
              replyToken: replyToken,
              messages: [
                {
                  type: "flex",
                  altText: "簽到完成",
                  contents: {
                    type: "bubble",
                    body: {
                      type: "box",
                      layout: "vertical",
                      contents: [
                        {
                          type: "text",
                          text: "簽到完成",
                          weight: "bold",
                          size: "lg",
                          align: "center",
                          gravity: "center",
                        },
                        {
                          type: "separator",
                          margin: "md",
                        },
                        {
                          type: "box",
                          layout: "vertical",
                          margin: "lg",
                          spacing: "sm",
                          contents: [
                            {
                              type: "text",
                              text: "簽到時間：",
                            },
                            {
                              type: "text",
                              text: dayjs().format("YYYY/MM/DD HH:mm:ss"),
                              weight: "bold",
                              align: "center",
                              gravity: "center",
                              size: "xl",
                              color: "#f35541",
                              margin: "md",
                            },
                          ],
                        },
                      ],
                    },
                  },
                },
              ],
            });
          } else {
            await this.messagingApiClient.replyMessage({
              replyToken: replyToken,
              messages: [
                {
                  type: "flex",
                  altText: "簽到失敗",
                  contents: {
                    type: "bubble",
                    body: {
                      type: "box",
                      layout: "vertical",
                      contents: [
                        {
                          type: "text",
                          text: "簽到失敗",
                          weight: "bold",
                          size: "lg",
                          align: "center",
                          gravity: "center",
                        },
                        {
                          type: "separator",
                          margin: "md",
                        },
                        {
                          type: "box",
                          layout: "vertical",
                          margin: "lg",
                          spacing: "sm",
                          contents: [
                            {
                              type: "text",
                              text: "找不到可用的訓練計畫",
                              weight: "bold",
                              align: "center",
                              gravity: "center",
                              size: "xl",
                              color: "#cd2828",
                              margin: "md",
                            },
                          ],
                        },
                      ],
                    },
                  },
                },
              ],
            });
          }
        } else {
          await this.messagingApiClient.replyMessage({
            replyToken: replyToken,
            messages: [
              {
                type: "flex",
                altText: "簽到失敗",
                contents: {
                  type: "bubble",
                  body: {
                    type: "box",
                    layout: "vertical",
                    contents: [
                      {
                        type: "text",
                        text: "簽到失敗",
                        weight: "bold",
                        size: "lg",
                        align: "center",
                        gravity: "center",
                      },
                      {
                        type: "separator",
                        margin: "md",
                      },
                      {
                        type: "box",
                        layout: "vertical",
                        margin: "lg",
                        spacing: "sm",
                        contents: [
                          {
                            type: "text",
                            text: "找不到你的資料",
                            weight: "bold",
                            align: "center",
                            gravity: "center",
                            size: "xl",
                            color: "#cd2828",
                            margin: "md",
                          },
                        ],
                      },
                    ],
                  },
                },
              },
            ],
          });
        }
        break;
      case "report":
        await this.messagingApiClient.replyMessage({
          replyToken: replyToken,
          messages: [
            {
              type: "text",
              text: "已回報",
            },
          ],
        });
        break;
    }
  }
}
