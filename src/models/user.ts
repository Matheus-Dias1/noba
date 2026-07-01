import mongoose, { Schema } from "mongoose";

const userSchema = new Schema(
  {
    username: { type: String, unique: true, required: true },
    name: { type: String, required: true },
    password: { type: String, required: true },
    admin: { type: Boolean, default: false },
  },
  {
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        ret.id = String(ret._id);
        delete ret._id;
        delete ret.__v;
        // never leak the password hash
        delete ret.password;
        return ret;
      },
    },
  },
);

export const User = mongoose.models.User ?? mongoose.model("User", userSchema);
