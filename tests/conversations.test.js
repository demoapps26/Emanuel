import test from "node:test";
import assert from "node:assert/strict";
import { initialData } from "../src/data.js";
import {
  CONVERSATIONS,
  availableConversations,
  conversationTurns,
} from "../src/conversations.js";
test("eleven scenarios and 22 approaches use existing people with shared stable identities", () => {
  const data = initialData(),
    ids = new Set(data.people.map((p) => p.id));
  assert.equal(CONVERSATIONS.length, 11);
  assert.equal(
    CONVERSATIONS.reduce((sum, c) => sum + c.choices.length, 0),
    22,
  );
  assert.equal(availableConversations(data).length, 11);
  for (const c of CONVERSATIONS) {
    assert.equal(new Set(c.participants).size, c.participants.length);
    assert.ok(c.participants.every((id) => ids.has(id)));
    for (const t of [...c.intro, ...c.choices.flatMap((o) => o.turns)]) {
      assert.ok(c.participants.includes(t.personId));
      assert.ok(t.text.length > 10);
    }
  }
});
test("roles select different conversations for support, management and equipment staff", () => {
  const data = initialData();
  assert.ok(
    availableConversations(data, { personId: "rafael" }).every((c) =>
      ["equipamentos", "construcao", "prioridades"].includes(c.id),
    ),
  );
  assert.ok(
    availableConversations(data, { personId: "hernani" }).some(
      (c) => c.id === "produtores",
    ),
  );
  assert.ok(
    availableConversations(data, { personId: "miguel" }).some(
      (c) => c.id === "produtores",
    ),
  );
  assert.ok(
    availableConversations(data, { personId: "cesar" }).some(
      (c) => c.id === "apoios_cesar",
    ),
  );
});
test("each branch produces its own transcript without changing actual farm data or people", () => {
  const data = initialData(),
    before = JSON.stringify(data),
    scenario = CONVERSATIONS.find((c) => c.id === "equipamentos");
  const first = conversationTurns(scenario, 0),
    second = conversationTurns(scenario, 1);
  assert.notDeepEqual(first, second);
  assert.deepEqual(first.slice(0, scenario.intro.length), scenario.intro);
  assert.equal(JSON.stringify(data), before);
});
