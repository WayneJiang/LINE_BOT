import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
} from "@nestjs/common";
import { Response } from "express";
import { IdDto } from "../dto/id.dto";
import { TraineeDto } from "../dto/trainee.dto";
import { SocialIdDto } from "../dto/social-id.dto";
import { Trainee } from "../entities/trainee.entity";
import { DataService } from "../services/data.service";
import { Coach } from "../entities/coach.entity";
import { TrainingPlanDto } from "../dto/training-plan.dto";
import {
  CreateTrainingRecordDto,
  GetTrainingRecordDto,
  UpdateTrainingRecordDto,
} from "../dto/training-record.dto";
import { TrainingRecord } from "../entities/training-record.entity";
import { OpeningCourseDto } from "../dto/opening-sourse.dto";
import { OpeningCourse } from "../entities/opening-course.entity";
import { CoachDto } from "../dto/coach.dto";
import { PdfService } from "../services/pdf.service";
import { LineService } from "../services/line.service";
import { ConfigService } from "@nestjs/config";

@Controller()
export class DataController {
  constructor(
    private readonly dataService: DataService,
    private readonly pdfService: PdfService,
    private readonly lineService: LineService,
    private readonly configService: ConfigService,
  ) { }

  @Get()
  async healthCheck(): Promise<{ status: number; message: string }> {
    console.log();

    return {
      status: 200,
      message: "Server alive",
    };
  }

  @Get("view/:socialId")
  async getMember(
    @Param() param: SocialIdDto
  ): Promise<{ id: number; coach: boolean; trainee: boolean }> {
    return this.dataService.getBySocialId(param.socialId);
  }

  @Get("coach/info/:id")
  async getCoachInfo(@Param() param: IdDto): Promise<Coach> {
    return this.dataService.getByCoachId(param.id);
  }

  @Get("trainee/info/:id")
  async getTraineeInfo(@Param() param: IdDto): Promise<Trainee> {
    return this.dataService.getByTraineeId(param.id);
  }

  @Post("coach")
  async createCoach(@Body() body: CoachDto): Promise<Boolean> {
    return this.dataService.createCoach(body)
  }

  @Patch("coach/:id")
  async updateCoach(@Param() param: IdDto, @Body() body: CoachDto): Promise<Boolean> {
    return this.dataService.updateCoach(param.id, body);
  }

  @Get("trainees")
  async getTrainees(): Promise<Trainee[]> {
    return this.dataService.getTrainees();
  }

  @Get("coaches")
  async getCoaches(): Promise<Coach[]> {
    return this.dataService.getCoaches();
  }

  @Post("trainee/info/:socialId")
  async createTraineeInfo(
    @Param() param: SocialIdDto,
    @Body() body: TraineeDto
  ): Promise<Boolean> {
    return this.dataService.createTrainee(param.socialId, body);
  }

  @Patch("trainee/info/:id")
  async updateTrainee(
    @Param() param: IdDto,
    @Body() body: TraineeDto
  ): Promise<Boolean> {
    return this.dataService.updateTrainee(param.id, body);
  }

  @Post("trainingPlan")
  async createTrainingPlan(@Body() body: TrainingPlanDto): Promise<Boolean> {
    return this.dataService.createTrainingPlan(body);
  }

  @Patch("trainingPlan/:id")
  async updateTrainingPlan(
    @Param() param: IdDto,
    @Body() body: TrainingPlanDto
  ): Promise<Boolean> {
    return this.dataService.updateTrainingPlan(param.id, body);
  }

  @Get("trainingRecord")
  async getTrainingRecord(
    @Query() param: GetTrainingRecordDto
  ): Promise<{ data: TrainingRecord[]; totalPages: number; currentPage: number }> {
    return this.dataService.getTrainingRecords(param);
  }

  @Post("trainingRecord")
  async createTrainingRecord(
    @Body() body: CreateTrainingRecordDto
  ): Promise<Boolean> {
    return this.dataService.createTrainingRecord(body);
  }

