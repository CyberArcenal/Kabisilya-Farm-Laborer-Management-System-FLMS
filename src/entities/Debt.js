// src/entities/Debt.js
const { EntitySchema } = require("typeorm");

const Debt = new EntitySchema({
  name: "Debt",
  tableName: "debts",
  columns: {
    id: { type: Number, primary: true, generated: true },
    originalAmount: {
      type: "decimal",
      precision: 10,
      scale: 2,
      default: 0.0,
    },
    amount: {
      type: "decimal",
      precision: 10,
      scale: 2,
      default: 0.0,
    },
    reason: { type: String, nullable: true },
    balance: {
      type: "decimal",
      precision: 10,
      scale: 2,
      default: 0.0,
    },
    // status: "pending", "partially_paid", "paid", "cancelled", "overdue", "settled"
    status: {
      type: String,
      default: "pending",
      enum: ["pending", "partially_paid", "paid", "cancelled", "overdue", "settled"]
    },
    dateIncurred: { type: Date, createDate: true },
    dueDate: { type: Date, nullable: true },
    paymentTerm: { type: String, nullable: true },
    interestRate: {
      type: "decimal",
      precision: 5,
      scale: 2,
      default: 0.0,
    },
    totalInterest: {
      type: "decimal",
      precision: 10,
      scale: 2,
      default: 0.0,
    },
    totalPaid: {
      type: "decimal",
      precision: 10,
      scale: 2,
      default: 0.0,
    },
    lastPaymentDate: { type: Date, nullable: true },
    createdAt: { type: Date, createDate: true },
      deletedAt: { type: Date, nullable: true },
    updatedAt: { type: Date, updateDate: true },
  },
  relations: {
    worker: {
      target: "Worker",
      type: "many-to-one",
      joinColumn: true,
      inverseSide: "debts",
      onDelete: "CASCADE",
    },
    session: {
      target: "Session",
      type: "many-to-one",
      joinColumn: true,
      inverseSide: "debts",
      nullable: false,
      onDelete: "CASCADE",
    },
    history: {
      target: "DebtHistory",
      type: "one-to-many",
      inverseSide: "debt",
      cascade: true,
    },
  },
  indices: [
    { name: "IDX_DEBT_STATUS", columns: ["status"] },
    { name: "IDX_DEBT_DUE_DATE", columns: ["dueDate"] },
    { name: "IDX_DEBT_WORKER", columns: ["worker"] },
    { name: "IDX_DEBT_SESSION", columns: ["session"] }, // ✅ new index
  ],
});

module.exports = Debt;