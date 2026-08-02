import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { messagingApi, webhook } from "@line/bot-sdk";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TrainingRecord } from "src/entities/training-record.entity";
import { Trainee } from "src/entities/trainee.entity";
import { TrainingPlan } from "src/entities/training-plan.entity";
import { OpeningCourse } from "src/entities/opening-course.entity";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { DayOfWeek, PlanType } from "src/enums/enum-constant";
import { DataService } from "src/services/data.service";

interface AvailablePlanRaw {
  id: number;
  planType: PlanType;
  coach: string;
  remainingQuota: number;
  openingCourseId?: number;
  start?: string;
  end?: string;
}

@Injectable()
export class LineService {
  private messagingApiClient: messagingApi.MessagingApiClient;

  constructor(
    private configService: ConfigService,
    private dataService: DataService,
    @InjectRepository(Trainee)
    private traineeRepository: Repository<Trainee>,
    @InjectRepository(TrainingRecord)
    private trainingRecordRepository: Repository<TrainingRecord>,
    @InjectRepository(TrainingPlan)
    private trainingPlanRepository: Repository<TrainingPlan>,
    @InjectRepository(OpeningCourse)
    private openingCourseRepository: Repository<OpeningCourse>,
  ) {
    const channelAccessToken = this.configService.get<string>(
      "CHANNEL_ACCESS_TOKEN",
    );

    const clientConfig = {
      channelAccessToken: channelAccessToken || "",
    };

    this.messagingApiClient = new messagingApi.MessagingApiClient(clientConfig);
  }

