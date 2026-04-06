import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { OpeningCourseDto } from "src/dto/opening-sourse.dto";
import { TraineeDto } from "src/dto/trainee.dto";
import { TrainingPlanDto } from "src/dto/training-plan.dto";
import {
  CreateTrainingRecordDto,
  GetTrainingRecordDto,
  UpdateTrainingRecordDto,
} from "src/dto/training-record.dto";
import { PlanType } from "src/enums/enum-constant";
import { Coach } from "src/entities/coach.entity";
import { OpeningCourse } from "src/entities/opening-course.entity";
import { Trainee } from "src/entities/trainee.entity";
import { TrainingPlan } from "src/entities/training-plan.entity";
import { TrainingRecord } from "src/entities/training-record.entity";
import { TrainingTimeSlot } from "src/entities/training-time-slot.entity";
import { Repository } from "typeorm";
import { CoachDto } from "src/dto/coach.dto";
import { PdfService } from "src/services/pdf.service";
import { put } from "@vercel/blob";

interface MonthlySummaryRaw {
  coachName: string;
  traineeName: string;
  planType: string;
  month: string;
  quota: number;
  checkinCount: number;
  checkinDates: string;
}

interface YearlySummaryRaw {
  coachName: string;
  year: string;
  totalCheckins: string;
}

interface SequentialYearlySummaryRaw {
  coachName: string;
  year: string;
  totalAttendees: string;
  totalSessions: string;
}

interface SequentialSummaryRaw {
  courseName: string;
  dayOfWeek: string;
  courseStart: string;
  courseEnd: string;
  coachName: string;
  month: string;
  date: string;
  traineeName: string;
}

@Injectable()
export class DataService {
  constructor(
    @InjectRepository(Trainee)
    private traineeRepository: Repository<Trainee>,
    @InjectRepository(Coach)
    private coachRepository: Repository<Coach>,
    @InjectRepository(TrainingPlan)
    private trainingPlanRepository: Repository<TrainingPlan>,
    @InjectRepository(TrainingRecord)
    private trainingRecordRepository: Repository<TrainingRecord>,
    @InjectRepository(TrainingTimeSlot)
    private trainingTimeSlotRepository: Repository<TrainingTimeSlot>,
    @InjectRepository(OpeningCourse)
    private openingCourseRepository: Repository<OpeningCourse>,
    private pdfService: PdfService,
  ) {}

  async getBySocialId(
    socialId: string,
  ): Promise<{ id: number; coach: boolean; trainee: boolean }> {
    const coach = await this.coachRepository.findOneBy({ socialId });
    const trainee = await this.traineeRepository.findOneBy({ socialId });

    if (!coach && !trainee) {
      return {
        id: 0,
        coach: false,
        trainee: false,
      };
    }

    return {
      id: coach ? coach.id : trainee.id,
      coach: coach != null,
      trainee: trainee != null,
    };
  }

  async getByCoachId(id: number): Promise<Coach> {
    return this.coachRepository.findOneBy({ id });
  }

  async getByTraineeId(id: number): Promise<Trainee> {
    return this.traineeRepository
      .createQueryBuilder("trainee")
      .leftJoinAndSelect("trainee.trainingPlan", "trainingPlanList")
      .leftJoinAndSelect(
        "trainingPlanList.trainingTimeSlot",
        "trainingTimeSlot",
      )
      .leftJoinAndSelect("trainingPlanList.coach", "coach")
      .leftJoinAndSelect("trainingPlanList.editor", "editor")
      .leftJoinAndSelect("trainingPlanList.trainingRecord", "trainingRecord")
      .andWhere("trainee.id = :id", { id: id })
      .addOrderBy("trainingPlanList.id", "ASC")
      .getOne();
  }

