// src/entities/DebtHistory.js
const { EntitySchema } = require("typeorm");

const DebtHistory = new EntitySchema({
  name: "DebtHistory",
  tableName: "debt_histories",
  columns: {
    id: { type: Number, primary: true, generated: true },
    // Amount paid in this transaction
    amountPaid: { 
      type: "decimal", 
      precision: 10, 
      scale: 2,
      default: 0.00
    },
    // Previous balance before this payment
    previousBalance: { 
      type: "decimal", 
      precision: 10, 
      scale: 2,
      default: 0.00
    },
    // New balance after this payment
    newBalance: { 
      type: "decimal", 
      precision: 10, 
      scale: 2,
      default: 0.00
    },
    // Type: "payment", "adjustment", "interest", "refund"
    transactionType: { 
      type: String, 
      default: "payment" 
    },
    paymentMethod: { type: String, nullable: true },
    referenceNumber: { type: String, nullable: true},
    notes: { type: String, nullable: true },
    transactionDate: { type: Date, createDate: true },
    createdAt: { type: Date, createDate: true },
    deletedAt: { type: Date, nullable: true },
  },
  relations: {
    debt: { 
      target: "Debt", 
      type: "many-to-one", 
      joinColumn: true, 
      inverseSide: "history",
      onDelete: "CASCADE" 
    },
    // Optional: Link to which payment record (if paid via salary deduction)
    payment: { 
      target: "Payment", 
      type: "many-to-one", 
      joinColumn: true, 
      nullable: true,
      inverseSide: "debtPayments"
    }
  },
  indices: [
    {
      name: "IDX_DEBT_HISTORY_DATE",
      columns: ["transactionDate"]
    },
    {
      name: "IDX_DEBT_HISTORY_TYPE",
      columns: ["transactionType"]
    }
  ]
});

module.exports = DebtHistory;