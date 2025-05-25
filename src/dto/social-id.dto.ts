import { IsNotEmpty, IsString } from "class-validator";

export class SocialIdDto {
    @IsString()
    @IsNotEmpty()
    socialId: string;
}