  async getTrainees(): Promise<Trainee[]> {
    return this.traineeRepository
      .createQueryBuilder("trainee")
      .leftJoinAndSelect("trainee.trainingPlan", "trainingPlan")
      .leftJoinAndSelect("trainingPlan.trainingTimeSlot", "trainingTimeSlot")
      .leftJoinAndSelect("trainingPlan.coach", "coach")
      .leftJoinAndSelect("trainingPlan.trainingRecord", "trainingRecord")
      .orderBy("trainee.id", "ASC")
      .addOrderBy("trainingPlan.id", "ASC")
      .addOrderBy("trainingRecord.id", "DESC")
      .getMany();
  }

  async createCoach(body: CoachDto): Promise<boolean> {
    try {
      // 檢查是否已存在相同名字的 Coach
      const existingCoach = await this.coachRepository.findOne({
        where: { name: body.name },
      });

      if (existingCoach) {
        return false;
      }

      // 建立 Coach
      const coach = this.coachRepository.create({
        socialId: "",
        name: body.name,
        coachType: body.coachType,
      });

      await this.coachRepository.save(coach);
      return true;
    } catch (error) {
      console.error("建立 Coach 時發生錯誤:", error);
      return false;
    }
  }

  async updateCoach(id: number, body: CoachDto): Promise<boolean> {
    try {
      // 檢查是否已存在相同名字的 Coach
      const existingCoach = await this.coachRepository.findOne({
        where: { id },
      });

      if (!existingCoach) {
        return false;
      }

      // 更新 Coach 資料
      await this.coachRepository.update(
        { id },
        {
          name: body.name,
          coachType: body.coachType,
          socialId: body.socialId,
        },
      );

      return true;
    } catch (error) {
      console.error("更新 Coach 時發生錯誤:", error);
      return false;
    }
  }

  async getCoaches(): Promise<Coach[]> {
    return this.coachRepository.find({
      order: { id: "ASC" },
    });
  }

  async createTrainee(socialId: string, body: TraineeDto): Promise<boolean> {
    try {
      // 檢查是否已存在相同 socialId 的 Trainee
      const existingTrainee = await this.traineeRepository.findOne({
        where: { socialId },
      });

      if (existingTrainee) {
        return false;
      }

      // 建立 Trainee
      const trainee = this.traineeRepository.create({
        socialId: socialId,
        name: body.name,
        birthday: body.birthday,
        gender: body.gender,
        height: body.height,
        weight: body.weight,
        phone: body.phone,
      });

      await this.traineeRepository.save(trainee);
      return true;
    } catch (error) {
      console.error("建立 Trainee 時發生錯誤:", error);
      return false;
    }
  }

  async updateTrainee(id: number, body: TraineeDto): Promise<boolean> {
    try {
      // 驗證 Trainee 是否存在
      const trainee = await this.traineeRepository.findOne({
        where: { id },
      });

      if (!trainee) {
        return false;
      }

      // 更新 Trainee 資料
      await this.traineeRepository.update(
        { id },
        {
          name: body.name,
          birthday: body.birthday,
          gender: body.gender,
          height: body.height,
          weight: body.weight,
          phone: body.phone,
          note: body.note,
        },
      );

      return true;
    } catch (error) {
      console.error("更新 Trainee 時發生錯誤:", error);
      return false;
    }
  }

  async createTrainingPlan(body: TrainingPlanDto): Promise<boolean> {
    try {
      // 驗證相關實體是否存在
      const trainee = await this.traineeRepository.findOneBy({
        id: body.trainee,
      });
      const coach =
        body.planType === PlanType.Block
          ? null
          : await this.coachRepository.findOneBy({ id: body.coach });
      const editor = await this.coachRepository.findOneBy({ id: body.editor });

      if (!trainee || !editor) {
        return false;
      }

      // 如果是 Block 類型，coach 不需要驗證
      if (body.planType !== PlanType.Block && !coach) {
        return false;
      }

      // 建立訓練計畫
      const trainingPlan = this.trainingPlanRepository.create({
        planType: body.planType,
        quota: body.quota,
        trainee: trainee,
        coach: body.planType == PlanType.Block ? null : coach,
        editor: editor,
      });

      // 先儲存訓練計畫以取得 ID
      const savedTrainingPlan =
        await this.trainingPlanRepository.save(trainingPlan);

      if (body.trainingTimeSlot && body.trainingTimeSlot.length > 0) {
        // 建立並儲存訓練時段
        const trainingTimeSlots = body.trainingTimeSlot.map((timeSlot) =>
          this.trainingTimeSlotRepository.create({
            dayOfWeek: timeSlot.dayOfWeek,
            start: timeSlot.start,
            end: timeSlot.end,
            trainingPlan: savedTrainingPlan,
          }),
        );

        // 儲存所有訓練時段
        await this.trainingTimeSlotRepository.save(trainingTimeSlots);
      }

      return true;
    } catch (error) {
      console.error("建立 TrainingPlan 時發生錯誤:", error);
      return false;
    }
  }

