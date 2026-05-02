import mongoose, { type InferSchemaType, Schema } from 'mongoose'

const billingSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    month: { type: String, required: true, index: true },
    totalRequests: { type: Number, required: true, min: 0 },
    freeRequests: { type: Number, required: true, min: 0 },
    billableRequests: { type: Number, required: true, min: 0 },
    amountINR: { type: Number, required: true, min: 0 },
    platformCommission: { type: Number, default: 0 },
    providerEarnings: { type: Number, default: 0 },
    apiId: { type: Schema.Types.ObjectId, ref: 'Api', default: null },
    providerId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    paymentId: { type: String, default: null },
    status: { type: String, enum: ['unpaid', 'paid'], required: true, default: 'unpaid' },
    generatedAt: { type: Date, required: true, default: () => new Date() },
    dueDate: { type: Date },
    gracePeriodEnd: { type: Date },
    autoBlocked: { type: Boolean, default: false },
    paidAt: { type: Date },
    billingType: { type: String, enum: ['postpaid', 'prepaid_topup'], default: 'postpaid' },
    breakdown: [{
      apiId: { type: Schema.Types.ObjectId, ref: 'Api' },
      apiName: String,
      billingMode: String,
      pricingType: String,
      totalRequests: Number,
      freeRequests: Number,
      billableRequests: Number,
      amountINR: Number,
      platformCommission: Number,
      providerEarnings: Number,
      providerId: { type: Schema.Types.ObjectId, ref: 'User' },
    }],
  },
  { timestamps: false },
)

billingSchema.index({ userId: 1, month: -1, generatedAt: -1 })
billingSchema.index({ providerId: 1, month: -1 })
billingSchema.index({ apiId: 1, month: -1 })

export type BillingDocument = InferSchemaType<typeof billingSchema> & {
  _id: mongoose.Types.ObjectId
}

export const Billing = mongoose.model('Billing', billingSchema)
