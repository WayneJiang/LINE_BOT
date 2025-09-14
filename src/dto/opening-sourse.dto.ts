import { Type } from "class-transformer";
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsNumber,
} from "class-validator";
import { DayOfWeek } from "src/enums/enum-constant";

export class OpeningCourseDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(DayOfWeek)
  @IsNotEmpty()
  dayOfWeek: DayOfWeek;

  @IsString()
  @IsNotEmpty()
  start: string;

  @IsString()
  @IsNotEmpty()
  end: string;

  @IsString()
  @IsOptional()
  note: string;

  @IsNumber()
  @Type(() => Number)
  coach: number;
}
