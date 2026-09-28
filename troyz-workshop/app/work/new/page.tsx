'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getAllCustomers, getAllVehicles, getAllParts, saveJob, Customer, Vehicle, Part, JobItem } from '@/lib/db';

import { Suspense } from 'react';

function NewJobForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [partsList, setPartsList] = useState<Part[]>([]);

  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [complaint, setComplaint] = useState('');

  const [items, setItems] = useState<JobItem[]>([]);
  const [discount, setDiscount] = useState(0);

  useEffect(() => {
    Promise.all([getAllCustomers(), getAllVehicles(), getAllParts()]).then(([c, v, p]) => {
      setCustomers(c);
      setVehicles(v);
      setPartsList(p);
      
      const prefillCustomerId = searchParams.get('customerId');
      if (prefillCustomerId) {
        setSelectedCustomerId(prefillCustomerId);
      }
    });
  }, [searchParams]);

  const addPart = (partId: string) => {
    const part = partsList.find(p => p.id === partId);
    if (!part) return;
    setItems([...items, {
      id: Date.now().toString(),
      type: 'part',
      partId: part.id,
      name: part.name,
      qty: 1,
      unitPrice: part.sellingPrice,
      total: part.sellingPrice
    }]);
  };

  const addLabour = () => {
    setItems([...items, {
      id: Date.now().toString(),
      type: 'labour',
      name: 'Labour Charges',
      qty: 1,
      unitPrice: 500,
      total: 500
    }]);
  };

  const updateItem = (id: string, field: keyof JobItem, value: any) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        updated.total = updated.qty * updated.unitPrice;
        return updated;
      }
      return item;
    }));
  };

  const removeItem = (id: string) => {
    setItems(items.filter(i => i.id !== id));
  };

  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const total = subtotal - discount;

  const handleSave = async () => {
    if (!selectedCustomerId || !selectedVehicleId) return alert('Please select a customer and vehicle');
    await saveJob({
      customerId: selectedCustomerId,
      vehicleId: selectedVehicleId,
      status: 'active',
      complaint,
      items,
      subtotal,
      discount,
      total,
      paid: 0,
      balance: total
    });
    router.push('/work');
  };

  return (
    <div className="stagger-children" style={{ maxWidth: 900, margin: '0 auto' }}>
      <div className="page-header">
        <div className="page-header-left">
          <button className="btn btn-ghost" onClick={() => router.back()}>← Back</button>
          <div>
            <h1 className="page-title">New Job Card</h1>
          </div>
        </div>
      </div>

      <div className="card mb-6">
        <h3 className="text-h3 mb-4">Customer & Vehicle</h3>
        <div className="grid grid-2">
          <div className="form-group">
            <label className="form-label required">Customer</label>
            <select className="select" value={selectedCustomerId} onChange={e => {
              setSelectedCustomerId(e.target.value);
              setSelectedVehicleId(''); // reset vehicle
            }}>
              <option value="">-- Select Customer --</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label required">Vehicle</label>
            <select className="select" value={selectedVehicleId} onChange={e => setSelectedVehicleId(e.target.value)} disabled={!selectedCustomerId}>
              <option value="">-- Select Vehicle --</option>
              {vehicles.filter(v => v.customerId === selectedCustomerId).map(v => (
                <option key={v.id} value={v.id}>{v.make} {v.model} ({v.regNo})</option>
              ))}
            </select>
          </div>
        </div>
        <div className="form-group mt-4">
          <label className="form-label">Customer Complaint</label>
          <textarea className="textarea" placeholder="e.g. Brake noise, oil leak..." value={complaint} onChange={e => setComplaint(e.target.value)} />
        </div>
      </div>

      <div className="card mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-h3">Work Details (Parts & Labour)</h3>
          <div className="flex gap-2">
            <select className="select" onChange={e => { if (e.target.value) { addPart(e.target.value); e.target.value = ''; } }} style={{ width: 200 }}>
              <option value="">+ Add Part...</option>
              {partsList.map(p => <option key={p.id} value={p.id}>{p.name} (₹{p.sellingPrice})</option>)}
            </select>
            <button className="btn btn-secondary" onClick={addLabour}>+ Add Labour</button>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="text-center p-6 text-muted border border-dashed rounded" style={{ borderColor: 'var(--border)' }}>
            No parts or labour added yet.
          </div>
        ) : (
          <table className="data-table mb-4">
            <thead>
              <tr>
                <th>Item / Description</th>
                <th style={{ width: 100 }}>Qty</th>
                <th style={{ width: 150 }}>Price (₹)</th>
                <th style={{ width: 150 }}>Total (₹)</th>
                <th style={{ width: 60 }}></th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id}>
                  <td>
                    <input className="input" value={item.name} onChange={e => updateItem(item.id, 'name', e.target.value)} disabled={item.type === 'part'} />
                  </td>
                  <td>
                    <input className="input" type="number" min="1" value={item.qty} onChange={e => updateItem(item.id, 'qty', parseInt(e.target.value) || 1)} />
                  </td>
                  <td>
                    <input className="input" type="number" min="0" value={item.unitPrice} onChange={e => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)} />
                  </td>
                  <td className="font-bold">₹{item.total}</td>
                  <td>
                    <button className="btn btn-ghost btn-icon-sm text-danger" onClick={() => removeItem(item.id)}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="flex justify-end mt-4">
          <div style={{ width: 300 }}>
            <div className="flex justify-between mb-2">
              <span className="text-muted">Subtotal</span>
              <span>₹{subtotal}</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-muted">Discount (₹)</span>
              <input className="input" type="number" style={{ width: 100, padding: 4 }} value={discount} onChange={e => setDiscount(parseFloat(e.target.value) || 0)} />
            </div>
            <div className="divider"></div>
            <div className="flex justify-between items-center">
              <span className="font-bold">Grand Total</span>
              <span className="text-h2 text-orange">₹{total}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 mb-10">
        <button className="btn btn-secondary" onClick={() => router.back()}>Cancel</button>
        <button className="btn btn-primary btn-lg" onClick={handleSave}>Save Job Card</button>
      </div>
    </div>
  );
}

export default function NewJobPage() {
  return (
    <Suspense fallback={<div className="p-6"><div className="loader"></div></div>}>
      <NewJobForm />
    </Suspense>
  );
}
