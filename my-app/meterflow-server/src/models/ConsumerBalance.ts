import mongoose, { type InferSchemaType, Schema } from 'mongoose'

const consumerBalanceSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    apiId: { type: Schema.Types.ObjectId, ref: 'Api', required: true },
    balance: { type: Number, default: 0 },
    creditUsed: { type: Number, default: 0 },
    creditLimit: { type: Number, default: 500 },
    status: { type: String, enum: ['active', 'blocked', 'suspended'], default: 'active' },
    lastTopupAt: { type: Date },
    blockedAt: { type: Date },
    blockedReason: { type: String },
  },
  { timestamps: true },
)

consumerBalanceSchema.index({ userId: 1, apiId: 1 })
consumerBalanceSchema.index({ status: 1 })

export type ConsumerBalanceDocument = InferSchemaType<typeof consumerBalanceSchema> & {
  _id: mongoose.Types.ObjectId
}

export const ConsumerBalance = mongoose.model('ConsumerBalance', consumerBalanceSchema)
