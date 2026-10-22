import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:5173";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox", "--enable-unsafe-swiftshader"],
});
const page = await browser.newPage({
  viewport: { width: 1280, height: 800 },
  acceptDownloads: true,
});
const googleRequests = [];
page.on("request", (req) => {
  if (/googleapis\.com|gstatic\.com/.test(new URL(req.url()).hostname))
    googleRequests.push(req.url());
});
const errors = [],
  results = [];
page.on("pageerror", (error) => errors.push(error.message));
const state = () => page.locator("#hud").evaluate((el) => ({ ...el.dataset }));
async function check(name, fn) {
  await fn();
  results.push({ name, passed: true });
  console.log("PASS", name);
  await writeFile(
    "test-results/browser-report.json",
    JSON.stringify({ status: "running", base, results, errors }, null, 2),
  );
}
async function hold(keys, ms) {
  for (const key of keys) await page.keyboard.down(key);
  await page.waitForTimeout(ms);
  for (const key of keys) await page.keyboard.up(key);
  await page.waitForTimeout(150);
}
await mkdir("test-results", { recursive: true });
await writeFile(
  "test-results/browser-report.json",
  JSON.stringify({ status: "running", base, results: [], errors: [] }, null, 2),
);
try {
  await page.goto(base);
  await page.locator("#start").waitFor();
  await check("WebGL renders a scene and the start screen works", async () => {
    const hasGL = await page
      .locator("#scene")
      .evaluate((c) => Boolean(c.getContext("webgl2")));
    assert.ok(hasGL);
    await page.locator("#start").click();
    await expect(page.locator("#welcome")).toBeHidden();
    await expect(page.locator("#fps")).toContainText("FPS");
  });
  await check(
    "keyboard movement and reset affect the rendered avatar",
    async () => {
      const before = await state();
      await hold(["w"], 800);
      const after = await state();
      assert.ok(Number(after.z) < Number(before.z) - 2);
      await page.keyboard.press("r");
      await expect.poll(async () => Number((await state()).z)).toBe(82);
    },
  );
  await check("mouse drag rotates the camera", async () => {
    const before = Number((await state()).cameraYaw);
    await page.mouse.move(700, 340);
    await page.mouse.down();
    await page.mouse.move(820, 370, { steps: 6 });
    await page.mouse.up();
    await expect
      .poll(async () => Math.abs(Number((await state()).cameraYaw) - before))
      .toBeGreaterThan(0.2);
    await page.keyboard.press("r");
  });
  await check("enter, drive, brake and exit the simulated car", async () => {
    await page.keyboard.press("e");
    await expect.poll(async () => (await state()).driving).toBe("true");
    const before = await state();
    await page.keyboard.down("w");
    await page.waitForTimeout(1200);
    assert.ok(Number((await state()).z) < Number(before.z) - 3);
    await page.keyboard.press("e");
    assert.equal((await state()).driving, "true");
    await page.keyboard.up("w");
    await hold(["Space"], 1000);
    await page.keyboard.press("e");
    await expect.poll(async () => (await state()).driving).toBe("false");
    await page.keyboard.press("r");
  });
  await check(
    "Agropilar van can be approached, entered and driven",
    async () => {
      await hold(["Shift", "d"], 3600);
      await page.keyboard.press("e");
      await expect.poll(async () => (await state()).vehicle).toBe("agropilar");
      await expect.poll(async () => (await state()).driving).toBe("true");
      const before = Number((await state()).x);
      await hold(["w"], 1000);
      assert.ok(Number((await state()).x) > before + 2);
      await hold(["Space"], 1000);
      await page.screenshot({ path: "test-results/agropilar.png" });
      await page.keyboard.press("e");
      await expect.poll(async () => (await state()).driving).toBe("false");
      await page.keyboard.press("r");
    },
  );
  for (const [kind, name, targetX] of [
    ["biological", "controlo biológico", 88],
    ["agricultural", "técnico agrícola", 111],
  ]) {
    await check(
      `Carrinha de ${name} can be reached, driven and exited`,
      async () => {
        await page.keyboard.down("Shift");
        await page.keyboard.down("s");
        try {
          await expect
            .poll(async () => Number((await state()).z), {
              timeout: 18000,
              intervals: [75],
            })
            .toBeGreaterThan(131);
        } finally {
          await page.keyboard.up("s");
          await page.keyboard.up("Shift");
        } // Walk behind the parked row.
        // Walk for lateral alignment; running can overshoot an adjacent van on software renderers.
        await page.keyboard.down("d");
        try {
          await expect
            .poll(async () => Number((await state()).x), {
              timeout: 30000,
              intervals: [75],
            })
            .toBeGreaterThan(targetX - 5);
        } finally {
          await page.keyboard.up("d");
          await page.keyboard.up("Shift");
        }
        await page.keyboard.down("w");
        try {
          await expect
            .poll(async () => Number((await state()).z), {
              timeout: 10000,
              intervals: [75],
            })
            .toBeLessThan(124);
        } finally {
          await page.keyboard.up("w");
        }
        await page.keyboard.press("e");
        await expect.poll(async () => (await state()).vehicle).toBe(kind);
        await expect.poll(async () => (await state()).driving).toBe("true");
        const before = Number((await state()).x);
        await hold(["w"], 800);
        assert.ok(Number((await state()).x) > before + 1);
        await hold(["Space"], 1000);
        await page.screenshot({ path: `test-results/${kind}.png` });
        await page.mouse.move(670, 350);
        await page.mouse.down();
        await page.mouse.move(890, 390, { steps: 6 });
        await page.mouse.up();
        await page.screenshot({ path: `test-results/${kind}-side.png` });
        await page.keyboard.press("e");
        await expect.poll(async () => (await state()).driving).toBe("false");
        await page.keyboard.press("r");
      },
    );
  }
  await check(
    "each shared person has one entity and one profile across all their farms",
    async () => {
      const ids = JSON.parse((await state()).personEntities);
      assert.equal(new Set(ids).size, 5);
      for (const id of [
        "emanuel_franco",
        "nuno",
        "hernani",
        "miguel",
        "rafael",
      ])
        assert.equal(ids.filter((x) => x === id).length, 1);
      await page.locator("#open-team").click();
      await expect(page.locator('[data-person="nuno"]')).toHaveCount(1);
      await page.locator('[data-person="nuno"]').click();
      await expect(page.locator("[data-person-site]")).toHaveCount(13);
      await page.locator("#back-team").click();
      await page.locator('[data-person="hernani"]').click();
      await expect(page.locator("#panel-body")).toContainText("Vale da Borra");
      await expect(page.locator("#panel-body")).toContainText("externos");
      await expect(
        page.locator('[data-person-site="greenaura"]'),
      ).toBeVisible();
      await page.locator("#back-team").click();
      await page.locator('[data-person="miguel"]').click();
      await expect(page.locator("#panel-body")).toContainText("Hernani");
      await page.locator("#back-team").click();
      await page.locator('[data-person="rafael"]').click();
      await expect(page.locator("#panel-body")).toContainText("Manitou");
      await expect(page.locator("#panel-body")).toContainText(
        "mini giratórias",
      );
      await page.locator("#back-team").click();
      await page.locator('[data-person="cesar"]').click();
      await expect(page.locator("[data-person-site]")).toHaveCount(4);
      for (const id of ["framboesa_2", "lagoa", "varzea", "fenomeno"])
        await expect(page.locator(`[data-person-site="${id}"]`)).toBeVisible();
      await page.locator("#back-team").click();
      await page.locator('[data-person="emanuel_franco"]').click();
      await expect(page.locator("[data-person-site]")).toHaveCount(4);
      await expect(page.locator("#panel-title")).toHaveText("Emanuel Franco");
      await page.screenshot({ path: "test-results/emanuel-profile.png" });
      await page.locator("#close-panel").click();
      assert.deepEqual(JSON.parse((await state()).personEntities), ids);
    },
  );
  await check(
    "a named character can be approached and consulted with F",
    async () => {
      await expect(page.locator("#scene")).toBeFocused();
      await page.keyboard.down("Shift");
      await page.keyboard.down("d");
      try {
        await expect
          .poll(async () => Number((await state()).x), {
            timeout: 12000,
            intervals: [75],
          })
          .toBeGreaterThan(19);
      } finally {
        await page.keyboard.up("d");
        await page.keyboard.up("Shift");
      }
      await page.keyboard.down("Shift");
      await page.keyboard.down("s");
      try {
        await expect
          .poll(async () => Number((await state()).z), {
            timeout: 12000,
            intervals: [75],
          })
          .toBeGreaterThan(95);
      } finally {
        await page.keyboard.up("s");
        await page.keyboard.up("Shift");
      }
      await page.keyboard.press("f");
      await expect(page.locator("#panel-title")).toHaveText("Nuno");
      await page.locator("#close-panel").click();
      await page.keyboard.press("r");
    },
  );
  await check(
    "technical conversations show role-specific participants and distinct simulated outcomes",
    async () => {
      await page.locator("#open-talk").click();
      await expect(page.locator("[data-conversation]")).toHaveCount(11);
      await page.locator('[data-conversation="equipamentos"]').click();
      await expect(page.locator(".conversation-transcript")).toContainText(
        "Manitou",
      );
      await expect(page.locator('[data-speaker="rafael"]')).toHaveCount(1);
      const before = await page.evaluate(() =>
        localStorage.getItem("pp-mundo3d-v1"),
      );
      await page.locator('[data-dialogue-choice="1"]').click();
      await expect(page.locator("#conversation-outcome")).toContainText(
        "construção",
      );
      await expect(page.locator("#conversation-outcome")).toContainText(
        "Nenhuma tarefa real",
      );
      assert.equal(
        await page.evaluate(() => localStorage.getItem("pp-mundo3d-v1")),
        before,
      );
      await page.locator("#restart-conversation").click();
      await page.locator('[data-dialogue-choice="0"]').click();
      await expect(page.locator("#conversation-outcome")).toContainText(
        "disponibilidade",
      );
      const downloadPromise = page.waitForEvent("download");
      await page.locator("#export-conversation").click();
      const download = await downloadPromise;
      const stream = await download.createReadStream();
      const chunks = [];
      for await (const c of stream) chunks.push(c);
      assert.match(Buffer.concat(chunks).toString(), /CONVERSA SIMULADA/);
      await page.screenshot({ path: "test-results/conversation.png" });
      await page.locator("#close-panel").click();
    },
  );
  await check(
    "person profiles filter conversations to their actual participants",
    async () => {
      await page.locator("#open-team").click();
      await page.locator('[data-person="miguel"]').click();
      await page.locator("#talk-person").click();
      await expect(page.locator("[data-conversation]")).toHaveCount(1);
      await page.locator('[data-conversation="produtores"]').click();
      await expect(page.locator(".conversation-transcript")).toContainText(
        "Hernani",
      );
      await expect(page.locator(".conversation-transcript")).toContainText(
        "Miguel",
      );
      await page.locator("#close-panel").click();
    },
  );
  await check(
    "day-of-field goals reflect conversations, team consultation and driving",
    async () => {
      await page.locator("#open-day").click();
      await expect(page.locator(".day-goal.done")).toHaveCount(3);
      await page.locator("#day-resume").click();
    },
  );
  await check("pause freezes movement and resume restores it", async () => {
    await page.keyboard.press("Escape");
    await expect(page.locator("#panel")).toBeVisible();
    const before = await state();
    await hold(["w"], 400);
    assert.equal((await state()).z, before.z);
    await page.locator("#resume").click();
    await expect(page.locator("#panel")).not.toBeVisible();
  });
  await check(
    "general map has the explicit local fallback and no geographic claims",
    async () => {
      await page.keyboard.press("m");
      await expect(page.locator("#large-map")).toBeVisible();
      await expect(page.locator("#panel-body")).toContainText(
        "Distâncias comprimidas",
      );
      await page.locator("#panel-body summary").click();
      await expect(page.locator("#map-status")).toContainText(
        "Nenhum serviço Google",
      );
      await page.locator("#close-panel").click();
    },
  );
  await check(
    "real regional map uses supplied locations and Google stays disabled without a key",
    async () => {
      await page.keyboard.press("m");
      await page.locator("#geographic-settings").click();
      await expect(page.locator("#google-requirements")).toContainText(
        "chave de navegador",
      );
      await expect(page.locator("#open-google")).toBeDisabled();
      await expect(page.locator("#panel-body")).toContainText("14 de 14");
      await expect(page.locator("[data-location]")).toHaveCount(13);
      await page.locator('[data-fit="all"]').click();
      await expect(page.locator("[data-location]")).toHaveCount(14);
      await page.locator('[data-geo-site="tomates_oeste"]').click();
      await expect(page.locator(".aerial-reference img")).toBeVisible();
      await page.locator("#edit-point").click();
      await page.locator('[name="confirmed"]').uncheck();
      await page.locator('[name="lat"]').fill("0");
      await page.locator('[name="lng"]').fill("0");
      await page.getByRole("button", { name: "Guardar coordenadas" }).click();
      await expect(page.locator("#panel-body")).toContainText("13 de 14");
      await expect(
        page.locator('[data-geo-site="tomates_oeste"]'),
      ).toContainText("por confirmar");
      assert.equal(googleRequests.length, 0);
      await page.locator("#close-panel").click();
    },
  );
  await check(
    "catalog lists 13 farms and HQ with project areas separated",
    async () => {
      await page.locator("#open-catalog").click();
      await expect(page.locator(".site-row[data-site]")).toHaveCount(14);
      await expect(page.locator(".catalog-summary")).toContainText("129,23");
      await page.locator('button[data-site="deusas"]').click();
      await expect(page.locator("#site-detail")).toContainText(
        "4 ha quase concluídos",
      );
      await expect(page.locator("#site-detail")).toContainText(
        "não representa área em produção",
      );
      await page.locator('button[data-site="sede"]').click();
      await expect(page.locator("#site-detail")).toContainText(
        "não tem cenário",
      );
    },
  );
  await check(
    "editing, cultivation dates and shared people save without moving the character",
    async () => {
      await page.locator('button[data-site="tomates_oeste"]').click();
      await page.locator("#edit-site").click();
      const before = await state();
      await page.locator('[name="culturas"]').fill("Tomate, Pepino, Courgete");
      await page.locator('[name="area"]').fill("16.25");
      await page.locator('[name="culturaPeriodo"]').fill("Pepino");
      await page.locator('[name="inicio"]').fill("2026-10-22");
      await page.locator('[name="setor"]').fill("Setor A");
      await page.locator('[name="novaPessoa"]').fill("César");
      await page.locator('[name="funcao"]').fill("Apoio técnico");
      assert.equal((await state()).z, before.z);
      await page.getByRole("button", { name: "Guardar alterações" }).click();
      await expect(page.locator("#site-detail")).toContainText("16,25 ha");
      await expect(page.locator(".periods")).toContainText("Setor A");
      await expect(page.locator(".team")).toContainText("César");
    },
  );
  await check(
    "existing cultivation periods can be closed without losing history",
    async () => {
      await page.locator("#edit-site").click();
      await page.locator('[name="pf_0"]').fill("2026-12-31");
      await page.getByRole("button", { name: "Guardar alterações" }).click();
      await expect(page.locator(".periods")).toContainText("2026-12-31");
    },
  );
  await check(
    "saved edits recover after reloading the application",
    async () => {
      await page.reload();
      await page.locator("#start").click();
      await page.locator("#open-catalog").click();
      await page.locator('button[data-site="tomates_oeste"]').click();
      await expect(page.locator("#site-detail")).toContainText("16,25 ha");
      await expect(page.locator(".periods")).toContainText("2026-10-22");
    },
  );
  await check(
    "typing the name of an existing person adds an association without a duplicate identity",
    async () => {
      const counts = await page.evaluate(() => {
        const d = JSON.parse(localStorage.getItem("pp-mundo3d-v1"));
        return d.people.filter((p) => p.name === "César").length;
      });
      assert.equal(counts, 1);
    },
  );
  let exported;
  await check(
    "export produces valid data and bad imports preserve edits",
    async () => {
      const downloadPromise = page.waitForEvent("download");
      await page.locator("#export-data").click();
      const download = await downloadPromise;
      await download.saveAs("test-results/export.json");
      const stream = await download.createReadStream();
      const chunks = [];
      for await (const c of stream) chunks.push(c);
      exported = JSON.parse(Buffer.concat(chunks).toString());
      assert.equal(exported.exploracoes[0].area_ha, 16.25);
      assert.equal(exported.exploracoes[0].periodos.length, 1);
      await page.locator("#import-data").setInputFiles({
        name: "invalid.json",
        mimeType: "application/json",
        buffer: Buffer.from('{"schemaVersion":1}'),
      });
      await expect(page.locator("#toast")).toContainText("Importação recusada");
      await expect(page.locator("#site-detail")).toContainText("16,25 ha");
    },
  );
  await check(
    "valid import requires confirmation and restores the supplied copy",
    async () => {
      exported.exploracoes[0].area_ha = 16.5;
      await page.locator("#import-data").setInputFiles({
        name: "valid.json",
        mimeType: "application/json",
        buffer: Buffer.from(JSON.stringify(exported)),
      });
      await expect(page.locator("#confirm-import")).toBeVisible();
      const localBefore = await page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("pp-mundo3d-v1")).exploracoes[0]
            .area_ha,
      );
      assert.equal(localBefore, 16.25);
      await page.locator("#confirm-import").click();
      await expect(page.locator("#site-detail")).toContainText("16,5 ha");
    },
  );
  await check(
    "graphics settings can be changed and the game resumes",
    async () => {
      await page.locator("#close-panel").click();
      await page.locator("#help").click();
      await page.locator("#quality").selectOption("medium");
      await page.locator("#quality").selectOption("low");
      await page.locator("#resume").click();
      await page.keyboard.press("r");
      await page.waitForTimeout(1000);
      await page.screenshot({ path: "test-results/game.png" });
    },
  );
  await check(
    "small viewport keeps the catalog and controls accessible",
    async () => {
      await page.setViewportSize({ width: 680, height: 740 });
      await page.locator("#open-catalog").click();
      await expect(page.locator("#close-panel")).toBeInViewport();
      await page.screenshot({ path: "test-results/catalog-small.png" });
      await page.locator("#close-panel").click();
    },
  );
  assert.deepEqual(errors, [], "No browser runtime errors");
  assert.equal(
    googleRequests.length,
    0,
    "No Google API requests during local-mode tests",
  );
  const performance = await page.locator("#fps").textContent();
  console.log("MEASURED", performance);
  await writeFile(
    "test-results/browser-report.json",
    JSON.stringify(
      {
        results,
        performance,
        renderer: "Chromium headless / SwiftShader software rendering",
        errors,
      },
      null,
      2,
    ),
  );
  console.log(`${results.length} browser checks passed`);
} catch (error) {
  await writeFile(
    "test-results/browser-failure.json",
    JSON.stringify({ base, error: error.message, results, errors }, null, 2),
  );
  console.log("BROWSER_ERRORS", errors);
  if (await page.locator("#hud").count())
    console.log("FAILED_STATE", await state());
  await page.screenshot({ path: "test-results/failure.png" });
  throw error;
} finally {
  await browser.close();
}
