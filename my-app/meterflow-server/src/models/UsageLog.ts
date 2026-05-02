import mongoose, { type InferSchemaType, Schema } from 'mongoose'

const usageLogSchema = new Schema(
  {
    apiKeyId: { type: Schema.Types.ObjectId, ref: 'ApiKey', default: null },
    apiId: { type: Schema.Types.ObjectId, ref: 'Api', default: null },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    method: { type: String, required: true },
    path: { type: String, required: true },
    statusCode: { type: Number, required: true },
    latencyMs: { type: Number, required: true, min: 0 },
    timestamp: { type: Date, required: true, default: () => new Date(), index: true },
    billingUnit: { type: String, default: 'request' },
    billingQuantity: { type: Number, default: 1 },
    billingCost: { type: Number, default: 0 },
  },
  { timestamps: false },
)

usageLogSchema.index({ apiKeyId: 1, timestamp: -1 })
usageLogSchema.index({ userId: 1, timestamp: -1 })
usageLogSchema.index({ apiId: 1, timestamp: -1 })

export type UsageLogDocument = InferSchemaType<typeof usageLogSchema> & {
  _id: mongoose.Types.ObjectId
}
export const UsageLog = mongoose.model('UsageLog', usageLogSchema)