  async updateTrainingPlan(
    id: number,
    body: TrainingPlanDto,
  ): Promise<boolean> {
    try {
      // 驗證 TrainingPlan 是否存在
      const trainingPlan = await this.trainingPlanRepository.findOne({
        where: { id },
        relations: ["trainingTimeSlot"],
      });

      if (!trainingPlan) {
        return false;
      }

      // 驗證相關實體是否存在
      const coach =
        body.planType === PlanType.Block
          ? null
          : await this.coachRepository.findOne({ where: { id: body.coach } });
      const editor = await this.coachRepository.findOne({
        where: { id: body.editor },
      });

      if (!editor) {
        return false;
      }

      // 如果是 Block 類型，coach 不需要驗證
      if (body.planType !== PlanType.Block && !coach) {
        return false;
      }

      // 更新 TrainingPlan 基本資料
      await this.trainingPlanRepository.update(
        { id },
        {
          planType: body.planType,
          quota: body.quota,
          coach: body.planType == PlanType.Block ? null : coach,
          editor: editor,
        },
      );

      // 處理訓練時段的更新
      if (body.trainingTimeSlot && body.trainingTimeSlot.length > 0) {
        // 刪除現有的訓練時段
        await this.trainingTimeSlotRepository.delete({
          trainingPlan: { id },
        });

        // 建立新的訓練時段
        const trainingTimeSlots = body.trainingTimeSlot.map((timeSlot) =>
          this.trainingTimeSlotRepository.create({
            dayOfWeek: timeSlot.dayOfWeek,
            start: timeSlot.start,
            end: timeSlot.end,
            trainingPlan: trainingPlan,
          }),
        );

        // 儲存新的訓練時段
        await this.trainingTimeSlotRepository.save(trainingTimeSlots);
      }

      return true;
    } catch (error) {
      console.error("更新 TrainingPlan 時發生錯誤:", error);
      return false;
    }
  }

  async getTrainingRecords(body: GetTrainingRecordDto): Promise<{
    data: TrainingRecord[];
    totalPages: number;
    currentPage: number;
  }> {
    try {
      const pageSize = 30;
      const page = body.page || 1;
      const skip = (page - 1) * pageSize;

      const queryBuilder = this.trainingRecordRepository
        .createQueryBuilder("trainingRecord")
        .leftJoinAndSelect("trainingRecord.trainingPlan", "trainingPlan")
        .leftJoinAndSelect("trainingPlan.coach", "coach")
        .leftJoinAndSelect("trainingRecord.editor", "editor")
        .leftJoinAndSelect("trainingRecord.openingCourse", "openingCourse")
        .leftJoinAndSelect("openingCourse.coach", "openingCourseCoach")
        .where("trainingRecord.trainee = :trainee", { trainee: body.trainee })
        .orderBy("trainingRecord.id", "DESC");

      // 取得總筆數
      const totalCount = await queryBuilder.getCount();

      // 計算總頁數
      const totalPages = Math.ceil(totalCount / pageSize);

      // 取得分頁資料
      const data = await queryBuilder.skip(skip).take(pageSize).getMany();

      return {
        data,
        totalPages,
        currentPage: page,
      };
    } catch (error) {
      console.error("查詢 TrainingRecord 時發生錯誤:", error);
      return {
        data: [],
        totalPages: 0,
        currentPage: 1,
      };
    }
  }

