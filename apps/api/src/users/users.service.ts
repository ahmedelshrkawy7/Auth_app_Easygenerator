import { Injectable, type OnModuleInit } from "@nestjs/common"
import { InjectModel } from "@nestjs/mongoose"
import { isValidObjectId, Model } from "mongoose"
import { User, type UserRecord } from "./schemas/user.schema"

const DUPLICATE_KEY = 11000

export class EmailTakenError extends Error {
  constructor() {
    super("Email already registered")
  }
}

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(@InjectModel(User.name) private readonly users: Model<User>) {}

  /**
   * Mongoose builds indexes in the background. Wait for them so the unique
   * email index exists before the first signup, or duplicates slip through.
   */
  async onModuleInit(): Promise<void> {
    await this.users.init()
  }

  async create(input: {
    email: string
    name: string
    passwordHash: string
  }): Promise<UserRecord> {
    try {
      const doc = await this.users.create(input)
      return doc.toObject()
    } catch (error) {
      if ((error as { code?: number }).code === DUPLICATE_KEY) {
        throw new EmailTakenError()
      }
      throw error
    }
  }

  findById(id: string): Promise<UserRecord | null> {
    if (!isValidObjectId(id)) return Promise.resolve(null)
    return this.users.findById(id).lean().exec()
  }

  findByEmailWithPassword(email: string): Promise<UserRecord | null> {
    return this.users
      .findOne({ email: email.toLowerCase() })
      .select("+passwordHash")
      .lean()
      .exec()
  }

  async setRefreshTokenHash(id: string, hash: string | null): Promise<void> {
    await this.users.updateOne({ _id: id }, { refreshTokenHash: hash }).exec()
  }

  /**
   * Atomically swaps the stored refresh hash only if it still equals `current`.
   * Returns false when the token was already used or revoked.
   */
  async rotateRefreshTokenHash(
    id: string,
    current: string,
    next: string | null
  ): Promise<boolean> {
    if (!isValidObjectId(id)) return false
    const result = await this.users
      .updateOne(
        { _id: id, refreshTokenHash: current },
        { refreshTokenHash: next }
      )
      .exec()
    return result.modifiedCount === 1
  }
}
