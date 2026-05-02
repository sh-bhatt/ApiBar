import mongoose, { type InferSchemaType, Schema } from 'mongoose'

const tierSchema = new Schema(
  {
    upTo: { type: Number, required: true },
    pricePerRequest: { type: Number, required: true },
  },
  { _id: false }
)

const apiSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    baseUrl: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    pricingModel: {
      type: { type: String, enum: ['per_request', 'tiered', 'monthly_flat', 'free'], default: 'per_request' },
      pricePerRequest: { type: Number, default: 0.005, min: 0 },
      freeTierLimit: { type: Number, default: 1000, min: 0 },
      tiers: { type: [tierSchema], default: [] },
      monthlyPrice: { type: Number, default: 0, min: 0 },
      includedRequests: { type: Number, default: 0, min: 0 },
    },
    billingConfig: {
      billingMode: { type: String, enum: ['postpaid', 'prepaid', 'pay_per_use'], default: 'postpaid' },
      billingUnit: { type: String, enum: ['request', 'token', 'mb', 'minute', 'custom'], default: 'request' },
      customUnitName: { type: String, default: '' },
      creditLimit: { type: Number, default: 500 },
      minimumTopup: { type: Number, default: 100 },
    },
    createdAt: { type: Date, required: true, default: () => new Date() },
  },
  { timestamps: false },
)

apiSchema.index({ userId: 1, createdAt: -1 })

export type ApiDocument = InferSchemaType<typeof apiSchema> & {
  _id: mongoose.Types.ObjectId
}

export const Api = mongoose.model('Api', apiSchema)
