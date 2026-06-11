// src/entities/Session.js
const { EntitySchema } = require("typeorm");

const Session = new EntitySchema({
  name: "Session",
  tableName: "sessions",
  columns: {
    id: {
      type: Number,
      primary: true,
      generated: true,
    },
    name: {
      type: String,
      nullable: false, // e.g. "First Cropping 2026"
    },
    notes: {
      type: String,
      nullable: true,
    },
    seasonType: {
      type: String,
      nullable: true, // optional: 'tag-ulan' or 'tag-araw'
    },
    year: {
      type: Number,
      nullable: false,
    },
    startDate: {
      type: Date,
      nullable: false,
    },
    endDate: {
      type: Date,
      nullable: true,
    },
    status: {
      type: String,
      default: "active", // active | closed | archived
      enum: ["active", "closed", "archived"]
    },
    createdAt: {
      type: Date,
      createDate: true,
    },
    updatedAt: {
      type: Date,
      updateDate: true,
    },
    deletedAt: { type: Date, nullable: true },
  },
  relations: {
    bukids: {
      target: "Bukid",
      type: "one-to-many",
      inverseSide: "session",
      cascade: true,
    },
    assignments: {
      target: "Assignment",
      type: "one-to-many",
      inverseSide: "session",
      cascade: true,
    },
    payments: {
      target: "Payment",
      type: "one-to-many",
      inverseSide: "session",
      cascade: true,
    },
    debts: {
      target: "Debt",
      type: "one-to-many",
      inverseSide: "session",
      cascade: true,
    },
  },
});

module.exports = Session;
