import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from "class-validator";
import { CoachType } from "src/enums/enum-constant";

export class CoachDto {
  @IsString()
  @IsOptional()
  socialId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(CoachType)
  coachType: CoachType;
}