  async handleTextMessage(event: webhook.MessageEvent): Promise<void> {
    if (event.message.type != "text") {
      return;
    }

    dayjs.extend(utc);
    dayjs.extend(timezone);

    const replyToken = event.replyToken;
    let lineResponse: messagingApi.ReplyMessageResponse;

    await this.messagingApiClient.showLoadingAnimation({
      chatId: event.source?.userId || "",
      loadingSeconds: 10,
    });

    switch (event.message.text) {
      case "訓練簽到": {
        const contents: messagingApi.FlexBubble[] = [];

        const socialId = event.source?.userId;
        if (socialId) {
          const trainee = await this.traineeRepository.findOneBy({
            socialId: socialId,
          });

          if (trainee) {
            const privateTrainingPlans = await this.trainingPlanRepository
              .createQueryBuilder("trainingPlan")
              .leftJoinAndSelect("trainingPlan.coach", "coach")
              .leftJoin(
                "TrainingRecord",
                "trainingRecord",
                "trainingRecord.trainingPlan = trainingPlan.id",
              )
              .where("trainingPlan.trainee = :traineeId", {
                traineeId: trainee.id,
              })
              .andWhere("trainingPlan.planType IN (:...planTypes)", {
                planTypes: [
                  PlanType.PrivateTraining,
                  PlanType.FlexPrivate,
                  PlanType.SemiPrivate,
                ],
              })
              .groupBy("trainingPlan.id, coach.name")
              .having(
                "trainingPlan.quota - COUNT(DISTINCT trainingRecord.id) > 0",
              )
              .select([
                'trainingPlan.id AS "id"',
                'trainingPlan.planType AS "planType"',
                'coach.name AS "coach"',
                'trainingPlan.quota - COUNT(DISTINCT trainingRecord.id) AS "remainingQuota"',
              ])
              .getRawMany<AvailablePlanRaw>();

            const dayOfWeekMap = [
              DayOfWeek.Sunday,
              DayOfWeek.Monday,
              DayOfWeek.Tuesday,
              DayOfWeek.Wednesday,
              DayOfWeek.Thursday,
              DayOfWeek.Friday,
              DayOfWeek.Saturday,
            ];
            const today = dayOfWeekMap[new Date().getDay()];

            const groupFitnessPlans = await this.trainingPlanRepository
              .createQueryBuilder("trainingPlan")
              .leftJoin("OpeningCourse", "openingCourse", "1=1")
              .leftJoin("Coach", "coach", "openingCourse.coach = coach.id")
              .leftJoin(
                "TrainingRecord",
                "trainingRecord",
                "trainingRecord.trainingPlan = trainingPlan.id",
              )
              .where("trainingPlan.trainee = :traineeId", {
                traineeId: trainee.id,
              })
              .andWhere("trainingPlan.planType = :planType", {
                planType: PlanType.GroupFitness,
              })
              .andWhere("openingCourse.dayOfWeek = :today", {
                today,
              })
              .groupBy(
                "trainingPlan.id, openingCourse.id, coach.name, openingCourse.start, openingCourse.end",
              )
              .having("trainingPlan.quota - COUNT(trainingRecord.id) > 0")
              .select([
                'trainingPlan.id AS "id"',
                'trainingPlan.planType AS "planType"',
                'coach.name AS "coach"',
                'trainingPlan.quota - COUNT(trainingRecord.id) AS "remainingQuota"',
                'openingCourse.id AS "openingCourseId"',
                'openingCourse.start AS "start"',
                'openingCourse.end AS "end"',
              ])
              .getRawMany<AvailablePlanRaw>();

            const allAvailablePlans = [
              ...privateTrainingPlans,
              ...groupFitnessPlans,
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
                      text:
                        plan.planType === PlanType.GroupFitness
                          ? `${this.planTypeToText(plan.planType)} ${plan.start}~${plan.end}`
                          : this.planTypeToText(plan.planType),
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
                        label: "訓練簽到",
                        data: `/debut/${plan.id}/${plan.openingCourseId || 0}`,
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
                    altText: "訓練簽到",
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
                    altText: "訓練簽到",
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
                  altText: "訓練簽到",
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
      }
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
      case "管理頁面":
        lineResponse = await this.messagingApiClient.replyMessage({
          replyToken: replyToken,
          messages: [
            {
              type: "flex",
              altText: "管理頁面",
              contents: {
                type: "bubble",
                body: {
                  type: "box",
                  layout: "vertical",
                  contents: [
                    {
                      type: "text",
                      text: "管理頁面",
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
      case "產生報表":
        await this.generateAndSendMonthlySummary(replyToken);
        break;
    }

    if (lineResponse) {
      console.log(lineResponse);
    }
  }

  async handlePostBack(event: webhook.PostbackEvent): Promise<void> {
    if (event.type != "postback") {
      return;
    }

    dayjs.extend(utc);
    dayjs.extend(timezone);

    console.log("Receive postback event");

    const replyToken = event.replyToken;

    const data = event.postback.data.split("/");

    const debut = data[1] == "debut";
    const planId = Number(data[2]);
    const openingCourseId = data[3] ? Number(data[3]) : 0;

    await this.messagingApiClient.showLoadingAnimation({
      chatId: event.source?.userId || "",
      loadingSeconds: 10,
    });

    const profile = await this.messagingApiClient.getProfile(
      event.source?.userId || "",
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
        // 取得 OpeningCourse（如果有的話）
        const openingCourse =
          openingCourseId > 0
            ? await this.openingCourseRepository.findOneBy({
                id: openingCourseId,
              })
            : null;

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
                        size: "xs",
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
                        color: "#FF2D2D",
                        action: {
                          type: "postback",
                          label: "了解，再簽到一次",
                          data: `/again/${trainingPlan.id}/${openingCourseId}`,
                        },
                      },
                      {
                        type: "button",
                        style: "secondary",
                        height: "md",
                        action: {
                          type: "message",
                          label: "沒事了",
                          text: "沒事了",
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

        await this.trainingRecordRepository.save(
          this.trainingRecordRepository.create({
            trainee: trainee,
            trainingPlan: trainingPlan,
            openingCourse: openingCourse,
          }),
        );

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

  async pushFlexMessage(
    socialId: string,
    altText: string,
    flexContents: messagingApi.FlexContainer,
  ): Promise<void> {
    await this.messagingApiClient.pushMessage({
      to: socialId,
      messages: [
        {
          type: "flex",
          altText,
          contents: flexContents,
        },
      ],
    });
  }

  async generateAndSendMonthlySummary(replyToken: string): Promise<void> {
    const result = await this.dataService.generateMonthlySummaryPdfs();

    if (!result) {
      await this.messagingApiClient.replyMessage({
        replyToken,
        messages: [{ type: "text", text: "無上月簽到資料" }],
      });
      return;
    }

    const { month, uploads } = result;

    const flexContent: messagingApi.FlexBubble = {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: "月度簽到統計",
            weight: "bold",
            size: "xl",
            align: "center",
          },
          {
            type: "separator",
            color: "#ADADAD",
            margin: "md",
          },
          {
            type: "text",
            text: `${month} 月份`,
            size: "lg",
            margin: "lg",
            align: "center",
            color: "#0080FF",
            weight: "bold",
          },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: uploads.map((item) => ({
          type: "button" as const,
          style: "primary" as const,
          height: "sm" as const,
          color: "#0080FF",
          action: {
            type: "uri" as const,
            label: `下載${item.label}`,
            uri: item.url,
          },
        })),
      },
    };

    await this.messagingApiClient.replyMessage({
      replyToken,
      messages: [
        {
          type: "flex",
          altText: `${month} 簽到統計`,
          contents: flexContent,
        },
      ],
    });
  }

  private planTypeToText(planType: PlanType): string {
    switch (planType) {
      case PlanType.PrivateTraining:
        return "個人教練";
      case PlanType.FlexPrivate:
        return "個人彈性";
      case PlanType.SemiPrivate:
        return "個人小班";
      case PlanType.GroupFitness:
        return "團體課程";
      default:
        return "未分類課程";
    }
  }
}
