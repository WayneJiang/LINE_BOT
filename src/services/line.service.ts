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

        const traineeUserId = event.source?.userId;
        if (traineeUserId) {
          const trainee = await this.traineeRepository.findOneBy({
            socialId: traineeUserId,
          });

          if (trainee) {
            const personalAndBlockPlans = await this.trainingPlanRepository
              .createQueryBuilder("trainingPlan")
              .leftJoinAndSelect("trainingPlan.coach", "coach")
              .leftJoinAndSelect(
                "trainingPlan.trainingTimeSlot",
                "trainingTimeSlot"
              )
              .where("trainingPlan.trainee = :traineeId", {
                traineeId: trainee.id,
              })
              .andWhere("trainingPlan.planQuota - trainingPlan.usedQuota > 0")
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
              .select([
                'trainingPlan.id AS "id"',
                'trainingPlan.planType AS "planType"',
                'coach.name AS "coach"',
                'trainingPlan.planQuota - trainingPlan.usedQuota AS "remainingQuota"',
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
              .where("trainingPlan.trainee = :traineeId", {
                traineeId: trainee.id,
              })
              .andWhere("trainingPlan.planQuota - trainingPlan.usedQuota > 0")
              .andWhere("trainingPlan.planType = :planType", {
                planType: PlanType.Sequential,
              })
              .andWhere("openingCourse.id IS NOT NULL")
              .select([
                'trainingPlan.id AS "id"',
                'trainingPlan.planType AS "planType"',
                'coach.name AS "coach"',
                'trainingPlan.planQuota - trainingPlan.usedQuota AS "remainingQuota"',
              ])
              .getRawMany();

            console.log(sequentialPlans);

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
                        data: `${plan.id}`,
                      },
                    },
                  ],
                },
              });
            });
          }
        }

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

    dayjs.extend(utc);
    dayjs.extend(timezone);

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

    const planId = data;

    const trainee = await this.traineeRepository.findOneBy({
      socialId: profile.userId,
    });

    if (trainee) {
      const trainingPlan = await this.trainingPlanRepository.findOneBy({
        id: Number(planId),
      });

      if (trainingPlan) {
        await this.trainingRecordRepository.save(
          this.trainingRecordRepository.create({
            trainee: trainee,
            trainingPlan: trainingPlan,
          })
        );
        if (trainingPlan.planQuota - trainingPlan.usedQuota == 1) {
          trainingPlan.end = dayjs().toDate();
          trainingPlan.usedQuota = trainingPlan.usedQuota + 1;
        } else {
          trainingPlan.start = dayjs().toDate();
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
        return "團體教練";
      case PlanType.Sequential:
        return "開放團體課程";
    }
  }
}