  async createTrainingRecord(body: CreateTrainingRecordDto): Promise<boolean> {
    try {
      // 驗證相關實體是否存在
      const [trainee, trainingPlan, editor] = await Promise.all([
        this.traineeRepository.findOneBy({ id: body.trainee }),
        this.trainingPlanRepository.findOneBy({ id: body.trainingPlan }),
        this.coachRepository.findOneBy({ id: body.editor }),
      ]);

      if (!trainee || !trainingPlan || !editor) {
        return false;
      }

      // 建立訓練紀錄
      const trainingRecord = this.trainingRecordRepository.create({
        trainee: trainee,
        trainingPlan: trainingPlan,
        editor: editor,
        createdDate: body.date || new Date(),
      });

      await this.trainingRecordRepository.save(trainingRecord);
      return true;
    } catch (error) {
      console.error("建立 TrainingRecord 時發生錯誤:", error);
      return false;
    }
  }

  async updateTrainingRecord(
    id: number,
    body: UpdateTrainingRecordDto,
  ): Promise<boolean> {
    try {
      // 驗證 TrainingRecord 是否存在
      const trainingRecord = await this.trainingRecordRepository.findOne({
        where: { id },
      });

      if (!trainingRecord) {
        return false;
      }

      // 驗證相關實體是否存在
      const [trainingPlan, editor] = await Promise.all([
        this.trainingPlanRepository.findOneBy({ id: body.trainingPlan }),
        this.coachRepository.findOneBy({ id: body.editor }),
      ]);

      if (!trainingPlan || !editor) {
        return false;
      }

      // 更新訓練紀錄
      await this.trainingRecordRepository.update(
        { id },
        {
          trainingPlan: trainingPlan,
          editor: editor,
          createdDate: body.date,
        },
      );

      return true;
    } catch (error) {
      console.error("更新 TrainingRecord 時發生錯誤:", error);
      return false;
    }
  }

  async deleteTrainingRecord(id: number): Promise<boolean> {
    try {
      await this.trainingRecordRepository.softDelete(id);
      return true;
    } catch (error) {
      console.error("刪除 TrainingRecord 時發生錯誤:", error);
      return false;
    }
  }

  async createOpeningCourse(body: OpeningCourseDto): Promise<boolean> {
    try {
      // 驗證教練是否存在
      const coach = await this.coachRepository.findOneBy({ id: body.coach });
      if (!coach) {
        return false;
      }

      // 檢查同一個教練、同日期、同時間是否已存在
      const existingCourse = await this.openingCourseRepository.findOne({
        where: {
          coach: { id: body.coach },
          dayOfWeek: body.dayOfWeek,
          start: body.start,
          end: body.end,
        },
      });

      if (existingCourse) {
        return false;
      }

      const openingCourse = this.openingCourseRepository.create({
        name: body.name,
        dayOfWeek: body.dayOfWeek,
        start: body.start,
        end: body.end,
        note: body.note,
        coach: coach,
      });
      await this.openingCourseRepository.save(openingCourse);
      return true;
    } catch (error) {
      console.error("建立 OpeningCourse 時發生錯誤:", error);
      return false;
    }
  }

  async getOpeningCourse(): Promise<OpeningCourse[]> {
    try {
      return this.openingCourseRepository
        .createQueryBuilder("openingCourse")
        .leftJoinAndSelect("openingCourse.coach", "coach")
        .orderBy("openingCourse.id", "ASC")
        .getMany();
    } catch (error) {
      console.error("查詢 OpeningCourse 時發生錯誤:", error);
      return [];
    }
  }

  async updateOpeningCourse(
    id: number,
    body: OpeningCourseDto,
  ): Promise<boolean> {
    try {
      // 驗證 OpeningCourse 是否存在
      const openingCourse = await this.openingCourseRepository.findOneBy({
        id,
      });
      if (!openingCourse) {
        return false;
      }

      // 驗證教練是否存在
      const coach = await this.coachRepository.findOneBy({ id: body.coach });
      if (!coach) {
        return false;
      }

      await this.openingCourseRepository.update(id, {
        name: body.name,
        dayOfWeek: body.dayOfWeek,
        start: body.start,
        end: body.end,
        note: body.note,
        coach: coach,
      });
      return true;
    } catch (error) {
      console.error("更新 OpeningCourse 時發生錯誤:", error);
      return false;
    }
  }

