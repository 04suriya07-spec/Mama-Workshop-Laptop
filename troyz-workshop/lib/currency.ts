// ═══════════════════════════════════════════════════════════
//  TROYZ WORKSHOP OS — Currency & Number Utilities
// ═══════════════════════════════════════════════════════════

/**
 * Format a number as Indian Rupee (₹)
 * Uses Indian numbering system: 1,00,000 (lakhs)
 */
export function formatCurrency(amount: number, compact = false): string {
  if (compact) {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)}Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)}L`;
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
  }

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat('en-IN').format(n);
}

export function parseIndianAmount(str: string): number {
  // Remove ₹, commas, spaces
  return parseFloat(str.replace(/[₹,\s]/g, '')) || 0;
}

// ═══════════════════════════════════════════════════════════
//  Date Utilities
// ═══════════════════════════════════════════════════════════

export function formatDate(date: string | Date, format: 'short' | 'long' | 'relative' = 'short'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '—';

  if (format === 'relative') {
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return 'yesterday';
    if (days < 7) return `${days}d ago`;
  }

  if (format === 'long') {
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function today(): string {
  return new Date().toISOString().split('T')[0];
}

export function thisMonthStart(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

export function lastMonthStart(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

export function lastMonthEnd(): string {
  const d = new Date();
  d.setDate(0); // last day of previous month
  return d.toISOString().split('T')[0];
}

export function monthLabel(monthStr: string): string {
  // monthStr = "2026-08"
  const [y, m] = monthStr.split('-');
  const d = new Date(parseInt(y), parseInt(m) - 1, 1);
  return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

// ═══════════════════════════════════════════════════════════
//  String Utilities
// ═══════════════════════════════════════════════════════════

export function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map(n => n[0])
    .join('')
    .toUpperCase();
}

export function titleCase(str: string): string {
  return str
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function phoneLink(phone: string): string {
  return `tel:${phone.replace(/\s/g, '')}`;
}

export function whatsappLink(phone: string, message?: string): string {
  const p = phone.replace(/\D/g, '');
  const num = p.startsWith('91') ? p : `91${p}`;
  const msg = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${num}${msg}`;
}
