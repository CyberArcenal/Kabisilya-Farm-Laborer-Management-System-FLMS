// src/entities/Pitak.js
const { EntitySchema } = require("typeorm");

const Pitak = new EntitySchema({
  name: "Pitak",
  tableName: "pitaks",
  columns: {
    id: { type: Number, primary: true, generated: true },
    location: { type: String, nullable: true },

    // total luwang (computed)
    totalLuwang: {
      type: "decimal",
      precision: 7, // mas malaki para safe
      scale: 2,
      default: 0.0,
    },

    // bagong fields
    layoutType: {
      type: String,
      default: "square", // "square" | "rectangle" | "triangle" | "circle"
    },

    // JSON field para sa mga side lengths (flexible)
    sideLengths: {
      type: "simple-json", // stores array/object as JSON
      nullable: true,
    },

    areaSqm: {
      type: "decimal",
      precision: 10,
      scale: 2,
      default: 0.0,
    },
    notes: {type: String, nullable: true},

    status: {
      type: String,
      default: "active",
      enum: ["active", "completed", "cancelled"]
    },

    createdAt: { type: Date, createDate: true },
      deletedAt: { type: Date, nullable: true },
    updatedAt: { type: Date, updateDate: true },
  },
  relations: {
    bukid: {
      target: "Bukid",
      type: "many-to-one",
      joinColumn: true,
      inverseSide: "pitaks",
      onDelete: "CASCADE",
    },
    assignments: {
      target: "Assignment",
      type: "one-to-many",
      inverseSide: "pitak",
      cascade: true,
    },
    payments: {
      target: "Payment",
      type: "one-to-many",
      inverseSide: "pitak",
      cascade: true,
    },
  },
  indices: [
    { name: "IDX_PITAK_STATUS", columns: ["status"] },
    { name: "IDX_PITAK_LOCATION", columns: ["location"] },
  ],
  uniques: [
    {
      name: "UQ_BUKID_LOCATION",
      columns: ["bukid", "location"], // ✅ unique pitak per bukid
    },
  ],
});

module.exports = Pitak;