// src/entities/Assignment.js
const { EntitySchema } = require("typeorm");

const AssignmentStatus = {
  INITIATED: "initiated",
  ACTIVE: "active",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
};

const Assignment = new EntitySchema({
  name: "Assignment",
  tableName: "assignments",
  columns: {
    id: { type: Number, primary: true, generated: true },
    luwangCount: {
      type: "decimal",
      precision: 5,
      scale: 2,
      default: 0.0,
    },
    assignmentDate: { type: Date }, // Business date for the assignment
    status: {
      type: String,
      default: AssignmentStatus.ACTIVE,
      enum: AssignmentStatus,
    },
    notes: { type: String, nullable: true },
    createdAt: { type: Date, createDate: true },
      deletedAt: { type: Date, nullable: true },
    updatedAt: { type: Date, updateDate: true },
  },
  relations: {
    worker: {
      target: "Worker",
      type: "many-to-one",
      joinColumn: true,
      inverseSide: "assignments",
      onDelete: "CASCADE",
    },
    pitak: {
      target: "Pitak",
      type: "many-to-one",
      joinColumn: true,
      inverseSide: "assignments",
      onDelete: "CASCADE",
    },
    session: {
      target: "Session",
      type: "many-to-one",
      joinColumn: true,
      inverseSide: "assignments",
      nullable: false,
      onDelete: "CASCADE",
    },
  },
  indices: [
    {
      name: "IDX_ASSIGNMENT_DATE",
      columns: ["assignmentDate"],
    },
    {
      name: "IDX_ASSIGNMENT_STATUS",
      columns: ["status"],
    },
  ],
  uniques: [
    {
      name: "UQ_WORKER_PITAK_SESSION",
      columns: ["worker", "pitak", "session"], // ✅ unique per session
    },
  ],
});

module.exports = Assignment;
module.exports.AssignmentStatus = AssignmentStatus;