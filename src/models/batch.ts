import mongoose, { Schema } from "mongoose";

const batchSchema = new Schema(
  {
    number: Number,
    startDate: Date,
    endDate: Date,
    orders: [{ type: Schema.Types.ObjectId, ref: "Order" }],
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

export const Batch = mongoose.models.Batch ?? mongoose.model("Batch", batchSchema);