  async getMonthlySummary(): Promise<
    {
      coachName: string;
      traineeName: string;
      planType: string;
      month: string;
      quota: number;
      checkinCount: number;
      checkinDates: string;
    }[]
  > {
    try {
      // 查詢個人教練計畫的上月簽到摘要，含簽到日期
      const results = await this.trainingPlanRepository
        .createQueryBuilder("trainingPlan")
        .innerJoin("trainingPlan.coach", "coach")
        .innerJoin("trainingPlan.trainee", "trainee")
        .innerJoin("trainingPlan.trainingRecord", "trainingRecord")
        .where(
          "DATE_TRUNC('month', trainingRecord.createdDate) = DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')",
        )
        .andWhere("trainingPlan.planType IN (:...planTypes)", {
          planTypes: [PlanType.Personal, PlanType.FlexiblePersonal],
        })
        .select("coach.name", "coachName")
        .addSelect("trainee.name", "traineeName")
        .addSelect("trainingPlan.planType", "planType")
        .addSelect(
          "TO_CHAR(DATE_TRUNC('month', trainingRecord.createdDate), 'YYYY-MM')",
          "month",
        )
        .addSelect("trainingPlan.quota", "quota")
        .addSelect("COUNT(trainingRecord.id)", "checkinCount")
        .addSelect(
          "STRING_AGG(TO_CHAR(trainingRecord.createdDate, 'MM/DD HH24:MI'), CHR(10) ORDER BY trainingRecord.createdDate)",
          "checkinDates",
        )
        .groupBy("coach.name")
        .addGroupBy("trainee.name")
        .addGroupBy("trainingPlan.planType")
        .addGroupBy("DATE_TRUNC('month', trainingRecord.createdDate)")
        .addGroupBy("trainingPlan.quota")
        .orderBy("coach.name", "ASC")
        .addOrderBy("trainee.name", "ASC")
        .getRawMany<MonthlySummaryRaw>();

      return results.map((result) => ({
        coachName: result.coachName,
        traineeName: result.traineeName,
        planType: result.planType,
        month: result.month,
        quota: Number(result.quota),
        checkinCount: Number(result.checkinCount),
        checkinDates: result.checkinDates || "",
      }));
    } catch (error) {
      console.error("查詢教練月度簽到摘要時發生錯誤:", error);
      return [];
    }
  }

  async getSequentialMonthlySummary(): Promise<
    {
      courseName: string;
      courseTime: string;
      coachName: string;
      month: string;
      date: string;
      traineeName: string;
    }[]
  > {
    const DAY_OF_WEEK_LABEL: Record<string, string> = {
      Monday: "週一",
      Tuesday: "週二",
      Wednesday: "週三",
      Thursday: "週四",
      Friday: "週五",
      Saturday: "週六",
      Sunday: "週日",
    };

    try {
      const results = await this.trainingRecordRepository
        .createQueryBuilder("record")
        .innerJoin("record.trainingPlan", "plan")
        .innerJoin("record.trainee", "trainee")
        .innerJoin("record.openingCourse", "course")
        .innerJoin("course.coach", "coach")
        .where(
          "DATE_TRUNC('month', record.createdDate) = DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')",
        )
        .andWhere("plan.planType = :planType", {
          planType: PlanType.Sequential,
        })
        .select("course.name", "courseName")
        .addSelect("course.dayOfWeek", "dayOfWeek")
        .addSelect("course.start", "courseStart")
        .addSelect("course.end", "courseEnd")
        .addSelect("coach.name", "coachName")
        .addSelect(
          "TO_CHAR(DATE_TRUNC('month', record.createdDate), 'YYYY-MM')",
          "month",
        )
        .addSelect("TO_CHAR(record.createdDate, 'MM/DD')", "date")
        .addSelect("trainee.name", "traineeName")
        .orderBy("TO_CHAR(record.createdDate, 'MM/DD')", "ASC")
        .addOrderBy("course.name", "ASC")
        .addOrderBy("trainee.name", "ASC")
        .getRawMany<SequentialSummaryRaw>();

      return results.map((result) => ({
        courseName: result.courseName,
        courseTime: `${DAY_OF_WEEK_LABEL[result.dayOfWeek] || result.dayOfWeek} ${result.courseStart}-${result.courseEnd}`,
        coachName: result.coachName,
        month: result.month,
        date: result.date,
        traineeName: result.traineeName,
      }));
    } catch (error) {
      console.error("查詢團體課程月度摘要時發生錯誤:", error);
      return [];
    }
  }

