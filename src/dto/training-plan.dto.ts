import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  Min,
  IsArray,
  ValidateNested,
  ValidateIf,
} from "class-validator";
import { PlanType } from "src/enums/enum-constant";
import { Type } from "class-transformer";
import { TrainingTimeSlotDto } from "./training-time-slot.dto";

export class TrainingPlanDto {
  @IsEnum(PlanType)
  @IsNotEmpty()
  planType: PlanType;

  @IsNumber()
  @Min(1)
  @Type(() => Number)
  quota: number;

  @ValidateIf(
    (body: TrainingPlanDto) =>
      body.planType == PlanType.PrivateTraining ||
      body.planType == PlanType.SemiPrivate ||
      body.planType == PlanType.GroupFitness,
  )
  @IsArray()
  @IsNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => TrainingTimeSlotDto)
  trainingTimeSlot?: TrainingTimeSlotDto[];

  @IsNumber()
  @Type(() => Number)
  trainee: number;

  // 團體課程的授課教練掛在開課上，計畫層級不指定教練
  @ValidateIf((body: TrainingPlanDto) => body.planType != PlanType.GroupFitness)
  @IsNumber()
  @Type(() => Number)
  coach?: number;

  @IsNumber()
  @Type(() => Number)
  editor: number;
}
