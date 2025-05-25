import { IsEnum, IsNotEmpty, IsNumber, IsString, Matches, Max, Min } from "class-validator";
import { Gender } from "src/enums/enum-constant";
import { Type } from "class-transformer";

export class TraineeDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsNumber()
    @Min(100.0)
    @Max(250.0)
    @Type(() => Number)
    height: number;

    @IsNumber()
    @Min(30.0)
    @Max(300.0)
    @Type(() => Number)
    weight: number;

    @IsEnum(Gender)
    gender: Gender;

    @IsString()
    @Matches(/^\d{4}-\d{2}-\d{2}$/)
    birthday: string;

    @IsString()
    @Matches(/^\d{4}-\d{3}-\d{3}$/)
    phone: string;
}