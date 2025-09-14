import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { IdDto } from "../dto/id.dto";
import { TraineeDto } from "../dto/trainee.dto";
import { SocialIdDto } from "../dto/social-id.dto";
import { Trainee } from "../entities/trainee.entity";
import { DataService } from "../services/data.service";
import { Coach } from "../entities/coach.entity";
import { TrainingPlanDto } from "../dto/training-plan.dto";
import {
  TrainingRecordDto,
  UpdateTrainingRecordDto,
} from "../dto/training-record.dto";
import { TrainingRecord } from "../entities/training-record.entity";
import { OpeningCourseDto } from "../dto/opening-sourse.dto";
import { OpeningCourse } from "../entities/opening-course.entity";

@Controller()
export class DataController {
  constructor(private readonly dataService: DataService) {}

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

  @Get("trainees")
  async getTrainees(): Promise<Trainee[]> {
    return this.dataService.getTrainees();
  }

  @Get("coaches")
  async getCoaches(): Promise<Coach[]> {
    return this.dataService.getCoaches();
  }

  @Post("trainee/info/:socialId")
  async postTraineeInfo(
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
    @Query() param: TrainingRecordDto
  ): Promise<TrainingRecord[]> {
    return this.dataService.getTrainingRecords(param);
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

  @Delete("openingCourse/:id")
  async deleteOpeningCourse(@Param() param: IdDto): Promise<Boolean> {
    return this.dataService.deleteOpeningCourse(param.id);
  }
}
