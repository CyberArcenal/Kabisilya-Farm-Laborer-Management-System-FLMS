// src/entities/PaymentHistory.js
const { EntitySchema } = require("typeorm");

const PaymentHistory = new EntitySchema({
  name: "PaymentHistory",
  tableName: "payment_histories",
  columns: {
    id: { type: Number, primary: true, generated: true },
    // Type: "create", "update", "status_change", "adjustment", "deduction"
    actionType: {
      type: String,
      default: "update",
    },
    // Field that was changed: "grossPay", "manualDeduction", "netPay", "status"
    changedField: { type: String },
    oldValue: { type: String, nullable: true },
    newValue: { type: String, nullable: true },
    // For financial fields, we store decimal values separately
    oldAmount: {
      type: "decimal",
      precision: 10,
      scale: 2,
      nullable: true,
      default: 0.0,
    },
    newAmount: {
      type: "decimal",
      precision: 10,
      scale: 2,
      nullable: true,
      default: 0.0,
    },
    notes: { type: String, nullable: true },
    performedBy: { type: String, nullable: true }, // Who made the change
    changeDate: { type: Date, createDate: true },
    deletedAt: { type: Date, nullable: true },
    referenceNumber: { type: String, nullable: true },
  },
  relations: {
    payment: {
      target: "Payment",
      type: "many-to-one",
      joinColumn: true,
      inverseSide: "history",
      onDelete: "CASCADE",
    },
  },
  indices: [
    {
      name: "IDX_PAYMENT_HISTORY_ACTION",
      columns: ["actionType"],
    },
    {
      name: "IDX_PAYMENT_HISTORY_DATE",
      columns: ["changeDate"],
    },
  ],
});

module.exports = PaymentHistory;
