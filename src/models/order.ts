import mongoose, { Schema } from "mongoose";

const orderSchema = new Schema(
  {
    client: String,
    batch: Schema.Types.ObjectId,
    createdAt: Date,
    deliverAt: Date,
    items: [
      new Schema(
        {
          item: { type: Schema.Types.ObjectId, ref: "Product" },
          amount: Number,
          measurementUnit: String,
        },
        // `_id: false` (not `id: false`): suppress each item line's own _id
        // without also stripping the populated Product's _id in nested populate.
        { _id: false },
      ),
    ],
    archived: Boolean,
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

export const Order = mongoose.models.Order ?? mongoose.model("Order", orderSchema);
