import mongoose, { Schema } from "mongoose";

const productSchema = new Schema(
  {
    description: { type: String, required: true },
    defaultMeasurementUnit: { type: String, required: true },
    conversions: [
      {
        measurementUnit: String,
        oneDefaultEquals: Number,
      },
    ],
    archived: { type: Boolean, default: false },
  },
  {
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        ret.id = String(ret._id);
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  },
);

export const Product =
  mongoose.models.Product ?? mongoose.model("Product", productSchema);
