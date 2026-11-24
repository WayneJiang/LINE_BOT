import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  Min,
  IsArray,
  ValidateNested,
  ValidateIf,
  IsString,
  MaxLength,
  Matches,
} from "class-validator";
import { PlanType } from "src/enums/enum-constant";
import { Transform, Type } from "class-transformer";
import { TrainingTimeSlotDto } from "./training-time-slot.dto";

export class TrainingPlanDto {
  @IsEnum(PlanType)
  @IsNotEmpty()
  planType: PlanType;

  @IsNumber()
  @Min(1)
  @Type(() => Number)
  quota: number;

  @ValidateIf(
    (body: TrainingPlanDto) =>
      body.planType == PlanType.PrivateTraining ||
      body.planType == PlanType.SemiPrivate ||
      body.planType == PlanType.GroupFitness,
  )
  @IsArray()
  @IsNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => TrainingTimeSlotDto)
  trainingTimeSlot?: TrainingTimeSlotDto[];

  @IsNumber()
  @Type(() => Number)
  trainee: number;

  // 團體課程的授課教練掛在開課上，計畫層級不指定教練
  @ValidateIf((body: TrainingPlanDto) => body.planType != PlanType.GroupFitness)
  @IsNumber()
  @Type(() => Number)
  coach?: number;

  @IsNumber()
  @Type(() => Number)
  editor: number;

  // 備註：正規化只在這裡做（NFC、統一換行、trim）；超長字串跳過正規化，直接由 MaxLength 拒絕
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" && value.length <= 1000
      ? value.normalize("NFC").replace(/\r\n?/g, "\n").trim()
      : value,
  )
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @MaxLength(100)
  @Matches(
    /^(?:[\t\n\u{200D}]|[^\p{Cc}\p{Cf}\p{Cs}\p{Co}\p{Cn}\u{2028}\u{2029}])*$/u,
    {
      message: "備註不可包含控制字元或隱形字元",
    },
  )
  note?: string;
}
