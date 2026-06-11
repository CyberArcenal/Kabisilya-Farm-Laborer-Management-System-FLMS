// src/entities/Bukid.js
const { CANCELLED } = require("node:dns");
const { EntitySchema } = require("typeorm");

const BukidStatus = {
  INITIATED: "initiated",
  ACTIVE: "active",
  COMPLETE: "completed",
  CANCELLED: "cancelled",
};

const Bukid = new EntitySchema({
  name: "Bukid",
  tableName: "bukids",
  columns: {
    id: { type: Number, primary: true, generated: true },
    name: { type: String, nullable: false },
    status: {
      type: String,
      default: BukidStatus.ACTIVE, // default inactive
      enum: BukidStatus,
    },
    notes: { type: String, nullable: true },
    location: { type: String, nullable: true },
    createdAt: { type: Date, createDate: true },
      deletedAt: { type: Date, nullable: true },
    updatedAt: { type: Date, updateDate: true },
  },
  relations: {
    session: {
      target: "Session",
      type: "many-to-one",
      joinColumn: true,
      inverseSide: "bukids",
      onDelete: "CASCADE",
    },
    pitaks: {
      target: "Pitak",
      type: "one-to-many",
      inverseSide: "bukid",
      cascade: true,
    },
  },
});

module.exports = Bukid;
