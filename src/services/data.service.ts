import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { TraineeDto } from "src/dto/trainee.dto";
import { TrainingPlanDto } from "src/dto/training-plan.dto";
import { Coach } from "src/entities/coach.entity";
import { Trainee } from "src/entities/trainee.entity";
import { TrainingPlan } from "src/entities/training-plan.entity";
import { Repository } from "typeorm";

@Injectable()
export class DataService {
  constructor(
    @InjectRepository(Trainee)
    private traineeRepository: Repository<Trainee>,
    @InjectRepository(Coach)
    private coachRepository: Repository<Coach>,
    @InjectRepository(TrainingPlan)
    private trainingPlanRepository: Repository<TrainingPlan>
  ) {}

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
    return this.coachRepository
      .createQueryBuilder("coach")
      .andWhere("coach.id = :id", { id: id })
      .getOne();
  }

  async getByTraineeId(id: number): Promise<Trainee> {
    return this.traineeRepository
      .createQueryBuilder("trainee")
      .leftJoinAndSelect("trainee.trainingPlan", "trainingPlanList")
      .leftJoinAndSelect("trainingPlanList.coach", "planCoach")
      .leftJoinAndSelect("trainingPlanList.editor", "editor")
      .leftJoinAndSelect("trainee.trainingRecord", "trainingRecord")
      .leftJoinAndSelect("trainingRecord.trainingPlan", "recordTrainingPlan")
      .leftJoinAndSelect("recordTrainingPlan.coach", "recordCoach")
      .andWhere("trainee.id = :id", { id: id })
      .orderBy("trainingRecord.id", "DESC")
      .getOne();
  }

  async getTrainees(): Promise<Trainee[]> {
    return this.traineeRepository
      .createQueryBuilder("trainee")
      .leftJoinAndSelect("trainee.trainingPlan", "trainingPlan")
      .leftJoinAndSelect("trainingPlan.coach", "coach")
      .leftJoinAndSelect("trainee.trainingRecord", "trainingRecord")
      .orderBy("trainee.id", "ASC")
      .getMany();
  }

  async getCoaches(): Promise<Coach[]> {
    return this.coachRepository.find({ order: { id: "ASC" } });
  }

  async createTrainee(socialId: string, body: TraineeDto): Promise<Boolean> {
    try {
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
      console.log(error);
      return false;
    }
  }

  async updateTrainee(id: number, body: TraineeDto): Promise<Boolean> {
    try {
      const result = await this.traineeRepository.update(
        { id },
        {
          name: body.name,
          birthday: body.birthday,
          gender: body.gender,
          height: body.height,
          weight: body.weight,
          phone: body.phone,
        }
      );

      if (result.affected == 0) {
        return false;
      }

      return true;
    } catch (error) {
      console.log(error);
      return false;
    }
  }

  async createTrainingPlan(body: TrainingPlanDto): Promise<Boolean> {
    try {
      const trainee = await this.traineeRepository.findOneBy({
        id: body.trainee,
      });
      if (!trainee) {
        return false;
      }

      const coach = await this.coachRepository.findOneBy({ id: body.coach });
      if (!coach) {
        return false;
      }

      const editor = await this.coachRepository.findOneBy({ id: body.editor });
      if (!editor) {
        return false;
      }

      const trainingPlan = this.trainingPlanRepository.create({
        planType: body.planType,
        planQuota: body.planQuota,
        trainee: trainee,
        coach: coach,
        editor: editor,
      });

      await this.trainingPlanRepository.save(trainingPlan);

      return true;
    } catch (error) {
      console.log(error);
      return false;
    }
  }

  async updateTrainingPlan(
    id: number,
    body: TrainingPlanDto
  ): Promise<Boolean> {
    try {
      const trainingPlan = await this.trainingPlanRepository.findOneBy({
        id: id,
      });
      if (!trainingPlan) {
        return false;
      }

      const coach = await this.coachRepository.findOneBy({ id: body.coach });
      if (!coach) {
        return false;
      }

      const editor = await this.coachRepository.findOneBy({ id: body.editor });
      if (!editor) {
        return false;
      }

      trainingPlan.coach = coach;
      trainingPlan.planType = body.planType;
      trainingPlan.planQuota = body.planQuota;
      trainingPlan.editor = editor;

      await this.trainingPlanRepository.save(trainingPlan);

      return true;
    } catch (error) {
      console.log(error);
      return false;
    }
  }
}
