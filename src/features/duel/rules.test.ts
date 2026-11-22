import assert from 'node:assert/strict';
import test from 'node:test';

import { beats, chargeTotal, getElement, matchWinner, resolveRound, resolvePowerRound } from './rules.ts';
import type { DuelCard, RoundResult } from './types.ts';

const card = (rarity: DuelCard['rarity'], element: DuelCard['element']): DuelCard => ({
  stationId: 'KEN',
  seed: 42,
  rarity,
  element,
});

test('getElement derives storm from weather', () => {
  assert.equal(getElement({ stationId: 'KEN', seed: 42, rarity: 'C', weather: 'rain' } as DuelCard), 'storm');
});

test('getElement derives moon from dusk or night', () => {
  assert.equal(getElement({ stationId: 'KEN', seed: 42, rarity: 'C', time: 'night' } as DuelCard), 'moon');
  assert.equal(getElement({ stationId: 'KEN', seed: 42, rarity: 'C', time: 'dusk' } as DuelCard), 'moon');
});

test('getElement defaults to sun', () => {
  assert.equal(getElement(card('C', 'sun')), 'sun');
});

test('sun beats storm', () => {
  assert.equal(resolveRound(card('C', 'sun'), card('C', 'storm')).winner, 'a');
});

test('storm beats moon', () => {
  assert.equal(resolveRound(card('C', 'storm'), card('C', 'moon')).winner, 'a');
});

test('moon beats sun', () => {
  assert.equal(resolveRound(card('C', 'moon'), card('C', 'sun')).winner, 'a');
});

test('same element uses higher rarity', () => {
  assert.equal(resolveRound(card('L', 'sun'), card('E', 'sun')).winner, 'a');
  assert.equal(resolveRound(card('C', 'moon'), card('R', 'moon')).winner, 'b');
});

test('same element and rarity is a draw', () => {
  assert.equal(resolveRound(card('R', 'storm'), card('R', 'storm')).winner, 'draw');
});

test('matchWinner requires two round wins', () => {
  const winA = (round: number): RoundResult => ({ ...resolveRound(card('L', 'sun'), card('C', 'storm'), 'test', round), winner: 'a' });
  assert.equal(matchWinner([winA(1)]), null);
  assert.equal(matchWinner([winA(1), winA(2)]), 'a');
});

test('matchWinner supports sudden death', () => {
  const winA = (round: number): RoundResult => ({ ...resolveRound(card('L', 'sun'), card('C', 'storm'), 'test', round), winner: 'a' });
  const winB = (round: number): RoundResult => ({ ...resolveRound(card('L', 'sun'), card('C', 'storm'), 'test', round), winner: 'b' });
  assert.equal(matchWinner([winA(1), winB(2), { ...winA(3), winner: 'draw' }]), null);
  assert.equal(matchWinner([winA(1), winB(2), { ...winA(3), winner: 'draw' }, winB(4)]), 'b');
});

test('charge total adds power, element advantage and rarity', () => {
  const sun = card('E', 'sun');
  assert.equal(beats('sun', 'storm'), true);
  assert.equal(chargeTotal({ ...sun, power: 70 }), 80);
  assert.equal(resolvePowerRound({ ...sun, power: 70 }, card('C', 'storm'), 'test', 1).aTotal, 105);
});

test('equal charge totals are draws', () => {
  const a = { ...card('C', 'sun'), power: 50 };
  const b = { ...card('C', 'sun'), power: 50 };
  assert.equal(resolvePowerRound(a, b, 'test', 1).winner, 'draw');
});
