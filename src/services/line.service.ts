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
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TrainingRecord } from "src/entities/training-record.entity";
import { Trainee } from "src/entities/trainee.entity";
import { TrainingPlan } from "src/entities/training-plan.entity";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { PlanType } from "src/enums/enum-constant";

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

    dayjs.extend(utc);
    dayjs.extend(timezone);

    const replyToken = event.replyToken;
    const now = dayjs().tz("Asia/Taipei");
    let lineResponse: ReplyMessageResponse;

    switch (event.message.text) {
      case "簽到":
        const currentHour = now.format("HH:mm");
        let contents = [];

        const socialId = event.source?.userId;
        if (socialId) {
          const trainee = await this.traineeRepository.findOneBy({
            socialId: socialId,
          });

          if (trainee) {
            const personalAndBlockPlans = await this.trainingPlanRepository
              .createQueryBuilder("trainingPlan")
              .leftJoinAndSelect("trainingPlan.coach", "coach")
              .leftJoinAndSelect(
                "trainingPlan.trainingTimeSlot",
                "trainingTimeSlot"
              )
              .leftJoin(
                "TrainingRecord",
                "trainingRecord",
                "trainingRecord.trainingPlan = trainingPlan.id"
              )
              .where("trainingPlan.trainee = :traineeId", {
                traineeId: trainee.id,
              })
              .andWhere("trainingPlan.planType IN (:...planTypes)", {
                planTypes: [PlanType.Personal, PlanType.Block],
              })
              .andWhere("trainingTimeSlot.dayOfWeek = :dayOfWeek", {
                dayOfWeek: now.format("dddd"),
              })
              .andWhere("trainingTimeSlot.start <= :currentHour", {
                currentHour: currentHour,
              })
              .andWhere("trainingTimeSlot.end > :currentHour", {
                currentHour: currentHour,
              })
              .groupBy("trainingPlan.id, coach.name")
              .having("trainingPlan.quota - COUNT(trainingRecord.id) > 0")
              .select([
                'trainingPlan.id AS "id"',
                'trainingPlan.planType AS "planType"',
                'coach.name AS "coach"',
                'trainingPlan.quota - COUNT(trainingRecord.id) AS "remainingQuota"',
              ])
              .getRawMany();

            const sequentialPlans = await this.trainingPlanRepository
              .createQueryBuilder("trainingPlan")
              .leftJoin(
                "OpeningCourse",
                "openingCourse",
                "openingCourse.dayOfWeek = :dayOfWeek AND openingCourse.start <= :currentHour AND openingCourse.end > :currentHour",
                {
                  currentHour: currentHour,
                  dayOfWeek: now.format("dddd"),
                }
              )
              .leftJoinAndSelect("openingCourse.coach", "coach")
              .leftJoin(
                "TrainingRecord",
                "trainingRecord",
                "trainingRecord.trainingPlan = trainingPlan.id"
              )
              .where("trainingPlan.trainee = :traineeId", {
                traineeId: trainee.id,
              })
              .andWhere("trainingPlan.planType = :planType", {
                planType: PlanType.Sequential,
              })
              .andWhere("openingCourse.id IS NOT NULL")
              .groupBy("trainingPlan.id, coach.name")
              .having("trainingPlan.quota - COUNT(trainingRecord.id) > 0")
              .select([
                'trainingPlan.id AS "id"',
                'trainingPlan.planType AS "planType"',
                'coach.name AS "coach"',
                'trainingPlan.quota - COUNT(trainingRecord.id) AS "remainingQuota"',
              ])
              .getRawMany();

            const allAvailablePlans = [
              ...personalAndBlockPlans,
              ...sequentialPlans,
            ];

            allAvailablePlans.forEach((plan) => {
              contents.push({
                type: "bubble",
                body: {
                  type: "box",
                  spacing: "xxl",
                  layout: "vertical",
                  contents: [
                    {
                      type: "text",
                      weight: "bold",
                      align: "center",
                      gravity: "center",
                      size: "xl",
                      color: "#0080FF",
                      text: this.planTypeToText(plan.planType),
                      wrap: true,
                    },
                    {
                      type: "separator",
                      color: "#ADADAD",
                      margin: "md",
                    },
                    {
                      type: "box",
                      layout: "baseline",
                      contents: [
                        {
                          type: "text",
                          text: "教練：",
                          wrap: true,
                          align: "center",
                          gravity: "center",
                          size: "md",
                          margin: "xl",
                          flex: 2,
                        },
                        {
                          type: "text",
                          text: plan.coach,
                          weight: "bold",
                          gravity: "center",
                          size: "lg",
                          color: "#019858",
                          wrap: true,
                          flex: 3,
                        },
                      ],
                    },
                    {
                      type: "box",
                      layout: "baseline",
                      contents: [
                        {
                          type: "text",
                          text: "剩餘：",
                          wrap: true,
                          align: "center",
                          gravity: "center",
                          size: "md",
                          margin: "xl",
                          flex: 2,
                        },
                        {
                          type: "text",
                          text: `${plan.remainingQuota} 堂`,
                          weight: "bold",
                          gravity: "center",
                          size: "lg",
                          color: "#019858",
                          wrap: true,
                          flex: 3,
                        },
                      ],
                    },
                  ],
                },
                footer: {
                  type: "box",
                  layout: "horizontal",
                  contents: [
                    {
                      type: "button",
                      style: "primary",
                      height: "md",
                      color: "#FF2D2D",
                      action: {
                        type: "postback",
                        label: "簽到",
                        data: `/debut/${plan.id}`,
                      },
                    },
                  ],
                },
              });
            });

            if (contents.length > 0) {
              lineResponse = await this.messagingApiClient.replyMessage({
                replyToken: replyToken,
                messages: [
                  {
                    type: "flex",
                    altText: "簽到",
                    contents: {
                      type: "carousel",
                      contents: contents,
                    },
                  },
                ],
              });
            } else {
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
                            text: "查無訓練計畫",
                            weight: "bold",
                            color: "#FF2D2D",
                            size: "xl",
                          },
                          {
                            type: "separator",
                            color: "#ADADAD",
                            margin: "md",
                          },
                          {
                            type: "box",
                            layout: "vertical",
                            margin: "lg",
                            spacing: "sm",
                            contents: [
                              {
                                type: "box",
                                layout: "vertical",
                                spacing: "sm",
                                contents: [
                                  {
                                    type: "text",
                                    text: "您這個時段沒有任何訓練計畫",
                                    size: "md",
                                  },
                                  {
                                    type: "text",
                                    text: "可洽詢教練安排其他訓練計畫",
                                    size: "sm",
                                    color: "#ADADAD",
                                  },
                                ],
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
                          text: "沒有您的資料",
                          weight: "bold",
                          color: "#FF2D2D",
                          size: "xl",
                        },
                        {
                          type: "separator",
                          color: "#ADADAD",
                          margin: "md",
                        },
                        {
                          type: "box",
                          layout: "vertical",
                          margin: "lg",
                          spacing: "sm",
                          contents: [
                            {
                              type: "box",
                              layout: "vertical",
                              spacing: "sm",
                              contents: [
                                {
                                  type: "text",
                                  text: "請點擊下方開始建立您的個人資料",
                                  size: "md",
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
                      spacing: "xl",
                      contents: [
                        {
                          type: "button",
                          style: "link",
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
          }
        }

        break;
      case "個人資訊":
        lineResponse = await this.messagingApiClient.replyMessage({
          replyToken: replyToken,
          messages: [
            {
              type: "flex",
              altText: "個人資訊",
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
                      type: "separator",
                      color: "#ADADAD",
                      margin: "md",
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
      case "查詢":
        lineResponse = await this.messagingApiClient.replyMessage({
          replyToken: replyToken,
          messages: [
            {
              type: "flex",
              altText: "查詢",
              contents: {
                type: "bubble",
                body: {
                  type: "box",
                  layout: "vertical",
                  contents: [
                    {
                      type: "text",
                      text: "查詢所有學員資訊",
                      weight: "bold",
                      size: "xl",
                    },
                    {
                      type: "separator",
                      color: "#ADADAD",
                      margin: "md",
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
      case "匯出":
        lineResponse = await this.messagingApiClient.replyMessage({
          replyToken: replyToken,
          messages: [
            {
              type: "flex",
              altText: "匯出",
              contents: {
                type: "bubble",
                hero: {
                  type: "image",
                  url: "https://i.meee.com.tw/tPKAVXu.png",
                  size: "full",
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

    dayjs.extend(utc);
    dayjs.extend(timezone);

    console.log("Receive postback event");

    const replyToken = event.replyToken;

    const data = event.postback.data.split("/");

    const debut = (data[1] == "debut");
    const planId = Number(data[2]);

    await this.messagingApiClient.showLoadingAnimation({
      chatId: event.source?.userId || "",
      loadingSeconds: 10,
    });

    const profile = await this.messagingApiClient.getProfile(
      event.source?.userId || ""
    );
    console.log(JSON.stringify(profile));

    const trainee = await this.traineeRepository.findOneBy({
      socialId: profile.userId,
    });

    if (trainee) {
      const trainingPlan = await this.trainingPlanRepository.findOne({
        where: { id: Number(planId) },
        relations: ["coach", "trainee"],
      });

      if (trainingPlan) {
        // 檢查當天是否已經有這個 TrainingPlan 的 TrainingRecord
        const today = dayjs().startOf("day").toDate();

        const existingRecord = await this.trainingRecordRepository
          .createQueryBuilder("trainingRecord")
          .leftJoinAndSelect("trainingRecord.trainee", "trainee")
          .leftJoinAndSelect("trainingRecord.trainingPlan", "trainingPlan")
          .where("trainee.id = :traineeId", { traineeId: trainee.id })
          .andWhere("trainingPlan.id = :planId", { planId: trainingPlan.id })
          .andWhere("DATE(trainingRecord.createdDate) = DATE(:today)", {
            today,
          })
          .getOne();

        if (existingRecord && debut) {
          await this.messagingApiClient.replyMessage({
            replyToken: replyToken,
            messages: [
              {
                type: "flex",
                altText: "重複簽到",
                contents: {
                  type: "bubble",
                  body: {
                    type: "box",
                    layout: "vertical",
                    contents: [
                      {
                        type: "text",
                        text: "提醒",
                        weight: "bold",
                        size: "lg",
                        align: "center",
                        gravity: "center",
                        color: "#ff0000",
                      },
                      {
                        type: "separator",
                        margin: "md",
                      },
                      {
                        type: "text",
                        text: "此課程今天已經簽到",
                        align: "center",
                        gravity: "center",
                        margin: "md",
                        size: "xs"
                      },
                      {
                        type: "text",
                        text: "重複簽到會減少額度",
                        weight: "bold",
                        align: "center",
                        gravity: "center",
                        margin: "md",
                        size: "lg",
                        color: "#019858",
                      }
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
                        color: "#FF2D2D",
                        action: {
                          type: "postback",
                          label: "了解，再簽到一次",
                          data: `/again/${trainingPlan.id}`,
                        },
                      },
                      {
                        type: "button",
                        style: "secondary",
                        height: "md",
                        action: {
                          type: "message",
                          label: "沒事了",
                          text: "沒事了"
                        },
                      },
                    ],
                  },
                },
              },
            ],
          });
          return;
        }

        // 如果 TrainingPlan 的 planType 是 BLOCK，為所有相同時段、相同教練的夥伴都新增一筆 TrainingRecord
        if (trainingPlan.planType === PlanType.Block) {
          // 查詢所有相同時段、相同教練的 Block 訓練計畫
          const currentHour = dayjs().tz("Asia/Taipei").format("HH:mm");
          const currentDayOfWeek = dayjs().tz("Asia/Taipei").format("dddd");

          const blockTrainingPlans = await this.trainingPlanRepository
            .createQueryBuilder("trainingPlan")
            .leftJoinAndSelect("trainingPlan.trainee", "trainee")
            .leftJoinAndSelect("trainingPlan.coach", "coach")
            .leftJoinAndSelect(
              "trainingPlan.trainingTimeSlot",
              "trainingTimeSlot"
            )
            .where("trainingPlan.planType = :planType", {
              planType: PlanType.Block,
            })
            .andWhere("coach.id = :coachId", { coachId: trainingPlan.coach.id })
            .andWhere("trainingTimeSlot.dayOfWeek = :dayOfWeek", {
              dayOfWeek: currentDayOfWeek,
            })
            .andWhere("trainingTimeSlot.start <= :currentHour", {
              currentHour: currentHour,
            })
            .andWhere("trainingTimeSlot.end > :currentHour", {
              currentHour: currentHour,
            })
            .getMany();

          // 為所有找到的 Block 訓練計畫建立 TrainingRecord
          for (const blockPlan of blockTrainingPlans) {
            // 確保 trainee 和 coach 都有載入
            if (!blockPlan.trainee || !blockPlan.coach) {
              continue;
            }

            // 檢查該學員當天是否已經簽到過這個訓練計畫
            const existingRecord = await this.trainingRecordRepository
              .createQueryBuilder("trainingRecord")
              .leftJoinAndSelect("trainingRecord.trainee", "trainee")
              .leftJoinAndSelect("trainingRecord.trainingPlan", "trainingPlan")
              .where("trainee.id = :traineeId", {
                traineeId: blockPlan.trainee.id,
              })
              .andWhere("trainingPlan.id = :planId", { planId: blockPlan.id })
              .andWhere("DATE(trainingRecord.createdDate) = DATE(:today)", {
                today: dayjs().startOf("day").toDate(),
              })
              .getOne();

            // 如果該學員當天還沒有簽到過，才建立新的簽到記錄
            if (!existingRecord) {
              await this.trainingRecordRepository.save(
                this.trainingRecordRepository.create({
                  trainee: blockPlan.trainee,
                  trainingPlan: blockPlan,
                })
              );
            }
          }
        } else {
          // 原有的個人簽到邏輯
          await this.trainingRecordRepository.save(
            this.trainingRecordRepository.create({
              trainee: trainee,
              trainingPlan: trainingPlan,
            })
          );
        }

        // 計算已使用的 quota
        const usedQuota = await this.trainingRecordRepository.count({
          where: { trainingPlan: { id: trainingPlan.id } },
        });

        if (trainingPlan.quota - usedQuota === 1) {
          trainingPlan.end = dayjs().toDate();
        } else {
          trainingPlan.start = dayjs().toDate();
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
                          text: dayjs()
                            .tz("Asia/Taipei")
                            .format("YYYY/MM/DD HH:mm:ss"),
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
  }

  private planTypeToText(planType: PlanType) {
    switch (planType) {
      case PlanType.Personal:
        return "個人教練";
      case PlanType.Block:
        return "團體課程";
      case PlanType.Sequential:
        return "開放團課";
    }
  }
}
