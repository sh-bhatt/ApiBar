import mongoose, { type InferSchemaType, Schema } from 'mongoose'

const apiKeySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    apiId: { type: Schema.Types.ObjectId, ref: 'Api', default: null },
    name: { type: String, required: true, trim: true },
    /** Hex segment after `mf_live_` for indexed lookup before bcrypt.verify */
    keyFingerprint: { type: String, unique: true, sparse: true, index: true },
    keyHash: { type: String, required: true },
    maskedKey: { type: String, required: true },
    callCount: { type: Number, required: true, default: 0, min: 0 },
    freeTierLimit: { type: Number, required: true, default: 1000, min: 0 },
    pricePerRequest: { type: Number, required: true, default: 0.005, min: 0 },
    rateLimit: { type: Number, required: true, default: 1000, min: 1 },
    status: { type: String, enum: ['active', 'disabled'], required: true, default: 'active' },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

apiKeySchema.index({ userId: 1, name: 1 })

export type ApiKeyDocument = InferSchemaType<typeof apiKeySchema> & {
  _id: mongoose.Types.ObjectId
}
export const ApiKey = mongoose.model('ApiKey', apiKeySchema)
