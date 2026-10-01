import { ApiProperty } from "@nestjs/swagger"
import { Transform } from "class-transformer"
import {
  IsEmail,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator"
import {
  NAME_MAX,
  NAME_MIN,
  PASSWORD_MAX,
  PASSWORD_MIN,
  PASSWORD_REGEX,
  PASSWORD_REGEX_MESSAGE,
} from "../../common/constants/validation.constants"
import { normalizeEmail, trim } from "../../common/transforms/string.transforms"

export class SignUpDto {
  @ApiProperty({ example: "jane@example.com" })
  @Transform(normalizeEmail)
  @IsEmail({}, { message: "email must be a valid email address" })
  @MaxLength(254)
  email!: string

  @ApiProperty({
    example: "Jane Doe",
    minLength: NAME_MIN,
    maxLength: NAME_MAX,
  })
  @Transform(trim)
  @IsString()
  @MinLength(NAME_MIN)
  @MaxLength(NAME_MAX)
  name!: string

  @ApiProperty({
    example: "Passw0rd!",
    minLength: PASSWORD_MIN,
    maxLength: PASSWORD_MAX,
    description: "Must include a letter, a number and a special character",
  })
  @IsString()
  @MinLength(PASSWORD_MIN)
  @MaxLength(PASSWORD_MAX)
  @Matches(PASSWORD_REGEX, { message: PASSWORD_REGEX_MESSAGE })
  password!: string
}