  async getPersonalYearlySummary(): Promise<
    {
      coachName: string;
      year: string;
      totalAttendees: number;
      totalSessions: number;
    }[]
  > {
    try {
      const results = await this.trainingPlanRepository.query(`
        SELECT
          coach.name AS "coachName",
          TO_CHAR(DATE_TRUNC('year', r."createdDate"), 'YYYY') AS "year",
          COUNT(DISTINCT tp.trainee)::int AS "totalAttendees",
          COUNT(r.id)::int AS "totalSessions"
        FROM "TrainingPlan" tp
        INNER JOIN "Coach" coach ON coach.id = tp.coach
        INNER JOIN "TrainingRecord" r ON r."trainingPlan" = tp.id
        WHERE r."createdDate" >= DATE_TRUNC('year', CURRENT_DATE - INTERVAL '1 month')
          AND r."createdDate" < DATE_TRUNC('month', CURRENT_DATE)
          AND tp."planType" IN ('Personal', 'FlexiblePersonal')
        GROUP BY coach.name, DATE_TRUNC('year', r."createdDate")
        ORDER BY coach.name ASC
      `);

      return results.map((r) => ({
        coachName: r.coachName,
        year: r.year,
        totalAttendees: Number(r.totalAttendees),
        totalSessions: Number(r.totalSessions),
      }));
    } catch (error) {
      console.error("查詢個人計畫年度總結時發生錯誤:", error);
      return [];
    }
  }

  async getCoachYearlySummary(coachId: number): Promise<{
    personal: { year: string; totalAttendees: number; totalSessions: number }[];
    sequential: { year: string; totalAttendees: number; totalSessions: number }[];
  }> {
    try {
      const [personal, sequential] = await Promise.all([
        this.trainingPlanRepository.query(
          `
          SELECT
            TO_CHAR(DATE_TRUNC('year', r."createdDate"), 'YYYY') AS "year",
            COUNT(DISTINCT tp.trainee)::int AS "totalAttendees",
            COUNT(r.id)::int AS "totalSessions"
          FROM "TrainingPlan" tp
          INNER JOIN "TrainingRecord" r ON r."trainingPlan" = tp.id
          WHERE tp.coach = $1
            AND tp."planType" IN ('Personal', 'FlexiblePersonal')
            AND r."deletedDate" IS NULL
            AND tp."deletedDate" IS NULL
          GROUP BY DATE_TRUNC('year', r."createdDate")
          ORDER BY "year" DESC
          `,
          [coachId],
        ),
        this.trainingRecordRepository.query(
          `
          SELECT
            TO_CHAR(DATE_TRUNC('year', r."createdDate"), 'YYYY') AS "year",
            COUNT(DISTINCT r.trainee)::int AS "totalAttendees",
            COUNT(DISTINCT DATE_TRUNC('day', r."createdDate") || '-' || r."openingCourse")::int AS "totalSessions"
          FROM "TrainingRecord" r
          INNER JOIN "TrainingPlan" tp ON tp.id = r."trainingPlan"
          INNER JOIN "OpeningCourse" oc ON oc.id = r."openingCourse"
          WHERE oc.coach = $1
            AND tp."planType" = 'Sequential'
            AND r."deletedDate" IS NULL
            AND tp."deletedDate" IS NULL
          GROUP BY DATE_TRUNC('year', r."createdDate")
          ORDER BY "year" DESC
          `,
          [coachId],
        ),
      ]);

      return {
        personal: personal.map((r) => ({
          year: r.year,
          totalAttendees: Number(r.totalAttendees),
          totalSessions: Number(r.totalSessions),
        })),
        sequential: sequential.map((r) => ({
          year: r.year,
          totalAttendees: Number(r.totalAttendees),
          totalSessions: Number(r.totalSessions),
        })),
      };
    } catch (error) {
      console.error("查詢教練年度總結時發生錯誤:", error);
      return { personal: [], sequential: [] };
    }
  }

