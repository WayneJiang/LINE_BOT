import { IsString, IsNotEmpty, IsEnum } from "class-validator";
import { DayOfWeek } from "src/enums/enum-constant";

export class TrainingTimeSlotDto {
  @IsEnum(DayOfWeek)
  @IsNotEmpty()
  dayOfWeek: DayOfWeek;

  @IsString()
  @IsNotEmpty()
  start: string;

  @IsString()
  @IsNotEmpty()
  end: string;
}
