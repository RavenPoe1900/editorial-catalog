/**
 * @fileoverview Base schema fragment for common document metadata + soft delete.
 *
 * Fields:
 *  - createdAt / updatedAt (managed by Mongoose timestamps).
 *  - deletedAt (null if active, Date if soft-deleted).
 *
 * Methods:
 *  - softDelete(): sets deletedAt and persists.
 *  - isDeleted(): boolean flag.
 *
 * Hooks:
 *  - pre('save'): updates updatedAt timestamp when document modified.
 *
 * Usage:
 *  schema.add(baseSchema);
 *
 * Future:
 *  - Add audit fields: createdBy / updatedBy if needed.
 *  - Implement restore method (unset deletedAt).
 */
const mongoose = require("mongoose");

const baseSchema = new mongoose.Schema(
  {
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
);

baseSchema.methods.softDelete = function () {
  this.deletedAt = new Date();
  return this.save();
};

baseSchema.methods.isDeleted = function () {
  return this.deletedAt !== null;
};

baseSchema.pre("save", function (next) {
  if (this.isModified()) {
    this.updatedAt = new Date();
  }
  next();
});

module.exports = baseSchema;