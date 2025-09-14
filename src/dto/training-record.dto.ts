import { Type } from "class-transformer";
import {
  IsNotEmpty,
  IsNumber,
  Matches,
  IsOptional,
  IsDate,
} from "class-validator";

export class TrainingRecordDto {
  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  trainee: number;

  @IsOptional()
  @Matches(/^\d{4}\/\d{2}$/)
  yearMonth?: string;
}

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
