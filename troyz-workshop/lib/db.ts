import { openDB, DBSchema, IDBPDatabase } from 'idb';

// ═══════════════════════════════════════════════════════════
//  TROYZ WORKSHOP OS — IndexedDB Schema & CRUD
// ═══════════════════════════════════════════════════════════

export interface Customer {
  id: string;
  name: string;
  phone: string;
  altPhone?: string;
  email?: string;
  address?: string;
  whatsapp?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Vehicle {
  id: string;
  customerId: string;
  make: string;
  model: string;
  year?: number;
  color?: string;
  regNo: string;
  mileage?: number;
  fuelType?: string;
  notes?: string;
  // Bore Rig Specifics
  rigType?: string; // 'DTH Rig' | 'Rotary Rig' | 'Tractor Rig' | 'Super Rig' | 'Compressor Unit' | 'Support Truck' | 'Other'
  compressorDetails?: string; // e.g. ELGi 1100 CFM / 300 PSI
  rigChassisNo?: string;
  rodLength?: string; // e.g. 10ft, 15ft, 20ft
  hammerSize?: string; // e.g. 4.5", 6", 8"
  createdAt: string;
}

export type JobStatus = 'estimate' | 'active' | 'completed' | 'delivered' | 'cancelled';
export type PaymentMethod = 'cash' | 'upi' | 'card' | 'cheque' | 'bank_transfer' | 'other';

export interface JobItem {
  id: string;
  type: 'part' | 'labour' | 'service';
  partId?: string;
  name: string;
  qty: number;
  unitPrice: number;
  total: number;
}

export interface Job {
  id: string;
  jobNo: string;
  customerId: string;
  vehicleId: string;
  status: JobStatus;
  complaint: string;
  diagnosis?: string;
  inspection?: string;
  items: JobItem[];
  discount?: number;
  subtotal: number;
  total: number;
  paid: number;
  balance: number;
  estimatedDate?: string;
  completedDate?: string;
  deliveredDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Invoice {
  id: string;
  invoiceNo: string;
  jobId: string;
  customerId: string;
  items: JobItem[];
  subtotal: number;
  discount: number;
  total: number;
  paid: number;
  balance: number;
  gstAmount?: number;
  date: string;
  dueDate?: string;
  notes?: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  customerId: string;
  jobId?: string;
  invoiceId?: string;
  vehicleId?: string;
  paymentType?: 'advance' | 'settlement' | 'regular';
  amount: number;
  method: PaymentMethod;
  reference?: string;
  note?: string;
  date: string;
  createdAt: string;
}

export type ExpenseCategory =
  | 'parts_stock' | 'workshop_materials' | 'rent' | 'electricity' | 'water'
  | 'salaries' | 'tools_equipment' | 'vehicle_fuel' | 'marketing' | 'insurance'
  | 'maintenance' | 'transport' | 'office' | 'tax' | 'customer_vehicle_direct' | 'other';

export interface Expense {
  id: string;
  category: ExpenseCategory;
  subcategory?: string;
  supplierId?: string;
  customerId?: string;
  vehicleId?: string;
  jobId?: string;
  expenseType?: string; // 'lathe_work' | 'welding' | 'hydraulic_hose' | 'compressor_service' | 'outside_parts' | 'diesel_fuel' | 'outside_labour' | 'hardware' | 'other'
  description: string;
  amount: number;
  method: PaymentMethod;
  billNo?: string;
  date: string;
  notes?: string;
  createdAt: string;
}

export interface Part {
  id: string;
  sku: string;
  name: string;
  category?: string;
  purchasePrice: number;
  sellingPrice: number;
  stock: number;
  minStock: number;
  unit: string;
  supplierId?: string;
  location?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type StockMovementType = 'purchase' | 'used_in_job' | 'returned' | 'damaged' | 'adjustment';

export interface StockMovement {
  id: string;
  partId: string;
  type: StockMovementType;
  qty: number;
  jobId?: string;
  purchaseId?: string;
  note?: string;
  date: string;
  createdAt: string;
}

export interface PurchaseItem {
  partId?: string;
  name: string;
  qty: number;
  unitPrice: number;
  total: number;
}

export interface Purchase {
  id: string;
  purchaseNo: string;
  supplierId: string;
  items: PurchaseItem[];
  subtotal: number;
  total: number;
  paid: number;
  balance: number;
  billNo?: string;
  date: string;
  notes?: string;
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone?: string;
  altPhone?: string;
  email?: string;
  address?: string;
  gstNo?: string;
  creditPeriod?: number;
  totalPurchased: number;
  totalPaid: number;
  balance: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type WorkerRole = 'mechanic' | 'electrician' | 'painter' | 'helper' | 'supervisor' | 'manager' | 'receptionist' | 'lathe_operator' | 'welder' | 'driver' | 'other';

export interface Worker {
  id: string;
  name: string;
  role: WorkerRole;
  phone?: string;
  address?: string;
  salary: number;
  joinDate: string;
  isActive: boolean;
  notes?: string;
  createdAt: string;
}

export interface Attendance {
  id: string;
  workerId: string;
  date: string;
  status: 'present' | 'absent' | 'half_day' | 'holiday';
  note?: string;
  createdAt: string;
}

export interface Advance {
  id: string;
  workerId: string;
  type: 'advance' | 'bonus';
  amount: number;
  date: string;
  note?: string;
  createdAt: string;
}

export interface SalaryPayment {
  id: string;
  workerId: string;
  month: string;
  year: number;
  daysPresent: number;
  totalDays: number;
  grossSalary: number;
  deductions: number;
  advanceDeducted: number;
  netSalary: number;
  paid: number;
  date: string;
  method: PaymentMethod;
  createdAt: string;
}

export interface Setting {
  key: string;
  value: string;
}

// ═══════════════════════════════════════════════════════════
//  DB Schema
// ═══════════════════════════════════════════════════════════

interface TroyzDB extends DBSchema {
  customers: { key: string; value: Customer; indexes: { byPhone: string } };
  vehicles: { key: string; value: Vehicle; indexes: { byCustomer: string; byRegNo: string } };
  jobs: { key: string; value: Job; indexes: { byCustomer: string; byVehicle: string; byStatus: string; byDate: string } };
  invoices: { key: string; value: Invoice; indexes: { byJob: string; byCustomer: string; byDate: string } };
  payments: { key: string; value: Payment; indexes: { byCustomer: string; byJob: string; byDate: string } };
  expenses: { key: string; value: Expense; indexes: { byCategory: string; byDate: string; bySupplier: string } };
  parts: { key: string; value: Part; indexes: { bySku: string; byName: string } };
  stock_movements: { key: string; value: StockMovement; indexes: { byPart: string; byDate: string } };
  purchases: { key: string; value: Purchase; indexes: { bySupplier: string; byDate: string } };
  suppliers: { key: string; value: Supplier; indexes: { byName: string } };
  workers: { key: string; value: Worker; indexes: { byRole: string } };
  attendance: { key: string; value: Attendance; indexes: { byWorker: string; byDate: string } };
  advances: { key: string; value: Advance; indexes: { byWorker: string } };
  salary_payments: { key: string; value: SalaryPayment; indexes: { byWorker: string; byMonth: string } };
  settings: { key: string; value: Setting };
}

let dbInstance: IDBPDatabase<TroyzDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<TroyzDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<TroyzDB>('troyz-workshop-os', 2, {
    upgrade(db, oldVersion) {
      // Customers
      if (!db.objectStoreNames.contains('customers')) {
        const cs = db.createObjectStore('customers', { keyPath: 'id' });
        cs.createIndex('byPhone', 'phone');
      }
      // Vehicles
      if (!db.objectStoreNames.contains('vehicles')) {
        const vs = db.createObjectStore('vehicles', { keyPath: 'id' });
        vs.createIndex('byCustomer', 'customerId');
        vs.createIndex('byRegNo', 'regNo');
      }
      // Jobs
      if (!db.objectStoreNames.contains('jobs')) {
        const js = db.createObjectStore('jobs', { keyPath: 'id' });
        js.createIndex('byCustomer', 'customerId');
        js.createIndex('byVehicle', 'vehicleId');
        js.createIndex('byStatus', 'status');
        js.createIndex('byDate', 'createdAt');
      }
      // Invoices
      if (!db.objectStoreNames.contains('invoices')) {
        const inv = db.createObjectStore('invoices', { keyPath: 'id' });
        inv.createIndex('byJob', 'jobId');
        inv.createIndex('byCustomer', 'customerId');
        inv.createIndex('byDate', 'date');
      }
      // Payments
      if (!db.objectStoreNames.contains('payments')) {
        const pay = db.createObjectStore('payments', { keyPath: 'id' });
        pay.createIndex('byCustomer', 'customerId');
        pay.createIndex('byJob', 'jobId');
        pay.createIndex('byDate', 'date');
      }
      // Expenses
      if (!db.objectStoreNames.contains('expenses')) {
        const exp = db.createObjectStore('expenses', { keyPath: 'id' });
        exp.createIndex('byCategory', 'category');
        exp.createIndex('byDate', 'date');
        exp.createIndex('bySupplier', 'supplierId');
      }
      // Parts
      if (!db.objectStoreNames.contains('parts')) {
        const parts = db.createObjectStore('parts', { keyPath: 'id' });
        parts.createIndex('bySku', 'sku');
        parts.createIndex('byName', 'name');
      }
      // Stock movements
      if (!db.objectStoreNames.contains('stock_movements')) {
        const sm = db.createObjectStore('stock_movements', { keyPath: 'id' });
        sm.createIndex('byPart', 'partId');
        sm.createIndex('byDate', 'date');
      }
      // Purchases
      if (!db.objectStoreNames.contains('purchases')) {
        const pur = db.createObjectStore('purchases', { keyPath: 'id' });
        pur.createIndex('bySupplier', 'supplierId');
        pur.createIndex('byDate', 'date');
      }
      // Suppliers
      if (!db.objectStoreNames.contains('suppliers')) {
        const sup = db.createObjectStore('suppliers', { keyPath: 'id' });
        sup.createIndex('byName', 'name');
      }
      // Workers
      if (!db.objectStoreNames.contains('workers')) {
        const wk = db.createObjectStore('workers', { keyPath: 'id' });
        wk.createIndex('byRole', 'role');
      }
      // Attendance
      if (!db.objectStoreNames.contains('attendance')) {
        const att = db.createObjectStore('attendance', { keyPath: 'id' });
        att.createIndex('byWorker', 'workerId');
        att.createIndex('byDate', 'date');
      }
      // Advances
      if (!db.objectStoreNames.contains('advances')) {
        const adv = db.createObjectStore('advances', { keyPath: 'id' });
        adv.createIndex('byWorker', 'workerId');
      }
      // Salary
      if (!db.objectStoreNames.contains('salary_payments')) {
        const sal = db.createObjectStore('salary_payments', { keyPath: 'id' });
        sal.createIndex('byWorker', 'workerId');
        sal.createIndex('byMonth', 'month');
      }
      // Settings
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    },
  });

