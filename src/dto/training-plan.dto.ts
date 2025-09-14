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
  planQuota: number;

  @ValidateIf(
    (body) =>
      body.planType == PlanType.Personal || body.planType == PlanType.Sequential
  )
  @IsArray()
  @IsNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => TrainingTimeSlotDto)
  trainingTimeSlot?: TrainingTimeSlotDto[];

  @IsNumber()
  @Type(() => Number)
  trainee: number;

  @IsNumber()
  @Type(() => Number)
  coach: number;

  @IsNumber()
  @Type(() => Number)
  editor: number;
}
