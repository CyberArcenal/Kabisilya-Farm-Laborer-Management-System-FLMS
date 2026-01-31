# Farm Labor Management System (FLMS)

A desktop application built with **Electron** and **Vite React/TypeScript** to streamline labor and financial management in farming.  
The system focuses on organizing workers per pitak, tracking debts, calculating payments based on luwang (piecework), and supporting manual deductions for fairness and transparency.  
Originally designed for kabisilya workflows, now expanded into a **general farm management system**.

---

## ✨ Features

- **Worker Registry**  
  Maintain a list of all workers, assignable per pitak.  
  Track worker status (active, on-leave, terminated) with audit-safe updates.

- **Pitak Assignment**  
  Assign workers to specific pitak and record the number of luwang completed.  
  Group assignments by bukid, pitak, status, or cropping session.

- **Payment Calculation (Pakyawan per Luwang)**  
  Compute gross pay based on fixed rate (e.g., ₱230 per luwang).  
  Allow manual deduction of debts to avoid full automatic deduction.  
  Track net pay, pending balances, and generate per-pitak payroll summaries.

- **Debt Management**  
  Record, update, and monitor worker debts.  
  Deduction history per payout for audit safety.  
  Support partial payments and transparent balance tracking.

- **Filtering & Reporting**  
  Unified tables with filters by bukid, pitak, worker, or payment status.  
  Generate reports for pending payments, cleared debts, productivity per pitak, and payroll summaries per bukid.

- **Notifications**  
  Audit-safe events such as:  
  - `pitak_assignment_updated`  
  - `payment_pending`  
  - `payment_completed`  
  - `debt_updated`  
  - `bukid_settings_updated`

---

## 🛠️ Tech Stack

- **Electron** – Desktop app runtime  
- **Vite** – Fast build tool and dev server  
- **React + TypeScript** – Frontend framework and type safety  
- **SQLite / Postgres (optional)** – For persistent storage of workers, assignments, debts, and payments  

---

## 📊 Database Schema (Simplified)

**Workers**  
- `worker_id`, `name`, `status`, `contact`, `email`, `address`, `hire_date`, `total_debt`, `total_paid`, `current_balance`

**Bukid**  
- `bukid_id`, `name`, `location`, `status`

**Pitak**  
- `pitak_id`, `bukid_id`, `location`, `size`, `status`

**Assignments**  
- `assignment_id`, `pitak_id`, `worker_id`, `luwang_count`, `status`, `assignment_date`

**Payments**  
- `payment_id`, `worker_id`, `pitak_id`, `gross_pay`, `manual_deduction`, `net_pay`, `status`, `payment_date`

**Debts**  
- `debt_id`, `worker_id`, `amount`, `balance`, `status`, `created_at`

**UserActivity (Audit Log)**  
- `activity_id`, `user_id`, `action`, `description`, `details`, `created_at`

---

## 🚀 Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/farm-management.git
   cd farm-management
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the app in development:
   ```bash
   npm run dev
   ```

4. Build the desktop app:
   ```bash
   npm run build
   ```

---

## 📌 Roadmap

- [ ] Worker attendance integration  
- [ ] Export reports to CSV/PDF  
- [ ] Role-based access (Admin vs Worker Manager)  
- [ ] Multi-language support (Filipino/English)  
- [ ] Session-based resets per cropping cycle  
- [ ] Mobile companion app for field data entry  

## 📸 Screenshots
Here are sample displays of the system

![Screenshot 3](https://github.com/CyberArcenal/Kabisilya-Management/blob/main/screenshots/img3.png?raw=true)
![Screenshot 2](https://github.com/CyberArcenal/Kabisilya-Management/blob/main/screenshots/img2.png?raw=true)
![Screenshot 1](https://github.com/CyberArcenal/Kabisilya-Management/blob/main/screenshots/img4.png?raw=true)


---

## ⚖️ License

MIT License – free to use and modify for your farming or labor management projects.
```
MIT License

Copyright (c) 2026 CyberArcenal

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