  return dbInstance;
}

// ═══════════════════════════════════════════════════════════
//  ID & Number Generators
// ═══════════════════════════════════════════════════════════

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export async function generateJobNo(): Promise<string> {
  const db = await getDB();
  const all = await db.getAll('jobs');
  const num = all.length + 1;
  return `JOB-${String(num).padStart(4, '0')}`;
}

export async function generateInvoiceNo(): Promise<string> {
  const db = await getDB();
  const all = await db.getAll('invoices');
  const num = all.length + 1;
  return `INV-${String(num).padStart(4, '0')}`;
}

export async function generatePurchaseNo(): Promise<string> {
  const db = await getDB();
  const all = await db.getAll('purchases');
  const num = all.length + 1;
  return `PUR-${String(num).padStart(4, '0')}`;
}

// ═══════════════════════════════════════════════════════════
//  CUSTOMERS
// ═══════════════════════════════════════════════════════════

export async function getAllCustomers(): Promise<Customer[]> {
  const db = await getDB();
  const all = await db.getAll('customers');
  return all.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getCustomer(id: string): Promise<Customer | undefined> {
  const db = await getDB();
  return db.get('customers', id);
}

export async function saveCustomer(data: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>): Promise<Customer> {
  const db = await getDB();
  const customer: Customer = {
    ...data,
    id: generateId(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await db.put('customers', customer);
  return customer;
}

export async function updateCustomer(id: string, data: Partial<Customer>): Promise<Customer> {
  const db = await getDB();
  const existing = await db.get('customers', id);
  if (!existing) throw new Error('Customer not found');
  const updated = { ...existing, ...data, updatedAt: new Date().toISOString() };
  await db.put('customers', updated);
  return updated;
}

export async function deleteCustomer(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('customers', id);
}

// ═══════════════════════════════════════════════════════════
//  VEHICLES
// ═══════════════════════════════════════════════════════════

export async function getAllVehicles(): Promise<Vehicle[]> {
  const db = await getDB();
  return db.getAll('vehicles');
}

export async function getVehiclesByCustomer(customerId: string): Promise<Vehicle[]> {
  const db = await getDB();
  return db.getAllFromIndex('vehicles', 'byCustomer', customerId);
}

export async function getVehicle(id: string): Promise<Vehicle | undefined> {
  const db = await getDB();
  return db.get('vehicles', id);
}

export async function saveVehicle(data: Omit<Vehicle, 'id' | 'createdAt'>): Promise<Vehicle> {
  const db = await getDB();
  const vehicle: Vehicle = { ...data, id: generateId(), createdAt: new Date().toISOString() };
  await db.put('vehicles', vehicle);
  return vehicle;
}

export async function updateVehicle(id: string, data: Partial<Vehicle>): Promise<Vehicle> {
  const db = await getDB();
  const existing = await db.get('vehicles', id);
  if (!existing) throw new Error('Vehicle not found');
  const updated = { ...existing, ...data };
  await db.put('vehicles', updated);
  return updated;
}

export async function deleteVehicle(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('vehicles', id);
}

// ═══════════════════════════════════════════════════════════
//  JOBS
// ═══════════════════════════════════════════════════════════

export async function getAllJobs(): Promise<Job[]> {
  const db = await getDB();
  const all = await db.getAll('jobs');
  return all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getJobsByCustomer(customerId: string): Promise<Job[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex('jobs', 'byCustomer', customerId);
  return all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getJobsByStatus(status: JobStatus): Promise<Job[]> {
  const db = await getDB();
  return db.getAllFromIndex('jobs', 'byStatus', status);
}

export async function getJob(id: string): Promise<Job | undefined> {
  const db = await getDB();
  return db.get('jobs', id);
}

export async function saveJob(data: Omit<Job, 'id' | 'jobNo' | 'createdAt' | 'updatedAt'>): Promise<Job> {
  const db = await getDB();
  const jobNo = await generateJobNo();
  const job: Job = {
    ...data,
    id: generateId(),
    jobNo,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await db.put('jobs', job);
  return job;
}

export async function updateJob(id: string, data: Partial<Job>): Promise<Job> {
  const db = await getDB();
  const existing = await db.get('jobs', id);
  if (!existing) throw new Error('Job not found');
  const updated = { ...existing, ...data, updatedAt: new Date().toISOString() };
  await db.put('jobs', updated);
  return updated;
}

export async function deleteJob(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('jobs', id);
}

// ═══════════════════════════════════════════════════════════
//  INVOICES
// ═══════════════════════════════════════════════════════════

export async function getAllInvoices(): Promise<Invoice[]> {
  const db = await getDB();
  const all = await db.getAll('invoices');
  return all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function getInvoice(id: string): Promise<Invoice | undefined> {
  const db = await getDB();
  return db.get('invoices', id);
}

export async function getInvoicesByCustomer(customerId: string): Promise<Invoice[]> {
  const db = await getDB();
  return db.getAllFromIndex('invoices', 'byCustomer', customerId);
}

export async function saveInvoice(data: Omit<Invoice, 'id' | 'invoiceNo' | 'createdAt'>): Promise<Invoice> {
  const db = await getDB();
  const invoiceNo = await generateInvoiceNo();
  const invoice: Invoice = { ...data, id: generateId(), invoiceNo, createdAt: new Date().toISOString() };
  await db.put('invoices', invoice);
  return invoice;
}

export async function updateInvoice(id: string, data: Partial<Invoice>): Promise<Invoice> {
  const db = await getDB();
  const existing = await db.get('invoices', id);
  if (!existing) throw new Error('Invoice not found');
  const updated = { ...existing, ...data };
  await db.put('invoices', updated);
  return updated;
}

export async function deleteInvoice(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('invoices', id);
}

// ═══════════════════════════════════════════════════════════
//  PAYMENTS
// ═══════════════════════════════════════════════════════════

export async function getAllPayments(): Promise<Payment[]> {
  const db = await getDB();
  const all = await db.getAll('payments');
  return all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function getPaymentsByCustomer(customerId: string): Promise<Payment[]> {
  const db = await getDB();
  return db.getAllFromIndex('payments', 'byCustomer', customerId);
}

export async function getPaymentsByJob(jobId: string): Promise<Payment[]> {
  const db = await getDB();
  return db.getAllFromIndex('payments', 'byJob', jobId);
}

export async function recordPayment(data: Omit<Payment, 'id' | 'createdAt'>): Promise<Payment> {
  const db = await getDB();
  const payment: Payment = { ...data, id: generateId(), createdAt: new Date().toISOString() };
  await db.put('payments', payment);

  // Update job balance
  if (data.jobId) {
    const job = await db.get('jobs', data.jobId);
    if (job) {
      const newPaid = job.paid + data.amount;
      await db.put('jobs', {
        ...job,
        paid: newPaid,
        balance: job.total - newPaid,
        updatedAt: new Date().toISOString(),
      });
    }
  }

  // Update invoice balance
  if (data.invoiceId) {
    const inv = await db.get('invoices', data.invoiceId);
    if (inv) {
      const newPaid = inv.paid + data.amount;
      await db.put('invoices', { ...inv, paid: newPaid, balance: inv.total - newPaid });
    }
  }

  return payment;
}

export async function deletePayment(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('payments', id);
}

// ═══════════════════════════════════════════════════════════
//  EXPENSES
// ═══════════════════════════════════════════════════════════

export async function getAllExpenses(): Promise<Expense[]> {
  const db = await getDB();
  const all = await db.getAll('expenses');
  return all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function saveExpense(data: Omit<Expense, 'id' | 'createdAt'>): Promise<Expense> {
  const db = await getDB();
  const expense: Expense = { ...data, id: generateId(), createdAt: new Date().toISOString() };
  await db.put('expenses', expense);
  return expense;
}

export async function updateExpense(id: string, data: Partial<Expense>): Promise<Expense> {
  const db = await getDB();
  const existing = await db.get('expenses', id);
  if (!existing) throw new Error('Expense not found');
  const updated = { ...existing, ...data };
  await db.put('expenses', updated);
  return updated;
}

export async function deleteExpense(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('expenses', id);
}

export async function getExpensesByCustomer(customerId: string): Promise<Expense[]> {
  const all = await getAllExpenses();
  return all.filter(e => e.customerId === customerId);
}

export async function getExpensesByVehicle(vehicleId: string): Promise<Expense[]> {
  const all = await getAllExpenses();
  return all.filter(e => e.vehicleId === vehicleId);
}

export async function getExpensesByJob(jobId: string): Promise<Expense[]> {
  const all = await getAllExpenses();
  return all.filter(e => e.jobId === jobId);
}

// ═══════════════════════════════════════════════════════════
//  PARTS / INVENTORY
// ═══════════════════════════════════════════════════════════

export async function getAllParts(): Promise<Part[]> {
  const db = await getDB();
  const all = await db.getAll('parts');
  return all.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getPart(id: string): Promise<Part | undefined> {
  const db = await getDB();
  return db.get('parts', id);
}

export async function getLowStockParts(): Promise<Part[]> {
  const all = await getAllParts();
  return all.filter(p => p.stock <= p.minStock);
}

export async function savePart(data: Omit<Part, 'id' | 'createdAt' | 'updatedAt'>): Promise<Part> {
  const db = await getDB();
  const part: Part = {
    ...data,
    id: generateId(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await db.put('parts', part);
  return part;
}

export async function updatePart(id: string, data: Partial<Part>): Promise<Part> {
  const db = await getDB();
  const existing = await db.get('parts', id);
  if (!existing) throw new Error('Part not found');
  const updated = { ...existing, ...data, updatedAt: new Date().toISOString() };
  await db.put('parts', updated);
  return updated;
}

export async function deletePart(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('parts', id);
}

export async function adjustStock(partId: string, type: StockMovementType, qty: number, note?: string, jobId?: string): Promise<void> {
  const db = await getDB();
  const part = await db.get('parts', partId);
  if (!part) throw new Error('Part not found');

  const isPositive = ['purchase', 'returned', 'adjustment'].includes(type);
  const newStock = isPositive ? part.stock + qty : part.stock - qty;

  await db.put('parts', { ...part, stock: Math.max(0, newStock), updatedAt: new Date().toISOString() });

  const movement: StockMovement = {
    id: generateId(),
    partId,
    type,
    qty: isPositive ? qty : -qty,
    jobId,
    note,
    date: new Date().toISOString().split('T')[0],
    createdAt: new Date().toISOString(),
  };
  await db.put('stock_movements', movement);
}

export async function getStockMovements(partId: string): Promise<StockMovement[]> {
  const db = await getDB();
  return db.getAllFromIndex('stock_movements', 'byPart', partId);
}

// ═══════════════════════════════════════════════════════════
//  SUPPLIERS
// ═══════════════════════════════════════════════════════════

export async function getAllSuppliers(): Promise<Supplier[]> {
  const db = await getDB();
  const all = await db.getAll('suppliers');
  return all.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getSupplier(id: string): Promise<Supplier | undefined> {
  const db = await getDB();
  return db.get('suppliers', id);
}

export async function saveSupplier(data: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>): Promise<Supplier> {
  const db = await getDB();
  const supplier: Supplier = {
    ...data,
    id: generateId(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await db.put('suppliers', supplier);
  return supplier;
}

export async function updateSupplier(id: string, data: Partial<Supplier>): Promise<Supplier> {
  const db = await getDB();
  const existing = await db.get('suppliers', id);
  if (!existing) throw new Error('Supplier not found');
  const updated = { ...existing, ...data, updatedAt: new Date().toISOString() };
  await db.put('suppliers', updated);
  return updated;
}

export async function deleteSupplier(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('suppliers', id);
}

// ═══════════════════════════════════════════════════════════
//  PURCHASES
// ═══════════════════════════════════════════════════════════

export async function getAllPurchases(): Promise<Purchase[]> {
  const db = await getDB();
  const all = await db.getAll('purchases');
  return all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function getPurchasesBySupplier(supplierId: string): Promise<Purchase[]> {
  const db = await getDB();
  return db.getAllFromIndex('purchases', 'bySupplier', supplierId);
}

export async function savePurchase(data: Omit<Purchase, 'id' | 'purchaseNo' | 'createdAt'>): Promise<Purchase> {
  const db = await getDB();
  const purchaseNo = await generatePurchaseNo();
  const purchase: Purchase = { ...data, id: generateId(), purchaseNo, createdAt: new Date().toISOString() };
  await db.put('purchases', purchase);

  // Update supplier totals
  const supplier = await db.get('suppliers', data.supplierId);
  if (supplier) {
    await db.put('suppliers', {
      ...supplier,
      totalPurchased: supplier.totalPurchased + data.total,
      balance: supplier.balance + (data.total - data.paid),
      totalPaid: supplier.totalPaid + data.paid,
      updatedAt: new Date().toISOString(),
    });
  }

  return purchase;
}

export async function paySupplier(data: {
  supplierId: string;
  amount: number;
  method: PaymentMethod;
  note?: string;
  date?: string;
}): Promise<void> {
  const db = await getDB();
  const date = data.date || new Date().toISOString().split('T')[0];
  
  const supplier = await db.get('suppliers', data.supplierId);
  if (supplier) {
    await db.put('suppliers', {
      ...supplier,
      totalPaid: supplier.totalPaid + data.amount,
      balance: Math.max(0, supplier.balance - data.amount),
      updatedAt: new Date().toISOString(),
    });
  }

  // Record as an Expense under parts_stock / supplier payment
  await saveExpense({
    category: 'parts_stock',
    supplierId: data.supplierId,
    description: `Supplier Payment: ${supplier?.name || 'Vendor'} - ${data.note || ''}`.trim(),
    amount: data.amount,
    method: data.method,
    date,
    notes: data.note,
  });
}

// ═══════════════════════════════════════════════════════════
//  WORKERS
// ═══════════════════════════════════════════════════════════

export async function getAllWorkers(): Promise<Worker[]> {
  const db = await getDB();
  return db.getAll('workers');
}

export async function getWorker(id: string): Promise<Worker | undefined> {
  const db = await getDB();
  return db.get('workers', id);
}

export async function saveWorker(data: Omit<Worker, 'id' | 'createdAt'>): Promise<Worker> {
  const db = await getDB();
  const worker: Worker = { ...data, id: generateId(), createdAt: new Date().toISOString() };
  await db.put('workers', worker);
  return worker;
}

export async function updateWorker(id: string, data: Partial<Worker>): Promise<Worker> {
  const db = await getDB();
  const existing = await db.get('workers', id);
  if (!existing) throw new Error('Worker not found');
  const updated = { ...existing, ...data };
  await db.put('workers', updated);
  return updated;
}

export async function deleteWorker(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('workers', id);
}

// ═══════════════════════════════════════════════════════════
//  ATTENDANCE
// ═══════════════════════════════════════════════════════════

export async function getAttendance(workerId: string): Promise<Attendance[]> {
  const db = await getDB();
  return db.getAllFromIndex('attendance', 'byWorker', workerId);
}

export async function markAttendance(data: Omit<Attendance, 'id' | 'createdAt'>): Promise<Attendance> {
  const db = await getDB();
  const dateKey = (data.date || new Date().toISOString()).split('T')[0];
  // Check if already exists for this date
  const existing = await db.getAllFromIndex('attendance', 'byWorker', data.workerId);
  const forDate = existing.find(a => (a.date || '').split('T')[0] === dateKey);

  if (forDate) {
    const updated = { ...forDate, date: dateKey, status: data.status, note: data.note };
    await db.put('attendance', updated);
    return updated;
  }

  const attendance: Attendance = { ...data, date: dateKey, id: generateId(), createdAt: new Date().toISOString() };
  await db.put('attendance', attendance);
  return attendance;
}

export async function getMonthAttendance(workerId: string, year: number, month: number): Promise<Attendance[]> {
  const all = await getAttendance(workerId);
  return all.filter(a => {
    const d = new Date(a.date);
    return d.getFullYear() === year && d.getMonth() === month;
  });
}

// ═══════════════════════════════════════════════════════════
//  ADVANCES
// ═══════════════════════════════════════════════════════════

export async function getAdvances(workerId: string): Promise<Advance[]> {
  const db = await getDB();
  return db.getAllFromIndex('advances', 'byWorker', workerId);
}

export async function saveAdvance(data: Omit<Advance, 'id' | 'createdAt'>): Promise<Advance> {
  const db = await getDB();
  const advance: Advance = { ...data, id: generateId(), createdAt: new Date().toISOString() };
  await db.put('advances', advance);
  
  // Tie into the accounting engine as an Expense
  const expense: Expense = {
    id: generateId(),
    category: 'salaries',
    description: `${data.type === 'bonus' ? 'Bonus' : 'Salary Advance'} - ${data.note || ''}`.trim(),
    amount: data.amount,
    method: 'cash',
    date: data.date,
    createdAt: new Date().toISOString()
  };
  await db.put('expenses', expense);

  return advance;
}

export async function deleteAdvance(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('advances', id);
}

// ═══════════════════════════════════════════════════════════
//  SALARY
// ═══════════════════════════════════════════════════════════

export async function getSalaryPayments(workerId: string): Promise<SalaryPayment[]> {
  const db = await getDB();
  return db.getAllFromIndex('salary_payments', 'byWorker', workerId);
}

export async function saveSalaryPayment(data: Omit<SalaryPayment, 'id' | 'createdAt'>): Promise<SalaryPayment> {
  const db = await getDB();
  const sal: SalaryPayment = { ...data, id: generateId(), createdAt: new Date().toISOString() };
  await db.put('salary_payments', sal);
  return sal;
}

// ═══════════════════════════════════════════════════════════
//  SETTINGS
// ═══════════════════════════════════════════════════════════

export async function getSetting(key: string): Promise<string | undefined> {
  const db = await getDB();
  const s = await db.get('settings', key);
  return s?.value;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDB();
  await db.put('settings', { key, value });
}

// ═══════════════════════════════════════════════════════════
//  ANALYTICS QUERIES
// ═══════════════════════════════════════════════════════════

export async function getRevenueForPeriod(from: string, to: string): Promise<number> {
  const payments = await getAllPayments();
  return payments
    .filter(p => p.date >= from && p.date <= to)
    .reduce((sum, p) => sum + p.amount, 0);
}

export async function getExpensesForPeriod(from: string, to: string): Promise<number> {
  const expenses = await getAllExpenses();
  return expenses
    .filter(e => e.date >= from && e.date <= to)
    .reduce((sum, e) => sum + e.amount, 0);
}

export async function getTotalReceivables(): Promise<number> {
  const jobs = await getAllJobs();
  return jobs
    .filter(j => j.status !== 'cancelled' && j.balance > 0)
    .reduce((sum, j) => sum + j.balance, 0);
}

export async function getTotalPayables(): Promise<number> {
  const suppliers = await getAllSuppliers();
  return suppliers.reduce((sum, s) => sum + s.balance, 0);
}

export async function getCustomerTotalSpent(customerId: string): Promise<number> {
  const payments = await getPaymentsByCustomer(customerId);
  return payments.reduce((sum, p) => sum + p.amount, 0);
}

export async function getCustomerBalance(customerId: string): Promise<number> {
  const jobs = await getJobsByCustomer(customerId);
  return jobs
    .filter(j => j.status !== 'cancelled')
    .reduce((sum, j) => sum + j.balance, 0);
}

export async function getDashboardStats() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const today = now.toISOString().split('T')[0];

  const [revenue, expenses, receivables, payables, activeJobs, lowStock, todayJobs] = await Promise.all([
    getRevenueForPeriod(monthStart, today),
    getExpensesForPeriod(monthStart, today),
    getTotalReceivables(),
    getTotalPayables(),
    getJobsByStatus('active'),
    getLowStockParts(),
    (await getAllJobs()).filter(j => j.createdAt.startsWith(today)),
  ]);

  return {
    revenue,
    expenses,
    profit: revenue - expenses,
    receivables,
    payables,
    activeJobsCount: activeJobs.length,
    lowStockCount: lowStock.length,
    todayJobsCount: todayJobs.length,
  };
}

// ═══════════════════════════════════════════════════════════
//  CLEAR ALL DATA (START FRESH)
// ═══════════════════════════════════════════════════════════

export async function clearAllData(keepSettings: boolean = true): Promise<void> {
  const db = await getDB();
  const stores = [
    'customers', 'vehicles', 'jobs', 'invoices', 'payments',
    'expenses', 'parts', 'stock_movements', 'purchases',
    'suppliers', 'workers', 'attendance', 'advances', 'salary_payments'
  ] as const;

  for (const store of stores) {
    const tx = db.transaction(store, 'readwrite');
    await tx.store.clear();
    await tx.done;
  }

  if (!keepSettings) {
    const tx = db.transaction('settings', 'readwrite');
    await tx.store.clear();
    await tx.done;
  }
}

// ═══════════════════════════════════════════════════════════
//  SEED DEMO DATA (OPTIONAL)
// ═══════════════════════════════════════════════════════════

let isSeeding = false;

export async function seedDemoData(): Promise<void> {
  if (isSeeding) return;
  isSeeding = true;

  try {
    const existing = await getAllCustomers();
    if (existing.length > 0) return;

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const lastMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const twoMonths = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Customers
  const raj = await saveCustomer({ name: 'Raj Kumar', phone: '9876543210', address: 'Anna Nagar, Chennai', whatsapp: '9876543210' });
  const muthu = await saveCustomer({ name: 'Muthu Selvam', phone: '9845123456', address: 'Tambaram, Chennai' });
  const priya = await saveCustomer({ name: 'Priya Devi', phone: '9900112233', address: 'Velachery, Chennai' });
  const siva = await saveCustomer({ name: 'Sivaramakrishnan', phone: '9944556677', address: 'Adyar, Chennai' });

  // Vehicles
  const i20 = await saveVehicle({ customerId: raj.id, make: 'Hyundai', model: 'i20', year: 2020, regNo: 'TN 09 AB 1234', mileage: 68420, color: 'White', fuelType: 'Petrol' });
  const nexon = await saveVehicle({ customerId: raj.id, make: 'Tata', model: 'Nexon', year: 2022, regNo: 'TN 09 CD 5678', mileage: 24000, color: 'Blue', fuelType: 'Diesel' });
  await saveVehicle({ customerId: muthu.id, make: 'Maruti', model: 'Swift', year: 2019, regNo: 'TN 10 EF 9012', mileage: 52000, color: 'Red', fuelType: 'Petrol' });
  await saveVehicle({ customerId: priya.id, make: 'Honda', model: 'City', year: 2021, regNo: 'TN 09 GH 3456', mileage: 18500, color: 'Silver', fuelType: 'Petrol' });
  await saveVehicle({ customerId: siva.id, make: 'Toyota', model: 'Innova', year: 2018, regNo: 'TN 02 IJ 7890', mileage: 92000, color: 'White', fuelType: 'Diesel' });

  // Suppliers
  const abc = await saveSupplier({ name: 'ABC Auto Parts', phone: '044-23456789', address: 'Purasawalkam, Chennai', totalPurchased: 182500, totalPaid: 160000, balance: 22500 });
  const kumar = await saveSupplier({ name: 'Kumar Auto Parts', phone: '9788001234', address: 'Koyambedu, Chennai', totalPurchased: 95000, totalPaid: 95000, balance: 0 });

  // Parts
  const bp = await savePart({ sku: 'BP-001', name: 'Brake Pads (Front)', category: 'Brakes', purchasePrice: 2800, sellingPrice: 3500, stock: 8, minStock: 3, unit: 'Set', supplierId: abc.id });
  const eo = await savePart({ sku: 'OIL-001', name: 'Engine Oil 5W-30 (1L)', category: 'Lubricants', purchasePrice: 450, sellingPrice: 650, stock: 18, minStock: 10, unit: 'Litre', supplierId: kumar.id });
  await savePart({ sku: 'AF-001', name: 'Air Filter', category: 'Filters', purchasePrice: 350, sellingPrice: 550, stock: 6, minStock: 5, unit: 'Piece', supplierId: abc.id });
  await savePart({ sku: 'OF-001', name: 'Oil Filter', category: 'Filters', purchasePrice: 180, sellingPrice: 280, stock: 2, minStock: 5, unit: 'Piece', supplierId: abc.id }); // Low stock
  await savePart({ sku: 'SP-001', name: 'Spark Plugs', category: 'Ignition', purchasePrice: 280, sellingPrice: 450, stock: 12, minStock: 8, unit: 'Set', supplierId: kumar.id });

  // Workers
  const ramesh = await saveWorker({ name: 'Ramesh K', role: 'mechanic', phone: '9876001122', salary: 20000, joinDate: '2024-01-15', isActive: true });
  const senthil = await saveWorker({ name: 'Senthil M', role: 'mechanic', phone: '9876003344', salary: 18000, joinDate: '2024-03-01', isActive: true });
  await saveWorker({ name: 'Anbu Kumar', role: 'helper', phone: '9876005566', salary: 12000, joinDate: '2025-01-10', isActive: true });

  // Jobs
  const job1 = await saveJob({
    customerId: raj.id, vehicleId: i20.id, status: 'completed',
    complaint: 'Brake noise when stopping',
    diagnosis: 'Front brake pads worn out, rotor surface okay',
    items: [
      { id: generateId(), type: 'part', partId: bp.id, name: 'Brake Pads (Front)', qty: 1, unitPrice: 3500, total: 3500 },
      { id: generateId(), type: 'labour', name: 'Brake Service Labour', qty: 1, unitPrice: 1000, total: 1000 },
    ],
    subtotal: 4500, total: 4500, paid: 2000, balance: 2500, discount: 0,
  });

  const job2 = await saveJob({
    customerId: muthu.id, vehicleId: (await getVehiclesByCustomer(muthu.id))[0]?.id || muthu.id, status: 'active',
    complaint: 'Full service due, oil change',
    items: [
      { id: generateId(), type: 'part', partId: eo.id, name: 'Engine Oil 5W-30 (4L)', qty: 4, unitPrice: 650, total: 2600 },
      { id: generateId(), type: 'part', name: 'Oil Filter', qty: 1, unitPrice: 280, total: 280 },
      { id: generateId(), type: 'labour', name: 'Oil Change + Service Labour', qty: 1, unitPrice: 800, total: 800 },
    ],
    subtotal: 3680, total: 3680, paid: 0, balance: 3680, discount: 0,
  });

  // Invoices for completed job
  await saveInvoice({
    jobId: job1.id, customerId: raj.id,
    items: job1.items, subtotal: 4500, discount: 0, total: 4500, paid: 2000, balance: 2500,
    date: today,
  });

  // Payments
  await recordPayment({ customerId: raj.id, jobId: job1.id, amount: 2000, method: 'upi', date: today, note: 'UPI payment received' });

  // Expenses
  await saveExpense({ category: 'parts_stock', description: 'Brake pads stock purchase', supplierId: abc.id, amount: 14000, method: 'bank_transfer', billNo: 'ABC-2398', date: lastMonth });
  await saveExpense({ category: 'parts_stock', description: 'Engine oil and filters', supplierId: kumar.id, amount: 8100, method: 'cash', date: lastMonth });
  await saveExpense({ category: 'rent', description: 'Workshop rent - August 2026', amount: 25000, method: 'bank_transfer', date: monthStart });
  await saveExpense({ category: 'electricity', description: 'Electricity bill - July 2026', amount: 3800, method: 'cash', date: lastMonth });
  await saveExpense({ category: 'salaries', description: 'Staff salary - July 2026', amount: 50000, method: 'bank_transfer', date: lastMonth });
  await saveExpense({ category: 'tools_equipment', description: 'Impact wrench', amount: 4500, method: 'cash', date: twoMonths });

  // Attendance for Ramesh
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  for (let d = 1; d <= Math.min(daysInMonth, new Date().getDate()); d++) {
    const dateStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayOfWeek = new Date(dateStr).getDay();
    if (dayOfWeek === 0) continue; // Sunday off
    await markAttendance({ workerId: ramesh.id, date: dateStr, status: d === 5 ? 'absent' : 'present' });
    await markAttendance({ workerId: senthil.id, date: dateStr, status: 'present' });
  }

  // Settings
  await setSetting('workshop_name', 'Mithra Engineering Works (MEW)');
  await setSetting('workshop_phone', '044-23456789');
  await setSetting('workshop_address', 'No. 42, GST Road, Chennai - 600044');
  await setSetting('language', 'ta');
  await setSetting('currency', 'INR');
  await setSetting('onboarded', 'true');
  } finally {
    isSeeding = false;
  }
}
