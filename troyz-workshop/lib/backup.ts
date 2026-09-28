import { getDB } from './db';

const ALL_STORES = [
  'customers', 'vehicles', 'jobs', 'invoices', 'payments',
  'expenses', 'purchases', 'suppliers', 'parts', 'stock_movements',
  'workers', 'attendance', 'advances', 'salary_payments', 'settings',
] as const;

export interface BackupData {
  version: 1;
  appName: 'MEW-OS';
  exportedAt: string;
  deviceInfo: string;
  stores: Record<string, any[]>;
}

export async function exportAllData(): Promise<BackupData> {
  const db = await getDB();
  const stores: Record<string, any[]> = {};

  for (const storeName of ALL_STORES) {
    try {
      stores[storeName] = await db.getAll(storeName as any);
    } catch {
      stores[storeName] = [];
    }
  }

  return {
    version: 1,
    appName: 'MEW-OS',
    exportedAt: new Date().toISOString(),
    deviceInfo: navigator.userAgent.substring(0, 100),
    stores,
  };
}

export async function downloadBackup(): Promise<void> {
  const data = await exportAllData();
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  const date = new Date().toISOString().slice(0, 10);
  a.download = `MEW-Backup-${date}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function shareBackup(): Promise<void> {
  const data = await exportAllData();
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const date = new Date().toISOString().slice(0, 10);
  const fileName = `MEW-Backup-${date}.json`;

  if (navigator.share) {
    const file = new File([blob], fileName, { type: 'application/json' });
    try {
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'MEW Data Backup',
          text: 'MEW Workshop data backup file',
          files: [file],
        });
        return;
      }
    } catch {
      // share cancelled, fall through to download
    }
  }
  await downloadBackup();
}

export async function importFromJSON(jsonText: string): Promise<{ success: boolean; message: string; counts: Record<string, number> }> {
  let data: BackupData;
  try {
    data = JSON.parse(jsonText);
  } catch {
    return { success: false, message: 'Invalid JSON file.', counts: {} };
  }

  if (!data.appName || data.appName !== 'MEW-OS') {
    return { success: false, message: 'This is not a valid MEW backup file.', counts: {} };
  }

  if (!data.stores || typeof data.stores !== 'object') {
    return { success: false, message: 'Backup file is empty or corrupted.', counts: {} };
  }

  const db = await getDB();
  const counts: Record<string, number> = {};

  for (const storeName of ALL_STORES) {
    const items = data.stores[storeName];
    if (!items || !Array.isArray(items)) continue;

    let count = 0;
    for (const item of items) {
      try {
        await db.put(storeName as any, item);
        count++;
      } catch {
        // skip individual item errors
      }
    }
    counts[storeName] = count;
  }

  const total = Object.values(counts).reduce((s, n) => s + n, 0);
  return {
    success: true,
    message: `Restored ${total} records from ${data.exportedAt ? new Date(data.exportedAt).toLocaleDateString() : 'backup'}.`,
    counts,
  };
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
