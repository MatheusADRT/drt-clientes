'use strict';
// Regras de mensalidade: datas no fuso de Bruxelas, status de cada cliente e registro de pagamentos.
// Tudo em datas "AAAA-MM-DD" (sem hora) para não haver surpresa com fuso ou horário de verão.

const TZ = 'Europe/Brussels';

function today(now = new Date()) {
  // en-CA formata como AAAA-MM-DD
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

function parse(d) { const [y, m, dd] = d.split('-').map(Number); return { y, m, d: dd }; }
function fmt(y, m, d) { return String(y).padStart(4, '0') + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0'); }
function daysInMonth(y, m) { return new Date(Date.UTC(y, m, 0)).getUTCDate(); }
function addDays(date, n) {
  const { y, m, d } = parse(date);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return fmt(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
}
// soma meses mantendo o dia de vencimento (31 vira o último dia do mês quando o mês é mais curto)
function addMonths(date, n, anchorDay) {
  const { y, m, d } = parse(date);
  const idx = (y * 12 + (m - 1)) + n;
  const ny = Math.floor(idx / 12), nm = (idx % 12) + 1;
  const day = Math.min(anchorDay || d, daysInMonth(ny, nm));
  return fmt(ny, nm, day);
}
function diffDays(a, b) { // b - a em dias
  const pa = parse(a), pb = parse(b);
  return Math.round((Date.UTC(pb.y, pb.m - 1, pb.d) - Date.UTC(pa.y, pa.m - 1, pa.d)) / 86400000);
}

// próximo vencimento = dia seguinte ao último dia pago
function dueDate(client) { return addDays(client.paidUntil, 1); }

/**
 * Status de um cliente numa data:
 *  ok        em dia
 *  soon      vence nos próximos `reminderDays` dias
 *  grace     venceu, dentro da carência (o site continua no ar; só o dono vê o aviso)
 *  suspended passou da carência: o site sai do ar até o pagamento
 *  paused    cliente pausado/arquivado (sem cobrança, sem suspensão)
 */
function status(client, settings, on = today()) {
  const grace = Number.isFinite(client.graceDays) ? client.graceDays : settings.graceDays;
  const remind = settings.reminderDays;
  const due = dueDate(client);
  const suspendOn = addDays(due, grace);
  const daysToDue = diffDays(on, due);
  let s;
  if (client.override === 'active') s = 'ok';
  else if (client.override === 'suspended') s = 'suspended';
  else if (client.override === 'paused') s = 'paused';
  else if (on >= suspendOn) s = 'suspended';
  else if (on >= due) s = 'grace';
  else if (daysToDue <= remind) s = 'soon';
  else s = 'ok';
  return { status: s, due, suspendOn, daysToDue, daysToSuspend: diffDays(on, suspendOn), forced: client.override !== 'auto' && !!client.override };
}

// registra um pagamento de N meses e empurra o "pago até"
function applyPayment(client, months, anchorDay) {
  const from = dueDate(client);
  const nextDue = addMonths(from, months, anchorDay || client.dueDay);
  const to = addDays(nextDue, -1);
  return { from, to };
}

// primeiro "pago até" de um cliente novo: o dia anterior ao primeiro vencimento
function initialPaidUntil(firstDue) { return addDays(firstDue, -1); }

module.exports = { TZ, today, addDays, addMonths, diffDays, dueDate, status, applyPayment, initialPaidUntil };
