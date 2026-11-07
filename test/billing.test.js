'use strict';
const test = require('node:test');
const assert = require('node:assert');
const B = require('../lib/billing');

const settings = { graceDays: 3, reminderDays: 3 };
const mk = (paidUntil, extra) => ({ paidUntil, dueDay: 10, override: 'auto', ...extra });

test('datas: soma de meses mantém o dia de vencimento', () => {
  assert.equal(B.addMonths('2026-01-31', 1, 31), '2026-02-28');
  assert.equal(B.addMonths('2026-02-28', 1, 31), '2026-03-31');
  assert.equal(B.addMonths('2026-12-10', 1, 10), '2027-01-10');
  assert.equal(B.addDays('2026-03-31', 1), '2026-04-01');
});

test('status ao longo do mês (vence dia 10, carência 3)', () => {
  const c = mk('2026-12-09'); // vence 10/12
  assert.equal(B.status(c, settings, '2026-12-01').status, 'ok');
  assert.equal(B.status(c, settings, '2026-12-07').status, 'soon');
  assert.equal(B.status(c, settings, '2026-12-10').status, 'grace');
  assert.equal(B.status(c, settings, '2026-12-12').status, 'grace');
  assert.equal(B.status(c, settings, '2026-12-13').status, 'suspended');
  assert.equal(B.status(c, settings, '2026-12-13').suspendOn, '2026-12-13');
});

test('carência própria do cliente e status manual', () => {
  assert.equal(B.status(mk('2026-12-09', { graceDays: 0 }), settings, '2026-12-10').status, 'suspended');
  assert.equal(B.status(mk('2026-12-09', { override: 'active' }), settings, '2027-03-01').status, 'ok');
  assert.equal(B.status(mk('2027-12-09', { override: 'suspended' }), settings, '2026-12-01').status, 'suspended');
  assert.equal(B.status(mk('2026-12-09', { override: 'paused' }), settings, '2027-03-01').status, 'paused');
});

test('pagamento empurra o vencimento', () => {
  const c = mk('2026-12-09');
  assert.deepEqual(B.applyPayment(c, 1, 10), { from: '2026-12-10', to: '2027-01-09' });
  assert.deepEqual(B.applyPayment(c, 12, 10), { from: '2026-12-10', to: '2027-12-09' });
  // pagando atrasado (suspenso), volta a ficar em dia na hora
  c.paidUntil = B.applyPayment(c, 1, 10).to;
  assert.equal(B.status(c, settings, '2026-12-14').status, 'ok');
});
