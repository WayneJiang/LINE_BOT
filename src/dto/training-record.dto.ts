import { Type } from "class-transformer";
import {
  IsNotEmpty,
  IsNumber,
  Matches,
  IsOptional,
  IsDate,
} from "class-validator";

export class GetTrainingRecordDto {
  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  trainee: number;

  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  page: number;
}

export class CreateTrainingRecordDto {
  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  trainee: number;

  @IsDate()
  @IsNotEmpty()
  @Type(() => Date)
  @IsOptional()
  date: Date;

  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  editor: number;

  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  trainingPlan: number;
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
