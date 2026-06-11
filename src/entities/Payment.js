// src/entities/Payment.js
const { EntitySchema } = require("typeorm");

const Payment = new EntitySchema({
  name: "Payment",
  tableName: "payments",
  columns: {
    id: { type: Number, primary: true, generated: true },
    grossPay: { type: "decimal", precision: 10, scale: 2, default: 0.0 },
    manualDeduction: {
      type: "decimal",
      precision: 10,
      scale: 2,
      nullable: true,
      default: 0.0,
    },
    netPay: { type: "decimal", precision: 10, scale: 2, default: 0.0 },
    status: {
      type: String,
      default: "pending",
      enum: ["pending", "partially_paid", "completed", "cancelled"],
    }, //pending, partially_paid, complete, cancel
    paymentDate: { type: Date, nullable: true },
    paymentMethod: { type: String, nullable: true },
    referenceNumber: { type: String, nullable: true }, // remove global unique here
    periodStart: { type: Date, nullable: true },
    periodEnd: { type: Date, nullable: true },
    totalDebtDeduction: {
      type: "decimal",
      precision: 10,
      scale: 2,
      default: 0.0,
    },
    otherDeductions: { type: "decimal", precision: 10, scale: 2, default: 0.0 },
    deductionBreakdown: { type: "json", nullable: true },
    notes: { type: String, nullable: true },
    createdAt: { type: Date, createDate: true },
      deletedAt: { type: Date, nullable: true },
    updatedAt: { type: Date, updateDate: true },
    // optional idempotency key
    idempotencyKey: { type: String, nullable: true },
  },
  relations: {
    worker: {
      target: "Worker",
      type: "many-to-one",
      joinColumn: true,
      inverseSide: "payments",
      onDelete: "CASCADE",
    },
    pitak: {
      target: "Pitak",
      type: "many-to-one",
      joinColumn: true,
      inverseSide: "payments",
      onDelete: "CASCADE",
    },
    session: {
      target: "Session",
      type: "many-to-one",
      joinColumn: true,
      inverseSide: "payments",
      nullable: false,
      onDelete: "CASCADE",
    },
    // optional: link to assignment for stricter uniqueness
    assignment: {
      target: "Assignment",
      type: "many-to-one",
      joinColumn: true,
      inverseSide: "payments",
      nullable: true,
      onDelete: "SET NULL",
    },
    history: {
      target: "PaymentHistory",
      type: "one-to-many",
      inverseSide: "payment",
      cascade: true,
    },
    debtPayments: {
      target: "DebtHistory",
      type: "one-to-many",
      inverseSide: "payment",
      cascade: true,
    },
  },
  indices: [
    { name: "IDX_PAYMENT_STATUS", columns: ["status"] },
    { name: "IDX_PAYMENT_DATE", columns: ["paymentDate"] },
    { name: "IDX_PAYMENT_WORKER", columns: ["worker"] },
    { name: "IDX_PAYMENT_SESSION", columns: ["session"] },
    // composite unique index to prevent duplicate payments for same pitak+worker+session
    {
      name: "UX_PAYMENTS_PITAK_WORKER_SESSION",
      columns: ["pitak", "worker", "session"],
      unique: true,
    },
    // optional unique index on assignment if you use assignment_id approach
    {
      name: "UX_PAYMENTS_ASSIGNMENT",
      columns: ["assignment"],
      unique: true,
    },
    // optional unique index for idempotency keys
    {
      name: "UX_PAYMENTS_IDEMPOTENCY_KEY",
      columns: ["idempotencyKey"],
      unique: true,
    },
  ],
});

module.exports = Payment;
