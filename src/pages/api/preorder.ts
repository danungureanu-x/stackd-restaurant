import type { APIRoute } from 'astro';
import { Resend } from 'resend';

export const prerender = false;

interface OrderItem {
  name: string;
  category: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
}

interface OrderPayload {
  orderNumber: string;
  timestamp: string;
  customer: { name: string; phone: string };
  items: OrderItem[];
  summary: { itemCount: number; totalPrice: number; currency: string };
}

export const POST: APIRoute = async ({ request }) => {
  const apiKey = import.meta.env.RESEND_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Missing RESEND_API_KEY' }), { status: 500 });
  }

  let payload: OrderPayload;
  try {
    payload = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 });
  }

  const { orderNumber, timestamp, customer, items, summary } = payload;

  const itemRows = items
    .map(i => `<tr>
      <td style="padding:6px 12px;border-bottom:1px solid #2a2a2a;">${i.qty}×</td>
      <td style="padding:6px 12px;border-bottom:1px solid #2a2a2a;">${i.name}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #2a2a2a;color:#888;">${i.category}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #2a2a2a;text-align:right;">${i.lineTotal} lei</td>
    </tr>`)
    .join('');

  const html = `
    <div style="font-family:monospace;background:#0d0c0a;color:#f0ede8;max-width:520px;margin:0 auto;border:1px solid #2a2a2a;border-radius:8px;overflow:hidden;">
      <div style="background:#1a1a17;padding:20px 24px;border-bottom:1px solid #2a2a2a;">
        <p style="margin:0;font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#888;">Click &amp; Collect</p>
        <h1 style="margin:4px 0 0;font-size:20px;letter-spacing:-.01em;">New Order ${orderNumber}</h1>
      </div>
      <div style="padding:20px 24px;">
        <p style="margin:0 0 4px;font-size:12px;color:#888;">CUSTOMER</p>
        <p style="margin:0 0 2px;">${customer.name}</p>
        <p style="margin:0 0 16px;color:#888;">${customer.phone}</p>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead>
            <tr style="color:#888;font-size:11px;letter-spacing:.1em;text-transform:uppercase;">
              <th style="padding:6px 12px;text-align:left;border-bottom:1px solid #2a2a2a;">Qty</th>
              <th style="padding:6px 12px;text-align:left;border-bottom:1px solid #2a2a2a;">Item</th>
              <th style="padding:6px 12px;text-align:left;border-bottom:1px solid #2a2a2a;">Category</th>
              <th style="padding:6px 12px;text-align:right;border-bottom:1px solid #2a2a2a;">Price</th>
            </tr>
          </thead>
          <tbody>${itemRows}</tbody>
        </table>
        <div style="display:flex;justify-content:space-between;padding:12px 12px 0;border-top:1px solid #2a2a2a;margin-top:4px;">
          <span style="font-size:11px;letter-spacing:.15em;text-transform:uppercase;color:#888;">Total (${summary.itemCount} items)</span>
          <span style="font-size:16px;font-weight:700;color:#e8c56d;">${summary.totalPrice} lei</span>
        </div>
        <p style="margin:20px 0 0;font-size:11px;color:#666;">${new Date(timestamp).toLocaleString('ro-RO', { timeZone: 'Europe/Bucharest' })}</p>
      </div>
    </div>`;

  const resend = new Resend(apiKey);

  const { error } = await resend.emails.send({
    from: 'STACKD Orders <onboarding@resend.dev>',
    to: 'dungureanu1106@gmail.com',
    subject: `New order ${orderNumber} — ${summary.totalPrice} lei`,
    html,
  });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};
