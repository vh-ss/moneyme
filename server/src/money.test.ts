import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeFee, computeToAmount, calcTransfer, round2 } from './money.ts';

test('computeFee: percent', () => {
  assert.equal(computeFee(1000, 'PERCENT', 2), 20);
  assert.equal(computeFee(150, 'PERCENT', 1.5), 2.25);
});

test('computeFee: fixed', () => {
  assert.equal(computeFee(1000, 'FIXED', 15), 15);
  assert.equal(computeFee(1000, 'FIXED', -5), 0);
});

test('computeFee: none', () => {
  assert.equal(computeFee(1000, 'NONE', 99), 0);
});

test('computeToAmount: same currency (rate 1)', () => {
  assert.equal(computeToAmount(500, 1), 500);
  assert.equal(computeToAmount(500, 0), 500); // невалідний курс → 1
});

test('computeToAmount: conversion', () => {
  assert.equal(computeToAmount(100, 41.5), 4150);
});

test('calcTransfer: percent fee, same currency', () => {
  const r = calcTransfer({ amount: 1000, feeType: 'PERCENT', feeValue: 2, exchangeRate: 1 });
  assert.equal(r.feeAmount, 20);
  assert.equal(r.debit, 1020);
  assert.equal(r.toAmount, 1000);
});

test('calcTransfer: fixed fee, cross currency', () => {
  const r = calcTransfer({ amount: 100, feeType: 'FIXED', feeValue: 5, exchangeRate: 41.5 });
  assert.equal(r.feeAmount, 5);
  assert.equal(r.debit, 105);
  assert.equal(r.toAmount, 4150);
});

test('round2', () => {
  assert.equal(round2(2.005), 2.01);
  assert.equal(round2(1.004), 1);
});
