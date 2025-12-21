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
import { CoachType, PlanType } from "src/enums/enum-constant";
import { Coach } from "src/entities/coach.entity";
import { OpeningCourse } from "src/entities/opening-course.entity";
import { Trainee } from "src/entities/trainee.entity";
import { TrainingPlan } from "src/entities/training-plan.entity";
import { TrainingRecord } from "src/entities/training-record.entity";
import { TrainingTimeSlot } from "src/entities/training-time-slot.entity";
import { Repository } from "typeorm";
import { CoachDto } from "src/dto/coach.dto";

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
    private openingCourseRepository: Repository<OpeningCourse>
  ) { }

  async getBySocialId(
    socialId: string
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
        "trainingTimeSlot"
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
        coachType: body.coachType
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
          socialId: body.socialId
        }
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
        }
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
      const [trainee, coach, editor] = await Promise.all([
        this.traineeRepository.findOneBy({ id: body.trainee }),
        body.planType === PlanType.Block
          ? Promise.resolve(null)
          : this.coachRepository.findOneBy({ id: body.coach }),
        this.coachRepository.findOneBy({ id: body.editor }),
      ]);

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
          })
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
    body: TrainingPlanDto
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
      const [coach, editor] = await Promise.all([
        body.planType === PlanType.Block
          ? Promise.resolve(null)
          : this.coachRepository.findOne({ where: { id: body.coach } }),
        this.coachRepository.findOne({ where: { id: body.editor } }),
      ]);

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
        }
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
          })
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

  async getTrainingRecords(
    body: GetTrainingRecordDto
  ): Promise<{ data: TrainingRecord[]; totalPages: number; currentPage: number }> {
    try {
      const pageSize = 30;
      const page = body.page || 1;
      const skip = (page - 1) * pageSize;

      const queryBuilder = this.trainingRecordRepository
        .createQueryBuilder("trainingRecord")
        .leftJoinAndSelect("trainingRecord.trainingPlan", "trainingPlan")
        .leftJoinAndSelect("trainingPlan.coach", "coach")
        .leftJoinAndSelect("trainingRecord.editor", "editor")
        .where("trainingRecord.trainee = :trainee", { trainee: body.trainee })
        .orderBy("trainingRecord.id", "DESC");

      // 取得總筆數
      const totalCount = await queryBuilder.getCount();

      // 計算總頁數
      const totalPages = Math.ceil(totalCount / pageSize);

      // 取得分頁資料
      const data = await queryBuilder
        .skip(skip)
        .take(pageSize)
        .getMany();

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
    body: UpdateTrainingRecordDto
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
        }
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
    body: OpeningCourseDto
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
