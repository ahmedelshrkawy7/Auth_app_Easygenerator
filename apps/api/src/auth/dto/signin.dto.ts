import { ApiProperty } from "@nestjs/swagger"
import { Transform } from "class-transformer"
import { IsEmail, IsNotEmpty, IsString, MaxLength } from "class-validator"
import { PASSWORD_MAX } from "../../common/constants/validation.constants"
import { normalizeEmail } from "../../common/transforms/string.transforms"

// Only presence/shape checks: strength rules may change after sign-up.
export class SignInDto {
  @ApiProperty({ example: "jane@example.com" })
  @Transform(normalizeEmail)
  @IsEmail({}, { message: "email must be a valid email address" })
  email!: string

  @ApiProperty({ example: "Passw0rd!" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(PASSWORD_MAX)
  password!: string
}
