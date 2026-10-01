import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"
import type { HydratedDocument, Types } from "mongoose"

@Schema({ timestamps: true, versionKey: false })
export class User {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email!: string

  @Prop({ required: true, trim: true })
  name!: string

  // Secrets are never selected unless a query asks for them explicitly.
  @Prop({ required: true, select: false })
  passwordHash!: string

  /** SHA-256 of the current refresh token; null when signed out. */
  @Prop({ type: String, default: null, select: false })
  refreshTokenHash!: string | null

  createdAt!: Date
  updatedAt!: Date
}

export type UserDocument = HydratedDocument<User>
export type UserRecord = User & { _id: Types.ObjectId }

export const UserSchema = SchemaFactory.createForClass(User)
