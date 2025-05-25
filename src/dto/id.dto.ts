import { Transform } from "class-transformer";
import { IsNumber } from "class-validator";

export class IdDto {
    @IsNumber()
    @Transform(({ value }) => +value)
    id: number;
}