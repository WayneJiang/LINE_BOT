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
import { messagingApi } from "@line/bot-sdk";

@Controller()
export class DataController {
  constructor(
    private readonly dataService: DataService,
    private readonly pdfService: PdfService,
    private readonly lineService: LineService,
  ) {}

  @Get()
  healthCheck(): { status: number; message: string } {
    console.log();

    return {
      status: 200,
      message: "Server alive",
    };
  }

  @Get("view/:socialId")
  async getMember(
    @Param() param: SocialIdDto,
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
  async createCoach(@Body() body: CoachDto): Promise<boolean> {
    return this.dataService.createCoach(body);
  }

  @Patch("coach/:id")
  async updateCoach(
    @Param() param: IdDto,
    @Body() body: CoachDto,
  ): Promise<boolean> {
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
    @Body() body: TraineeDto,
  ): Promise<boolean> {
    return this.dataService.createTrainee(param.socialId, body);
  }

  @Patch("trainee/info/:id")
  async updateTrainee(
    @Param() param: IdDto,
    @Body() body: TraineeDto,
  ): Promise<boolean> {
    return this.dataService.updateTrainee(param.id, body);
  }

  @Post("trainingPlan")
  async createTrainingPlan(@Body() body: TrainingPlanDto): Promise<boolean> {
    return this.dataService.createTrainingPlan(body);
  }

  @Patch("trainingPlan/:id")
  async updateTrainingPlan(
    @Param() param: IdDto,
    @Body() body: TrainingPlanDto,
  ): Promise<boolean> {
    return this.dataService.updateTrainingPlan(param.id, body);
  }

  @Get("trainingRecord")
  async getTrainingRecord(@Query() param: GetTrainingRecordDto): Promise<{
    data: TrainingRecord[];
    totalPages: number;
    currentPage: number;
  }> {
    return this.dataService.getTrainingRecords(param);
  }

  @Post("trainingRecord")
  async createTrainingRecord(
    @Body() body: CreateTrainingRecordDto,
  ): Promise<boolean> {
    return this.dataService.createTrainingRecord(body);
  }

  @Patch("trainingRecord/:id")
  async updateTrainingRecord(
    @Param() param: IdDto,
    @Body() body: UpdateTrainingRecordDto,
  ): Promise<boolean> {
    return this.dataService.updateTrainingRecord(param.id, body);
  }

  @Delete("trainingRecord/:id")
  async deleteTrainingRecord(@Param() param: IdDto): Promise<boolean> {
    return this.dataService.deleteTrainingRecord(param.id);
  }

  @Post("openingCourse")
  async createOpeningCourse(@Body() body: OpeningCourseDto): Promise<boolean> {
    return this.dataService.createOpeningCourse(body);
  }

  @Get("openingCourses")
  async getOpeningCourses(): Promise<OpeningCourse[]> {
    return this.dataService.getOpeningCourse();
  }

  @Patch("openingCourse/:id")
  async updateOpeningCourse(
    @Param() param: IdDto,
    @Body() body: OpeningCourseDto,
  ): Promise<boolean> {
    return this.dataService.updateOpeningCourse(param.id, body);
  }

  @Get("monthlySummary")
  getMonthlySummary(@Res() res: Response): void {
    res.type("html").send(`<!DOCTYPE html><html><body>
<script>
  const a1 = document.createElement("a"); a1.href = "/monthlySummary/personal"; a1.click();
  setTimeout(() => { const a2 = document.createElement("a"); a2.href = "/monthlySummary/sequential"; a2.click(); }, 1000);
</script>
</body></html>`);
  }

  @Get("monthlySummary/personal")
  async getPersonalSummary(@Res() response: Response): Promise<void> {
    try {
      const rows = await this.dataService.getMonthlySummary();

      if (rows.length === 0) {
        response.json({ status: "ok", message: "無上月個人教練資料" });
        return;
      }

      const month = rows[0].month;
      const pdfBuffer = await this.pdfService.generateMonthlySummaryPdf(
        month,
        rows,
      );

      response.set({
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${month}_personal.pdf"; filename*=UTF-8''${encodeURIComponent(`${month}_個人計畫簽到統計.pdf`)}`,
        "Content-Length": pdfBuffer.length,
      });
      response.end(pdfBuffer);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : JSON.stringify(error);
      console.error("產生個人計畫 PDF 時發生錯誤:", message);
      response.status(500).json({ status: "error", message });
    }
  }

  @Delete("openingCourse/:id")
  async deleteOpeningCourse(@Param() param: IdDto): Promise<boolean> {
    return this.dataService.deleteOpeningCourse(param.id);
  }

  @Get("cron/monthlySummary")
  async cronMonthlySummary(@Res() response: Response): Promise<void> {
    const TARGET_SOCIAL_IDS = (
      process.env.MONTHLY_SUMMARY_TARGET_SOCIAL_ID || ""
    )
      .split(",")
      .filter(Boolean);

    try {
      const result = await this.dataService.generateMonthlySummaryPdfs();

      if (!result) {
        response.json({ status: "ok", message: "無上月簽到資料" });
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
            type: "button",
            style: "primary",
            height: "sm",
            color: "#0080FF",
            action: {
              type: "uri",
              label: `下載${item.label}`,
              uri: item.url,
            },
          })),
        },
      };

      await Promise.all(
        TARGET_SOCIAL_IDS.map((id) =>
          this.lineService.pushFlexMessage(
            id,
            `${month} 簽到統計`,
            flexContent,
          ),
        ),
      );

      const labels = uploads.map((upload) => upload.label).join("、");
      console.log(`✅ 已發送 ${month} ${labels}`);
      response.json({ status: "ok", message: `已發送 ${month} ${labels}` });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : JSON.stringify(error);
      console.error("發送時發生錯誤:", message);
      response.status(500).json({ status: "error", message });
    }
  }

  @Get("regenerateReport")
  async regenerateReport(@Res() response: Response): Promise<void> {
    try {
      const result = await this.dataService.generateMonthlySummaryPdfs();

      if (!result) {
        response.json({ status: "ok", message: "無上月簽到資料" });
        return;
      }

      const { month, uploads } = result;
      const labels = uploads.map((upload) => upload.label).join("、");
      response.json({ status: "ok", message: `已產生 ${month} ${labels}`, uploads });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : JSON.stringify(error);
      console.error("產生報表時發生錯誤:", message);
      response.status(500).json({ status: "error", message });
    }
  }

  @Get("monthlySummary/sequential")
  async getSequentialSummary(@Res() response: Response): Promise<void> {
    try {
      const rows = await this.dataService.getSequentialMonthlySummary();

      if (rows.length === 0) {
        response.json({ status: "ok", message: "無上月團體課程資料" });
        return;
      }

      const month = rows[0].month;
      const pdfBuffer = await this.pdfService.generateSequentialSummaryPdf(
        month,
        rows,
      );

      response.set({
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${month}_sequential_summary.pdf"; filename*=UTF-8''${encodeURIComponent(`${month}_團體課程簽到統計.pdf`)}`,
        "Content-Length": pdfBuffer.length,
      });
      response.end(pdfBuffer);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : JSON.stringify(error);
      console.error("產生團體課程 PDF 時發生錯誤:", message);
      response.status(500).json({ status: "error", message });
    }
  }
}