  async getSequentialYearlySummary(): Promise<
    {
      coachName: string;
      year: string;
      totalAttendees: number;
      totalSessions: number;
    }[]
  > {
    try {
      const results = await this.trainingRecordRepository.query(`
        SELECT
          coach.name AS "coachName",
          TO_CHAR(DATE_TRUNC('year', r."createdDate"), 'YYYY') AS "year",
          COUNT(DISTINCT r.trainee)::int AS "totalAttendees",
          COUNT(DISTINCT DATE_TRUNC('day', r."createdDate") || '-' || r."openingCourse")::int AS "totalSessions"
        FROM "TrainingRecord" r
        INNER JOIN "TrainingPlan" tp ON tp.id = r."trainingPlan"
        INNER JOIN "OpeningCourse" oc ON oc.id = r."openingCourse"
        INNER JOIN "Coach" coach ON coach.id = oc.coach
        WHERE r."createdDate" >= DATE_TRUNC('year', CURRENT_DATE - INTERVAL '1 month')
          AND r."createdDate" < DATE_TRUNC('month', CURRENT_DATE)
          AND tp."planType" = 'Sequential'
        GROUP BY coach.name, DATE_TRUNC('year', r."createdDate")
        ORDER BY coach.name ASC
      `);

      return results.map((r) => ({
        coachName: r.coachName,
        year: r.year,
        totalAttendees: Number(r.totalAttendees),
        totalSessions: Number(r.totalSessions),
      }));
    } catch (error) {
      console.error("查詢團體課程年度總結時發生錯誤:", error);
      return [];
    }
  }

  async generateMonthlySummaryPdfs(): Promise<{
    month: string;
    uploads: { label: string; url: string }[];
  } | null> {
    const [personalRows, sequentialRows, personalYearly, sequentialYearly] =
      await Promise.all([
        this.getMonthlySummary(),
        this.getSequentialMonthlySummary(),
        this.getPersonalYearlySummary(),
        this.getSequentialYearlySummary(),
      ]);

    if (personalRows.length === 0 && sequentialRows.length === 0) {
      return null;
    }

    const month = personalRows[0]?.month || sequentialRows[0]?.month;
    const uploads: { label: string; url: string }[] = [];

    if (personalRows.length > 0) {
      const pdf = await this.pdfService.generateMonthlySummaryPdf(
        month,
        personalRows,
        personalYearly,
      );
      const { url } = await put(`${month}_個人計畫簽到統計.pdf`, pdf, {
        access: "public",
        allowOverwrite: true,
      });
      uploads.push({ label: "個人計畫簽到統計", url });
    }

    if (sequentialRows.length > 0) {
      const pdf = await this.pdfService.generateSequentialSummaryPdf(
        month,
        sequentialRows,
        sequentialYearly,
      );
      const { url } = await put(`${month}_團體課程簽到統計.pdf`, pdf, {
        access: "public",
        allowOverwrite: true,
      });
      uploads.push({ label: "團體課程簽到統計", url });
    }

    return { month, uploads };
  }

  async deleteOpeningCourse(id: number): Promise<boolean> {
    try {
      await this.openingCourseRepository.softDelete(id);
      return true;
    } catch (error) {
      console.error("刪除 OpeningCourse 時發生錯誤:", error);
      return false;
    }
  }
}
