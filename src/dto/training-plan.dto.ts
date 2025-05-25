import { IsEnum, IsNotEmpty, IsNumber, Min } from "class-validator";
import { PlanType } from "src/enums/enum-constant";
import { Type } from "class-transformer";

export class TrainingPlanDto {
  @IsEnum(PlanType)
  @IsNotEmpty()
  planType: PlanType;

  @IsNumber()
  @Min(1)
  @Type(() => Number)
  planQuota: number;

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
