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

interface GroupFitnessYearlySummaryRaw {
  coachName: string;
  year: string;
  totalAttendees: string;
  totalSessions: string;
}

interface GroupFitnessSummaryRaw {
  courseId: string | null;
  courseName: string | null;
  dayOfWeek: string | null;
  courseStart: string | null;
  courseEnd: string | null;
  coachName: string | null;
  planCoachName: string | null;
  month: string;
  date: string;
  traineeName: string;
}

/**
 * 課表順序（週一～週日）。不直接 ORDER BY dayOfWeek：
 * 那是字串比較，會排成 Friday, Monday, Saturday…
 */
const DAY_OF_WEEK_ORDER =
  `CASE "openingCourse"."dayOfWeek" ` +
  `WHEN 'Monday' THEN 1 WHEN 'Tuesday' THEN 2 WHEN 'Wednesday' THEN 3 ` +
  `WHEN 'Thursday' THEN 4 WHEN 'Friday' THEN 5 WHEN 'Saturday' THEN 6 ` +
  `WHEN 'Sunday' THEN 7 ELSE 8 END`;

interface GroupFitnessIdleCourseRaw {
  courseId: string;
  courseName: string;
  dayOfWeek: string;
  courseStart: string;
  courseEnd: string;
  coachName: string | null;
  month: string;
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
      // 團體課程不指定教練，授課教練是看簽到紀錄掛的開課
      const coach = body.coach
        ? await this.coachRepository.findOneBy({ id: body.coach })
        : null;
      const editor = await this.coachRepository.findOneBy({ id: body.editor });

      if (!trainee || !editor || (body.coach && !coach)) {
        return false;
      }

