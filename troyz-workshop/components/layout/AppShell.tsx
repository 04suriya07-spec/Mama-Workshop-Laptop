'use client';

import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import MobileBottomNav from './MobileBottomNav';
import VoiceEntry from '@/components/ai/VoiceEntry';
import AskTroyz from '@/components/ai/AskTroyz';
import { getSetting } from '@/lib/db';
import {
  getAllCustomers, getAllVehicles, getAllWorkers, getAllExpenses, getAllPayments, getAllParts, getAllSuppliers,
  saveCustomer, updateCustomer, recordPayment, saveExpense, markAttendance, saveWorker, updateWorker, saveVehicle,
  saveSupplier, updateSupplier, paySupplier, savePart, updatePart, adjustStock,
  Customer, Worker, ExpenseCategory, PaymentMethod, Supplier, Part
} from '@/lib/db';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [pageTitle, setPageTitle] = useState('Dashboard');

  useEffect(() => {
    let tries = 0;
    const sync = () => {
      tries++;
      const nv = typeof window !== 'undefined' ? (window as any).AndroidNativeVoice : null;
      getSetting('gemini_api_key').then(key => {
        if (nv && key) {
          nv.syncApiKey(key);
        } else if (tries < 15) {
          setTimeout(sync, 1000);
        }
      }).catch(() => { if (tries < 15) setTimeout(sync, 1000); });
    };
    sync();
  }, []);

  // ─── Process native overlay actions into IndexedDB ─────────
  useEffect(() => {
    const executeAction = async (action: any) => {
      if (!action || !action.type || !action.data) return;
      const { type, data } = action;
      try {
        if (type === 'add_customer' && data.name) {
          await saveCustomer({
            name: data.name,
            phone: data.phone || '9999999999',
            address: data.address || '',
            whatsapp: data.phone || '',
          });
          window.dispatchEvent(new CustomEvent('troyz_data_updated'));
        } else if (type === 'customer_advance' && data.amount) {
          const custs = await getAllCustomers();
          const allVehicles = await getAllVehicles();
          let cust = data.customerName ? custs.find(c => c.name.toLowerCase().includes((data.customerName || '').toLowerCase())) : null;
          let vehicle = data.vehicleRegNo ? allVehicles.find(v => v.regNo.replace(/\s/g, '').toLowerCase().includes(data.vehicleRegNo.replace(/\s/g, '').toLowerCase())) : null;
          if (vehicle && !cust) {
            cust = custs.find(c => c.id === vehicle?.customerId);
          }
          if (!cust && data.customerName) {
            cust = await saveCustomer({ name: data.customerName, phone: '9999999999' });
          }
          if (cust) {
            if (!vehicle) {
              const custVehicles = allVehicles.filter(v => v.customerId === cust?.id);
              if (custVehicles.length > 0) vehicle = custVehicles[0];
            }
            await recordPayment({
              customerId: cust.id,
              vehicleId: vehicle?.id || undefined,
              amount: Number(data.amount),
              date: new Date().toISOString().split('T')[0],
              method: (data.method || 'cash') as PaymentMethod,
              paymentType: 'advance',
              note: data.note || 'Advance from voice',
            });
            window.dispatchEvent(new CustomEvent('troyz_data_updated'));
          }
        } else if (type === 'vehicle_expense' && data.amount) {
          const custs = await getAllCustomers();
          const allVehicles = await getAllVehicles();
          let cust = data.customerName ? custs.find(c => c.name.toLowerCase().includes((data.customerName || '').toLowerCase())) : null;
          let vehicle = data.vehicleRegNo ? allVehicles.find(v => v.regNo.replace(/\s/g, '').toLowerCase().includes(data.vehicleRegNo.replace(/\s/g, '').toLowerCase())) : null;
          if (vehicle && !cust) {
            cust = custs.find(c => c.id === vehicle?.customerId);
          }
          if (!cust && data.customerName && data.customerName.length >= 2) {
            cust = await saveCustomer({ name: data.customerName, phone: '9999999999' });
          }
          if (cust && !vehicle) {
            const custVehicles = allVehicles.filter(v => v.customerId === cust?.id);
            if (custVehicles.length > 0) vehicle = custVehicles[0];
          }
          await saveExpense({
            customerId: cust?.id || undefined,
            vehicleId: vehicle?.id || undefined,
            date: new Date().toISOString().split('T')[0],
            category: 'customer_vehicle_direct' as ExpenseCategory,
            expenseType: data.expenseType || 'lathe_work',
            amount: Number(data.amount),
            method: (data.method || 'cash') as PaymentMethod,
            description: data.description || 'Workshop direct vehicle expense',
          });
          window.dispatchEvent(new CustomEvent('troyz_data_updated'));
        } else if (type === 'worker_attendance' && data.workerName) {
          const workers = await getAllWorkers();
          const wObj = workers.find(w => w.name.toLowerCase().includes((data.workerName || '').toLowerCase()));
          if (wObj) {
            await markAttendance({
              workerId: wObj.id,
              date: new Date().toISOString().split('T')[0],
              status: (data.status || 'present') as any,
            });
            window.dispatchEvent(new CustomEvent('troyz_data_updated'));
          }
        } else if (type === 'add_worker' && data.name) {
          await saveWorker({
            name: data.name,
            role: (data.role || 'mechanic') as any,
            salary: Number(data.salary || 15000),
            phone: data.phone || '',
            joinDate: new Date().toISOString().split('T')[0],
            isActive: true,
          });
          window.dispatchEvent(new CustomEvent('troyz_data_updated'));
        } else if (type === 'update_worker' && data.workerName) {
          const workers = await getAllWorkers();
          const wObj = workers.find(w => w.name.toLowerCase().includes((data.workerName || '').toLowerCase()));
          if (wObj) {
            const updates: Partial<Worker> = {};
            if (data.role) updates.role = data.role as any;
            if (data.salary) updates.salary = Number(data.salary);
            if (data.phone) updates.phone = data.phone;
            if (data.address) updates.address = data.address;
            await updateWorker(wObj.id, updates);
            window.dispatchEvent(new CustomEvent('troyz_data_updated'));
          }
        } else if (type === 'update_customer' && data.customerName) {
          const custs = await getAllCustomers();
          const cObj = custs.find(c => c.name.toLowerCase().includes((data.customerName || '').toLowerCase()));
          if (cObj) {
            const updates: Partial<Customer> = {};
            if (data.phone) updates.phone = data.phone;
            if (data.address) updates.address = data.address;
            if (data.whatsapp) updates.whatsapp = data.whatsapp;
            await updateCustomer(cObj.id, updates);
            window.dispatchEvent(new CustomEvent('troyz_data_updated'));
          }
        } else if (type === 'add_vehicle' && data.regNo) {
          const custs = await getAllCustomers();
          let cust = custs.find(c => c.name.toLowerCase().includes((data.customerName || '').toLowerCase()));
          if (!cust && data.customerName) {
            cust = await saveCustomer({ name: data.customerName, phone: '9999999999' });
          }
          await saveVehicle({
            customerId: cust?.id || '',
            regNo: data.regNo,
            rigType: data.rigType || 'DTH Rig',
            make: data.make || 'Ashok Leyland',
            model: data.model || 'PRD 1000',
            compressorDetails: data.compressorDetails || 'ELGi 1100 CFM',
          });
          window.dispatchEvent(new CustomEvent('troyz_data_updated'));
        } else if (type === 'add_supplier' && data.name) {
          await saveSupplier({
            name: data.name,
            phone: data.phone || '',
            address: data.address || '',
            totalPurchased: 0,
            totalPaid: 0,
            balance: 0,
          });
          window.dispatchEvent(new CustomEvent('troyz_data_updated'));
        } else if ((type === 'pay_supplier' || type === 'supplier_payment') && data.amount) {
          const suppliers = await getAllSuppliers();
          const supp = suppliers.find(s => s.name.toLowerCase().includes((data.supplierName || '').toLowerCase()));
          if (supp) {
            await paySupplier({
              supplierId: supp.id,
              amount: Number(data.amount),
              method: (data.method || 'cash') as PaymentMethod,
              note: data.note || 'Payment via voice',
            });
            window.dispatchEvent(new CustomEvent('troyz_data_updated'));
          }
        } else if (type === 'add_part' && data.name) {
          await savePart({
            sku: data.sku || `SKU-${Date.now().toString().slice(-4)}`,
            name: data.name,
            purchasePrice: Number(data.purchasePrice || 0),
            sellingPrice: Number(data.sellingPrice || data.purchasePrice || 0),
            stock: Number(data.qty || data.stock || 1),
            minStock: Number(data.minStock || 2),
            unit: data.unit || 'Piece',
          });
          window.dispatchEvent(new CustomEvent('troyz_data_updated'));
        } else if (type === 'adjust_stock' && data.partName && data.qty) {
          const parts = await getAllParts();
          const part = parts.find(p => p.name.toLowerCase().includes(data.partName.toLowerCase()));
          if (part) {
            await adjustStock(part.id, (data.movementType || 'purchase') as any, Number(data.qty), data.note || 'Stock update via voice');
            window.dispatchEvent(new CustomEvent('troyz_data_updated'));
          }
        }
      } catch (err) {
        console.error('Failed to execute native action in AppShell:', err);
      }
    };

    (window as any)._onNativeActionDispatched = (actionStr: string) => {
      try {
        const action = typeof actionStr === 'string' ? JSON.parse(actionStr) : actionStr;
        executeAction(action);
      } catch (e) {
        console.error('Error in _onNativeActionDispatched:', e);
      }
    };

    const pollPending = () => {
      const nv = typeof window !== 'undefined' ? (window as any).AndroidNativeVoice : null;
      if (nv && typeof nv.pollPendingActions === 'function') {
        try {
          const pendingStr = nv.pollPendingActions();
          if (pendingStr && pendingStr !== '[]') {
            const arr = JSON.parse(pendingStr);
            if (Array.isArray(arr)) {
              arr.forEach(act => executeAction(act));
            }
          }
        } catch (e) {}
      }
    };

    pollPending();
    const interval = setInterval(pollPending, 1500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const nv = typeof window !== 'undefined' ? (window as any).AndroidNativeVoice : null;
    if (!nv) return;
    const syncWorkshop = () => {
      Promise.all([
        getAllCustomers(), getAllVehicles(), getAllWorkers(),
        getAllExpenses(), getAllPayments(), getAllParts(),
      ]).then(([customers, vehicles, workers, expenses, payments, parts]) => {
        const activeWorkers = (workers as any[]).filter((w: any) => w.isActive);
        const totalRevenue = (payments as any[]).reduce((s: number, p: any) => s + (p.amount || 0), 0);
        const totalExpenses = (expenses as any[]).reduce((s: number, e: any) => s + (e.amount || 0), 0);
        const ctx = [
          'Live Workshop Snapshot:',
          '- Customers (' + customers.length + '): ' + (customers as any[]).slice(0, 10).map((c: any) => c.name + ' (' + (c.phone || '') + ', ' + (c.address || '') + ')').join(', ') || 'None yet',
          '- Vehicles/Bore Rigs (' + vehicles.length + '): ' + (vehicles as any[]).slice(0, 8).map((v: any) => v.regNo + ' (' + (v.rigType || 'Rig') + ')').join(', ') || 'None yet',
          '- Workers (' + activeWorkers.length + '): ' + activeWorkers.map((w: any) => w.name + ' (' + w.role + ')').join(', ') || 'None yet',
          '- Total Revenue: INR ' + totalRevenue.toLocaleString('en-IN'),
          '- Total Expenses: INR ' + totalExpenses.toLocaleString('en-IN'),
          '- Low Stock Parts: ' + (parts as any[]).filter((p: any) => p.stock <= p.minStock).map((p: any) => p.name + ' (Qty: ' + p.stock + ')').join(', ') || 'All parts in stock',
        ].join('\n');
        nv.setWorkshopContext(ctx);
      }).catch(() => {});
    };
    syncWorkshop();
    window.addEventListener('troyz_data_updated', syncWorkshop);
    return () => window.removeEventListener('troyz_data_updated', syncWorkshop);
  }, []);

  return (
    <div className="app-layout">
      <Sidebar
        collapsed={sidebarCollapsed}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />

      {mobileSidebarOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 99, backdropFilter: 'blur(4px)' }}
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      <div className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <Header
          title={pageTitle}
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
          onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
        />
        <main className="page-wrapper animate-fade-in">
          {children}
        </main>
      </div>

      <VoiceEntry />
      <AskTroyz />
      <MobileBottomNav />
    </div>
  );
}
