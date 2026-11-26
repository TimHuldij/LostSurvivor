import test from 'node:test';
import assert from 'node:assert/strict';
import { MeleeWeapon } from '../src/melee-weapon.js';

test('knife uses a timed, non-overlapping strike with one hit window', () => {
  const knife = new MeleeWeapon(true);
  assert.equal(knife.use(), false);
  knife.setEquipped(true);
  assert.equal(knife.use(), true);
  assert.equal(knife.use(), false);

  knife.update(.2, 0);
  assert.equal(knife.consumeStrike(), false);
  knife.update(.06, 0);
  assert.equal(knife.consumeStrike(), true);
  assert.equal(knife.consumeStrike(), false);
  knife.update(.31, 0);
  assert.equal(knife.using, false);

  assert.equal(knife.use(), true);
  knife.update(.26, 0);
  knife.setEquipped(false);
  assert.equal(knife.consumeStrike(), false);
});