      // 建立訓練計畫
      const trainingPlan = this.trainingPlanRepository.create({
        planType: body.planType,
        quota: body.quota,
        trainee: trainee,
        coach: coach,
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
      // 團體課程不指定教練，改成團體課程時也要一併清掉原本的教練
      const coach = body.coach
        ? await this.coachRepository.findOne({
            where: { id: body.coach },
          })
        : null;
      const editor = await this.coachRepository.findOne({
        where: { id: body.editor },
      });

      if (!editor || (body.coach && !coach)) {
        return false;
      }

      // 更新 TrainingPlan 基本資料
      await this.trainingPlanRepository.update(
        { id },
        {
          planType: body.planType,
          quota: body.quota,
          coach: coach,
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

      // 團體課程要一併掛上開課，教練歸屬才查得到
      const openingCourse = body.openingCourse
        ? await this.openingCourseRepository.findOneBy({
            id: body.openingCourse,
          })
        : null;

      if (body.openingCourse && !openingCourse) {
        return false;
      }

      // 建立訓練紀錄
      const trainingRecord = this.trainingRecordRepository.create({
        trainee: trainee,
        trainingPlan: trainingPlan,
        editor: editor,
        openingCourse: openingCourse,
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

      // 開課決定團體課程的授課教練：帶 id 就換綁、帶 null 就解除、沒帶則維持原狀
      let openingCourse: OpeningCourse | null | undefined;
      if (body.openingCourse === null) {
        openingCourse = null;
      } else if (body.openingCourse !== undefined) {
        openingCourse = await this.openingCourseRepository.findOneBy({
          id: body.openingCourse,
        });

        if (!openingCourse) {
          return false;
        }
      }

      // 更新訓練紀錄
      await this.trainingRecordRepository.update(
        { id },
        {
          trainingPlan: trainingPlan,
          editor: editor,
          createdDate: body.date,
          ...(openingCourse !== undefined
            ? { openingCourse: openingCourse }
            : {}),
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
      // createdDate 以 UTC 儲存，先轉成台北時區再格式化/分組/篩選，避免跨日邊界歸錯月份
      // 別名必須加雙引號：TypeORM 產生的 JOIN 別名為 "trainingRecord"（大小寫敏感），
      // 未加引號會被 PostgreSQL 折疊成小寫而找不到對應表
      const localCreated = `("trainingRecord"."createdDate" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Taipei')`;
      const lastMonth = `DATE_TRUNC('month', (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Taipei') - INTERVAL '1 month')`;
      // 查詢個人教練計畫的上月簽到摘要，含簽到日期
      const results = await this.trainingPlanRepository
        .createQueryBuilder("trainingPlan")
        .innerJoin("trainingPlan.coach", "coach")
        .innerJoin("trainingPlan.trainee", "trainee")
        .innerJoin("trainingPlan.trainingRecord", "trainingRecord")
        .where(`DATE_TRUNC('month', ${localCreated}) = ${lastMonth}`)
        .andWhere("trainingPlan.planType IN (:...planTypes)", {
          planTypes: [
            PlanType.PrivateTraining,
            PlanType.FlexPrivate,
            PlanType.SemiPrivate,
          ],
        })
        .select("coach.name", "coachName")
        .addSelect("trainee.name", "traineeName")
        .addSelect("trainingPlan.planType", "planType")
        .addSelect(
          `TO_CHAR(DATE_TRUNC('month', ${localCreated}), 'YYYY-MM')`,
          "month",
        )
        .addSelect("trainingPlan.quota", "quota")
        .addSelect("COUNT(trainingRecord.id)", "checkinCount")
        .addSelect(
          `STRING_AGG(TO_CHAR(${localCreated}, 'MM/DD'), CHR(10) ORDER BY ${localCreated})`,
          "checkinDates",
        )
        .groupBy("coach.name")
        .addGroupBy("trainee.name")
        .addGroupBy("trainingPlan.planType")
        .addGroupBy(`DATE_TRUNC('month', ${localCreated})`)
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
      // 不吞掉錯誤，避免查詢失敗被誤判成「無上月資料」
      console.error("查詢教練月度簽到摘要時發生錯誤:", error);
      throw error;
    }
  }

  /** 未指定 openingCourse 的簽到共用的課程代號，讓它們自成一頁而不是被丟掉 */
  private static readonly UNASSIGNED_COURSE_ID = 0;

  async getGroupFitnessMonthlySummary(): Promise<
    {
      courseId: number;
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
      // createdDate 以 UTC 儲存，先轉成台北時區再格式化/分組/篩選，避免跨日邊界歸錯月份
      // 別名必須加雙引號：TypeORM 產生的 JOIN 別名大小寫敏感，
      // 未加引號會被 PostgreSQL 折疊成小寫而找不到對應表
      const localCreated = `("trainingRecord"."createdDate" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Taipei')`;
      const lastMonth = `DATE_TRUNC('month', (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Taipei') - INTERVAL '1 month')`;
      // openingCourse 一律用 leftJoin：簽到時漏選課程的紀錄照樣扣了學員額度，
      // 用 innerJoin 會讓它們從報表上無聲消失，改為歸入「未指定課程」讓人看得到並補資料
      const results = await this.trainingRecordRepository
        .createQueryBuilder("trainingRecord")
        .innerJoin("trainingRecord.trainingPlan", "trainingPlan")
        .innerJoin("trainingRecord.trainee", "trainee")
        .leftJoin("trainingRecord.openingCourse", "openingCourse")
        .leftJoin("openingCourse.coach", "coach")
        .leftJoin("trainingPlan.coach", "planCoach")
        .where(`DATE_TRUNC('month', ${localCreated}) = ${lastMonth}`)
        .andWhere("trainingPlan.planType = :planType", {
          planType: PlanType.GroupFitness,
        })
        .select("openingCourse.id", "courseId")
        .addSelect("openingCourse.name", "courseName")
        .addSelect("openingCourse.dayOfWeek", "dayOfWeek")
        .addSelect("openingCourse.start", "courseStart")
        .addSelect("openingCourse.end", "courseEnd")
        .addSelect("coach.name", "coachName")
        .addSelect("planCoach.name", "planCoachName")
        .addSelect(
          `TO_CHAR(DATE_TRUNC('month', ${localCreated}), 'YYYY-MM')`,
          "month",
        )
        .addSelect(`TO_CHAR(${localCreated}, 'MM/DD')`, "date")
        .addSelect("trainee.name", "traineeName")
        // 這個順序同時決定 PDF 的頁序與列序：
        // 先依週次、時段排出課表順序（課程頁的先後），同一堂課內部再依日期排（列的先後）。
        // 同名課程可能有多個時段，需再依 id 分開，否則後續會被當成同一堂課
        .orderBy(DAY_OF_WEEK_ORDER, "ASC")
        .addOrderBy("openingCourse.start", "ASC")
        .addOrderBy("openingCourse.id", "ASC")
        .addOrderBy(`TO_CHAR(${localCreated}, 'MM/DD')`, "ASC")
        .addOrderBy("trainee.name", "ASC")
        .getRawMany<GroupFitnessSummaryRaw>();

      const mapped = results.map((result) => ({
        courseId: Number(result.courseId ?? DataService.UNASSIGNED_COURSE_ID),
        courseName: result.courseName ?? "未指定課程",
        courseTime: result.courseId
          ? `${DAY_OF_WEEK_LABEL[result.dayOfWeek] || result.dayOfWeek} ${result.courseStart}-${result.courseEnd}`
          : "",
        // 沒有開課教練可循時，退而顯示計畫的負責教練，至少知道該找誰補資料
        coachName: result.coachName ?? result.planCoachName ?? "未指定",
        month: result.month,
        date: result.date,
        traineeName: result.traineeName,
      }));

      // 當月一個人都沒來的課程同樣要有一頁，否則報表看不出「有開課但沒人上」，
      // 只會整堂消失。用 date/traineeName 留空的佔位列表示，PdfService 會印成 0 人次
      const attendedCourseIds = new Set(
        mapped
          .filter((row) => row.courseId !== DataService.UNASSIGNED_COURSE_ID)
          .map((row) => row.courseId),
      );
      const idleCourses = await this.openingCourseRepository
        .createQueryBuilder("openingCourse")
        .leftJoin("openingCourse.coach", "coach")
        // 報表月之後才建立的課程不該回溯出現在當月報表
        .where(
          `("openingCourse"."createdDate" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Taipei') < ${lastMonth} + INTERVAL '1 month'`,
        )
        .select("openingCourse.id", "courseId")
        .addSelect("openingCourse.name", "courseName")
        .addSelect("openingCourse.dayOfWeek", "dayOfWeek")
        .addSelect("openingCourse.start", "courseStart")
        .addSelect("openingCourse.end", "courseEnd")
        .addSelect("coach.name", "coachName")
        .addSelect(`TO_CHAR(${lastMonth}, 'YYYY-MM')`, "month")
        .orderBy(DAY_OF_WEEK_ORDER, "ASC")
        .addOrderBy("openingCourse.start", "ASC")
        .addOrderBy("openingCourse.id", "ASC")
        .getRawMany<GroupFitnessIdleCourseRaw>();

      const idleRows = idleCourses
        .filter((raw) => !attendedCourseIds.has(Number(raw.courseId)))
        .map((raw) => ({
          courseId: Number(raw.courseId),
          courseName: raw.courseName,
          courseTime: `${DAY_OF_WEEK_LABEL[raw.dayOfWeek] || raw.dayOfWeek} ${raw.courseStart}-${raw.courseEnd}`,
          coachName: raw.coachName ?? "未指定",
          month: raw.month,
          date: "",
          traineeName: "",
        }));

      // idleCourses 查的是全部課程且已依週次、時段排序，索引即課表順序
      const scheduleOrder = new Map<number, number>(
        idleCourses.map((raw, index) => [Number(raw.courseId), index]),
      );

      // 有人上的課與沒人上的課要一起依課表排，不能把後者整批接在末尾，
      // 否則週二的空堂會排到週六後面。sort 是穩定的，同一堂課內部維持 SQL 的日期順序
      const scheduled = [
        ...mapped.filter(
          (row) => row.courseId !== DataService.UNASSIGNED_COURSE_ID,
        ),
        ...idleRows,
      ].sort(
        (a, b) =>
          (scheduleOrder.get(a.courseId) ?? Number.MAX_SAFE_INTEGER) -
          (scheduleOrder.get(b.courseId) ?? Number.MAX_SAFE_INTEGER),
      );

      // 「未指定課程」沒有時段可排，殿後
      return [
        ...scheduled,
        ...mapped.filter(
          (row) => row.courseId === DataService.UNASSIGNED_COURSE_ID,
        ),
      ];
    } catch (error) {
      console.error("查詢團體課程月度摘要時發生錯誤:", error);
      return [];
    }
  }

  async getPrivateTrainingYearlySummary(): Promise<
    {
      coachName: string;
      year: string;
      totalAttendees: number;
      totalSessions: number;
    }[]
  > {
    try {
      // createdDate 以 UTC 儲存，先轉成台北時區再分組/篩選
      // 軟刪除必須自己排除：raw SQL 不像 QueryBuilder 會自動補上 deletedDate IS NULL，
      // 少了這兩行，年度總結頁會比同一份報表的月份明細多算已刪除的簽到
      const results = await this.trainingPlanRepository.query(`
        SELECT
          coach.name AS "coachName",
          TO_CHAR(DATE_TRUNC('year', trainingRecord."createdDate" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Taipei'), 'YYYY') AS "year",
          COUNT(DISTINCT trainingPlan.trainee)::int AS "totalAttendees",
          COUNT(trainingRecord.id)::int AS "totalSessions"
        FROM "TrainingPlan" trainingPlan
        INNER JOIN "Coach" coach ON coach.id = trainingPlan.coach
        INNER JOIN "TrainingRecord" trainingRecord ON trainingRecord."trainingPlan" = trainingPlan.id
        WHERE (trainingRecord."createdDate" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Taipei') >= DATE_TRUNC('year', (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Taipei') - INTERVAL '1 month')
          AND (trainingRecord."createdDate" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Taipei') < DATE_TRUNC('month', (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Taipei'))
          AND trainingPlan."planType" IN ('PrivateTraining', 'FlexPrivate', 'SemiPrivate')
          AND trainingRecord."deletedDate" IS NULL
          AND trainingPlan."deletedDate" IS NULL
        GROUP BY coach.name, DATE_TRUNC('year', trainingRecord."createdDate" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Taipei')
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
    privateTraining: {
      year: string;
      totalAttendees: number;
      totalSessions: number;
    }[];
    groupFitness: {
      year: string;
      totalAttendees: number;
      totalSessions: number;
    }[];
  }> {
    try {
      const [privateTraining, groupFitness] = await Promise.all([
        this.trainingPlanRepository.query(
          `
          SELECT
            TO_CHAR(DATE_TRUNC('year', trainingRecord."createdDate" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Taipei'), 'YYYY') AS "year",
            COUNT(DISTINCT trainingPlan.trainee)::int AS "totalAttendees",
            COUNT(trainingRecord.id)::int AS "totalSessions"
          FROM "TrainingPlan" trainingPlan
          INNER JOIN "TrainingRecord" trainingRecord ON trainingRecord."trainingPlan" = trainingPlan.id
          WHERE trainingPlan.coach = $1
            AND trainingPlan."planType" IN ('PrivateTraining', 'FlexPrivate', 'SemiPrivate')
            AND trainingRecord."deletedDate" IS NULL
            AND trainingPlan."deletedDate" IS NULL
          GROUP BY DATE_TRUNC('year', trainingRecord."createdDate" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Taipei')
          ORDER BY "year" DESC
          `,
          [coachId],
        ),
        this.trainingRecordRepository.query(
          `
          SELECT
            TO_CHAR(DATE_TRUNC('year', trainingRecord."createdDate" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Taipei'), 'YYYY') AS "year",
            COUNT(DISTINCT trainingRecord.trainee)::int AS "totalAttendees",
            COUNT(DISTINCT DATE_TRUNC('day', trainingRecord."createdDate" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Taipei') || '-' || trainingRecord."openingCourse")::int AS "totalSessions"
          FROM "TrainingRecord" trainingRecord
          INNER JOIN "TrainingPlan" trainingPlan ON trainingPlan.id = trainingRecord."trainingPlan"
          INNER JOIN "OpeningCourse" openingCourse ON openingCourse.id = trainingRecord."openingCourse"
          WHERE openingCourse.coach = $1
            AND trainingPlan."planType" = 'GroupFitness'
            AND trainingRecord."deletedDate" IS NULL
            AND trainingPlan."deletedDate" IS NULL
          GROUP BY DATE_TRUNC('year', trainingRecord."createdDate" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Taipei')
          ORDER BY "year" DESC
          `,
          [coachId],
        ),
      ]);

      return {
        privateTraining: privateTraining.map((r) => ({
          year: r.year,
          totalAttendees: Number(r.totalAttendees),
          totalSessions: Number(r.totalSessions),
        })),
        groupFitness: groupFitness.map((r) => ({
          year: r.year,
          totalAttendees: Number(r.totalAttendees),
          totalSessions: Number(r.totalSessions),
        })),
      };
    } catch (error) {
      console.error("查詢教練年度總結時發生錯誤:", error);
      return { privateTraining: [], groupFitness: [] };
    }
  }

  async getGroupFitnessYearlySummary(): Promise<
    {
      coachName: string;
      year: string;
      totalAttendees: number;
      totalSessions: number;
    }[]
  > {
    try {
      // createdDate 以 UTC 儲存，先轉成台北時區再分組/篩選
      // 軟刪除必須自己排除：raw SQL 不像 QueryBuilder 會自動補上 deletedDate IS NULL，
      // 少了這兩行，年度總結頁會比同一份報表的月份明細多算已刪除的簽到
      const results = await this.trainingRecordRepository.query(`
        SELECT
          coach.name AS "coachName",
          TO_CHAR(DATE_TRUNC('year', trainingRecord."createdDate" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Taipei'), 'YYYY') AS "year",
          COUNT(DISTINCT trainingRecord.trainee)::int AS "totalAttendees",
          COUNT(DISTINCT DATE_TRUNC('day', trainingRecord."createdDate" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Taipei') || '-' || trainingRecord."openingCourse")::int AS "totalSessions"
        FROM "TrainingRecord" trainingRecord
        INNER JOIN "TrainingPlan" trainingPlan ON trainingPlan.id = trainingRecord."trainingPlan"
        INNER JOIN "OpeningCourse" openingCourse ON openingCourse.id = trainingRecord."openingCourse"
        INNER JOIN "Coach" coach ON coach.id = openingCourse.coach
        WHERE (trainingRecord."createdDate" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Taipei') >= DATE_TRUNC('year', (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Taipei') - INTERVAL '1 month')
          AND (trainingRecord."createdDate" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Taipei') < DATE_TRUNC('month', (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Taipei'))
          AND trainingPlan."planType" = 'GroupFitness'
          AND trainingRecord."deletedDate" IS NULL
          AND trainingPlan."deletedDate" IS NULL
        GROUP BY coach.name, DATE_TRUNC('year', trainingRecord."createdDate" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Taipei')
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
    const [
      privateTrainingRows,
      groupFitnessRows,
      privateTrainingYearly,
      groupFitnessYearly,
    ] = await Promise.all([
      this.getMonthlySummary(),
      this.getGroupFitnessMonthlySummary(),
      this.getPrivateTrainingYearlySummary(),
      this.getGroupFitnessYearlySummary(),
    ]);

    if (privateTrainingRows.length === 0 && groupFitnessRows.length === 0) {
      return null;
    }

    const month = privateTrainingRows[0]?.month || groupFitnessRows[0]?.month;
    const uploads: { label: string; url: string }[] = [];

    if (privateTrainingRows.length > 0) {
      const pdf = await this.pdfService.generateMonthlySummaryPdf(
        month,
        privateTrainingRows,
        privateTrainingYearly,
      );
      const { url } = await put(`${month}_個人計畫簽到統計.pdf`, pdf, {
        access: "public",
        allowOverwrite: true,
        cacheControlMaxAge: 60, // 縮短快取，避免重新產生後仍下載到舊報表
      });
      uploads.push({ label: "個人計畫簽到統計", url });
    }

    if (groupFitnessRows.length > 0) {
      const pdf = await this.pdfService.generateGroupFitnessSummaryPdf(
        month,
        groupFitnessRows,
        groupFitnessYearly,
      );
      const { url } = await put(`${month}_團體課程簽到統計.pdf`, pdf, {
        access: "public",
        allowOverwrite: true,
        cacheControlMaxAge: 60, // 縮短快取，避免重新產生後仍下載到舊報表
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
