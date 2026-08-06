import { Type } from "class-transformer";
import { IsNotEmpty, IsNumber, IsOptional, IsDate } from "class-validator";

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

  // 團體課程的授課教練掛在開課上，沒帶這個欄位就查不到是誰上的課
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  openingCourse?: number | null;
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

  // null 代表要解除開課綁定（改成非團體課程的計畫時）
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  openingCourse?: number | null;
}