  @Patch("trainingRecord/:id")
  async updateTrainingRecord(
    @Param() param: IdDto,
    @Body() body: UpdateTrainingRecordDto
  ): Promise<Boolean> {
    return this.dataService.updateTrainingRecord(param.id, body);
  }

  @Delete("trainingRecord/:id")
  async deleteTrainingRecord(@Param() param: IdDto): Promise<Boolean> {
    return this.dataService.deleteTrainingRecord(param.id);
  }

  @Post("openingCourse")
  async createOpeningCourse(@Body() body: OpeningCourseDto): Promise<Boolean> {
    return this.dataService.createOpeningCourse(body);
  }

  @Get("openingCourses")
  async getOpeningCourses(): Promise<OpeningCourse[]> {
    return this.dataService.getOpeningCourse();
  }

  @Patch("openingCourse/:id")
  async updateOpeningCourse(
    @Param() param: IdDto,
    @Body() body: OpeningCourseDto
  ): Promise<Boolean> {
    return this.dataService.updateOpeningCourse(param.id, body);
  }

  @Get("monthlySummary")
  async getMonthlySummary(): Promise<
    { coachName: string; traineeName: string; month: string; quota: number; checkinCount: number }[]
  > {
    return this.dataService.getMonthlySummary();
  }

  @Delete("openingCourse/:id")
  async deleteOpeningCourse(@Param() param: IdDto): Promise<Boolean> {
    return this.dataService.deleteOpeningCourse(param.id);
  }

  @Get("cron/monthlySummary")
  async cronMonthlySummary(
    @Res() res: Response
  ): Promise<void> {
    const TARGET_SOCIAL_ID = "U810b33c114ceb29a5ac70dbc05ec27c9";

    try {
      // 查詢所有教練上月簽到摘要
      const rows = await this.dataService.getMonthlySummary();

      if (rows.length === 0) {
        res.json({ status: "ok", message: "無上月簽到資料" });
        return;
      }

      const month = rows[0].month;

      // 產生整份 PDF
      const pdfBuffer = await this.pdfService.generateMonthlySummaryPdf(month, rows);

      // 透過 LINE push message 發送 PDF 下載連結
      const baseUrl = this.configService.get<string>("BASE_URL") || "";
      const downloadUrl = `${baseUrl}/monthlySummary/pdf`;

      await this.lineService.pushFlexMessage(
        TARGET_SOCIAL_ID,
        `${month} 簽到統計`,
        {
          type: "bubble",
          body: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: "簽到統計",
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
              {
                type: "text",
                text: `共 ${rows.length} 筆資料`,
                size: "sm",
                margin: "sm",
                align: "center",
                color: "#666666",
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
                color: "#0080FF",
                action: {
                  type: "uri",
                  label: "下載 PDF 報表",
                  uri: downloadUrl,
                },
              },
            ],
          },
        }
      );

      console.log(`✅ 已發送 ${month} 簽到統計`);
      res.json({ status: "ok", message: `已發送 ${month} 簽到統計` });
    } catch (error) {
      console.error("發送時發生錯誤:", error);
      res.status(500).json({ status: "error", message: error.message });
    }
  }

  @Get("monthlySummary/pdf")
  async downloadMonthlySummaryPdf(@Res() res: Response): Promise<void> {
    try {
      const rows = await this.dataService.getMonthlySummary();

      if (rows.length === 0) {
        res.status(404).json({ error: "無上月簽到資料" });
        return;
      }

      const month = rows[0].month;
      const pdfBuffer = await this.pdfService.generateMonthlySummaryPdf(month, rows);

      res.set({
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(`${month}_簽到統計.pdf`)}`,
        "Content-Length": pdfBuffer.length,
      });

      res.send(pdfBuffer);
    } catch (error) {
      console.error("產生 PDF 時發生錯誤:", error);
      res.status(500).json({ error: error.message });
    }
  }
}
