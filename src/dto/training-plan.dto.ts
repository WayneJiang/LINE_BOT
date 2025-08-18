import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  Min,
  IsArray,
  ValidateNested,
} from "class-validator";
import { PlanType } from "src/enums/enum-constant";
import { Type } from "class-transformer";
import { TrainingSlotDto } from "./training-slot.dto";

export class TrainingPlanDto {
  @IsEnum(PlanType)
  @IsNotEmpty()
  planType: PlanType;

  @IsNumber()
  @Min(1)
  @Type(() => Number)
  planQuota: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TrainingSlotDto)
  trainingSlot: TrainingSlotDto[];

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
