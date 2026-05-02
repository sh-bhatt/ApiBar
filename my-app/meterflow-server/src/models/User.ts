import mongoose, { type InferSchemaType, Schema } from 'mongoose'

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    refreshToken: { type: String, default: null },
    name: { type: String, required: true, trim: true },
    role: { type: String, enum: ['admin', 'provider', 'consumer'], required: true, default: 'provider' },
    plan: { type: String, enum: ['free', 'pro'], required: true, default: 'free' },
    avatar: { type: String, default: '' },
    bio: { type: String, default: '' },
    company: { type: String, default: '' },
    website: { type: String, default: '' },
    location: { type: String, default: '' },
    phone: { type: String, default: '' },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

export type UserDocument = InferSchemaType<typeof userSchema> & { _id: mongoose.Types.ObjectId }
export const User = mongoose.model('User', userSchema)
