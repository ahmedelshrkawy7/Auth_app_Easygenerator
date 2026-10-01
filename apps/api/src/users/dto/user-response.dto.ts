import { ApiProperty } from "@nestjs/swagger"
import type { UserRecord } from "../schemas/user.schema"

/** The only user shape that leaves the API, so hashes can't leak. */
export class UserResponseDto {
  @ApiProperty({ example: "665f1c2e8b3a4d0012345678" })
  id!: string

  @ApiProperty({ example: "jane@example.com" })
  email!: string

  @ApiProperty({ example: "Jane Doe" })
  name!: string

  static from(user: Pick<UserRecord, "_id" | "email" | "name">) {
    const dto = new UserResponseDto()
    dto.id = user._id.toString()
    dto.email = user.email
    dto.name = user.name
    return dto
  }
}
