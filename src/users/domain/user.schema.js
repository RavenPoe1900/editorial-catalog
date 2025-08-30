const mongoose = require("mongoose");
const baseSchema = require("../../_shared/db/baseSchema");

const userSchema = new mongoose.Schema({
  name: { type: String },
  email: { type: String, required: true, unique: true },
  phone: { type: String, unique: true, sparse: true },
  password: { type: String, required: true },
  role: { type: mongoose.Schema.Types.ObjectId, ref: "Role", required: true },
  lastUsedRole: { type: mongoose.Schema.Types.ObjectId, ref: "Role", default: null },

  refreshTokens: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RefreshToken",
    },
  ],
});

userSchema.add(baseSchema);

module.exports = mongoose.model("User", userSchema);