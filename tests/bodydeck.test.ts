import { test } from "node:test";
import assert from "node:assert/strict";
import { absorb, coilHeld, createBody, drawCards, eatTarget, might, scarsFor, type BodyCard } from "../src/bodydeck/BodyDeck.ts";

const rng = { next: () => 0.42 };
const card = (uid: number, coil = 0): BodyCard => ({ uid, id: "card.fang", coil, up: false, held: 0, bound: false, guarded: false, deckIndex: uid });
const body = () => createBody({ maxHand: 7, coilCap: 3, bigAt: 9, heavyAt: 12, drawPerTurn: 3 });

test("draw never passes max hand and reshuffles the discard pile", () => {
  const b = body();
  b.draw = [card(1), card(2)];
  b.discard = [card(3), card(4), card(5), card(6), card(7), card(8)];
  drawCards(b, 10, rng);
  assert.equal(b.hand.length, 7);
  assert.equal(b.draw.length + b.discard.length, 1);
});

test("might is the hand size", () => {
  const b = body();
  b.hand = [card(1), card(2), card(3)];
  assert.equal(might(b), 3);
  b.trueSize = true;
  assert.equal(might(b), 7);
});

test("held cards coil up to the cap; binds clear at end of turn", () => {
  const b = body();
  b.hand = [card(1, 2), card(2, 3)];
  b.hand[0]!.bound = true;
  const maxed = coilHeld(b);
  assert.deepEqual(b.hand.map((c) => c.coil), [3, 3]);
  assert.equal(maxed.length, 1);
  assert.equal(b.hand[0]!.bound, false);
});

test("eat takes the highest coil and skips guarded cards", () => {
  const b = body();
  b.hand = [card(1, 1), card(2, 3), card(3, 2)];
  assert.equal(eatTarget(b)!.uid, 2);
  b.hand[1]!.guarded = true;
  assert.equal(eatTarget(b)!.uid, 3);
});

test("block soaks wounds first", () => {
  const b = body();
  b.block = 2;
  assert.deepEqual(absorb(b, 3), { landed: 1, blocked: 2 });
  assert.equal(b.block, 0);
});

test("scars: one per card short of four", () => {
  assert.equal(scarsFor(1, 4), 3);
  assert.equal(scarsFor(4, 4), 0);
  assert.equal(scarsFor(9, 4), 0);
});
