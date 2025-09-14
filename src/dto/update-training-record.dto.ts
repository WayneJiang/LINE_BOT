import { Type } from "class-transformer";
import { IsNotEmpty, IsNumber, IsDate, IsOptional } from "class-validator";

export class UpdateTrainingRecordDto {
  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  @IsOptional()
  trainingPlan: number;

  @IsDate()
  @IsNotEmpty()
  @Type(() => Date)
  @IsOptional()
  date: Date;

  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  editor: number;
}
