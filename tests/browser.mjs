import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { SITE_IDS, getSiteLayout } from "../src/sites.js";
import { VEHICLE_NAMES } from "../src/fleet.js";
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
page.setDefaultTimeout(45000);
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
const poll = (fn, timeout = 30000) => expect.poll(fn, { timeout, intervals: [100, 250, 500] });
const position = (s) => ({ x: Number(s.x), z: Number(s.z) });
const distanceFrom = (a, b) => Math.hypot(Number(a.x) - Number(b.x), Number(a.z) - Number(b.z));
async function whileKey(key, fn) {
  await page.keyboard.down(key);
  try { return await fn(); }
  finally { await page.keyboard.up(key); }
}
async function closeOpenPanel() {
  if (await page.locator("#panel").isVisible()) await page.locator("#close-panel").click();
}
async function visitSite(id) {
  await closeOpenPanel();
  await page.locator("#open-catalog").click();
  await page.locator(`button[data-site="${id}"]`).click();
  await expect(page.locator("#resume-site")).toBeVisible();
  await page.locator("#resume-site").click();
  await poll(async () => (await state()).sceneSite, 45000).toBe(id);
  await expect(page.locator("#panel")).not.toBeVisible();
  await poll(async () => Number((await state()).blockCount)).toBe(getSiteLayout(id).blocks.length);
}
async function approachVehicle(kind) {
  await closeOpenPanel();
  await page.locator("#open-fleet").click();
  await expect(page.locator("[data-approach]")).toHaveCount(8);
  await page.locator(`[data-approach="${kind}"]`).click();
  await expect(page.locator("#panel")).not.toBeVisible();
  await page.keyboard.press("e");
  await poll(async () => (await state()).driving).toBe("true");
  await poll(async () => (await state()).vehicle).toBe(kind);
}
async function brake() {
  await whileKey("Space", async () => {
    await poll(async () => Math.abs(Number((await state()).speed))).toBeLessThan(0.08);
  });
}

await mkdir("test-results", { recursive: true });
await writeFile(
  "test-results/browser-report.json",
  JSON.stringify({ status: "running", base, results: [], errors: [] }, null, 2),
);
try {
  await page.goto(base, { waitUntil: "domcontentloaded" });
  await page.locator("#start").waitFor({ timeout: 90000 });
  await check("WebGL starts the 0.4 world with one rendered identity per person", async () => {
    if (new URL(base).pathname.endsWith(".html")) {
      // The downloadable game must execute from this HTML, not redirect to a
      // missing sibling or silently test the Vite development entry instead.
      assert.equal(new URL(page.url()).pathname, new URL(base).pathname);
      await expect(page.locator("script[src]")).toHaveCount(0);
      await expect(page.locator('meta[http-equiv="refresh" i]')).toHaveCount(0);
      assert.ok(await page.locator('script[type="module"]').evaluateAll(
        scripts => scripts.reduce((length, script) => length + (script.textContent || "").length, 0),
      ) > 100000, "The standalone HTML contains the actual bundled game");
    }
    assert.ok(await page.locator("#scene").evaluate(canvas => Boolean(canvas.getContext("webgl2"))));
    await page.locator("#start").click();
    await expect(page.locator("#welcome")).toBeHidden();
    await poll(async () => (await state()).sceneSite).toBe("tomates_oeste");
    await expect(page.locator("#fps")).toContainText("FPS");
    const ids=JSON.parse((await state()).personEntities);
    assert.equal(ids.length,5); assert.equal(new Set(ids).size,5);
    assert.equal((await state()).avatarPerson,"emanuel_franco");
    assert.equal(Number((await state()).vehicleCount),8);
    await poll(async () => Number((await state()).blockCount)).toBe(getSiteLayout("tomates_oeste").blocks.length);
  });
  await check("keyboard walking moves the person and reset returns to the active farm spawn", async () => {
    const before=position(await state());
    await whileKey("w", async () => { await poll(async () => distanceFrom(await state(),before)).toBeGreaterThan(.25); });
    await page.keyboard.press("r");
    const spawn=getSiteLayout("tomates_oeste").spawn;
    await poll(async () => distanceFrom(await state(),spawn)).toBeLessThan(.05);
  });
  await check("mouse dragging rotates the third person camera", async () => {
    const before=Number((await state()).cameraYaw);
    await page.mouse.move(700,340);await page.mouse.down();
    await page.mouse.move(820,370,{steps:6});await page.mouse.up();
    await poll(async () => Math.abs(Number((await state()).cameraYaw)-before)).toBeGreaterThan(.2);
    await page.keyboard.press("r");
  });
  const stoppedVehicles={};
  for(const kind of ["technical","agropilar","biological","agricultural","truck","rigid_truck","tractor","orchard_tractor"]) {
    await check(`${VEHICLE_NAMES[kind]} can be entered, driven, braked, reversed and exited`, async () => {
      await approachVehicle(kind);
      if(kind==="technical") {
        await page.locator("#open-fleet").click();
        for(const button of await page.locator("[data-approach]").all()) await expect(button).toBeDisabled();
        await page.locator("#close-panel").click();
      }
      const before=position(await state());
      await whileKey("w",async()=>{
        await poll(async()=>distanceFrom(await state(),before)).toBeGreaterThan(.40);
        await poll(async()=>Number((await state()).speed)).toBeGreaterThan(.70);
        await page.keyboard.press("e");
        await expect(page.locator("#toast")).toContainText(/[Pp][aá]ra|imobil|trav/i);
        assert.equal((await state()).driving,"true");
      });
      await brake();
      if(kind==="truck") {
        const heading=Number((await state()).vehicleYaw);
        await page.keyboard.down("w");await page.keyboard.down("a");
        try {
          await poll(async()=>Math.abs(Number((await state()).vehicleYaw)-heading)).toBeGreaterThan(.02);
          await poll(async()=>Math.abs(Number((await state()).trailerYaw)-Number((await state()).vehicleYaw))).toBeGreaterThan(.005);
        } finally {await page.keyboard.up("a");await page.keyboard.up("w");}
        await brake();
      }
      const reverseFrom=position(await state());
      await whileKey("s",async()=>{
        await poll(async()=>Number((await state()).speed)).toBeLessThan(-.25);
        await poll(async()=>distanceFrom(await state(),reverseFrom)).toBeGreaterThan(.15);
      });
      await brake();
      stoppedVehicles[kind]=position(await state());
      if(["truck","rigid_truck","tractor","orchard_tractor"].includes(kind))
        await page.screenshot({path:`test-results/${kind}-driving.png`});
      await page.keyboard.press("e");
      await poll(async()=>(await state()).driving).toBe("false");
      assert.equal((await state()).avatarPerson,"emanuel_franco");
    });
  }
  const identitiesBeforeTravel=JSON.parse((await state()).personEntities);
  const visited=[];
  for(const id of SITE_IDS) {
    await check(`3D visit loads ${getSiteLayout(id).name} with its own photographic layout`,async()=>{
      await visitSite(id);
      const s=await state();visited.push(id);
      assert.deepEqual(JSON.parse(s.personEntities),identitiesBeforeTravel);
      assert.equal(s.avatarPerson,"emanuel_franco");assert.equal(s.driving,"false");
      assert.equal(Number(s.blockCount),getSiteLayout(id).blocks.length);
      assert.equal(Number(s.vehicleCount),8);
      if(["tomates_oeste","deusas","nutriveg_2","sede"].includes(id))
        await page.screenshot({path:`test-results/site-${id}.png`});
    });
  }
  assert.equal(new Set(visited).size,14);
  await check("travelling back preserves the parked truck rather than resetting the fleet",async()=>{
    await visitSite("tomates_oeste");await approachVehicle("truck");
    assert.ok(distanceFrom(await state(),stoppedVehicles.truck)<.10);
    await page.keyboard.press("e");await poll(async()=>(await state()).driving).toBe("false");
  });
  await check("aerial inspection pauses walking and returns to the same farm",async()=>{
    await page.locator("#aerial-toggle").click();
    await poll(async()=>(await state()).aerial).toBe("true");
    const before=position(await state());await hold(["w"],400);
    assert.equal(distanceFrom(await state(),before),0);
    await page.screenshot({path:"test-results/aerial-tomates-oeste.png"});
    await page.locator("#aerial-toggle").click();await poll(async()=>(await state()).aerial).toBe("false");
    assert.equal((await state()).sceneSite,"tomates_oeste");
  });
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
  await check("a shared character can be found and consulted physically with F",async()=>{
    await page.locator("#open-team").click();await page.locator('[data-person="nuno"]').click();
    await page.locator("#find-person").click();
    await expect(page.locator("#panel")).not.toBeVisible();
    await page.keyboard.press("f");await expect(page.locator("#panel-title")).toHaveText("Nuno");
    await page.locator("#close-panel").click();
  });
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
      await expect(page.locator(".day-goal.done")).toHaveCount(4);
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
  await check("local map describes the active layout as an approximation",async()=>{
    await page.keyboard.press("m");await expect(page.locator("#large-map")).toBeVisible();
    await expect(page.locator("#panel-body")).toContainText(/[Aa]proximad|estimad/);
    await expect(page.locator("#geographic-settings")).toBeVisible();
    await page.locator("#close-panel").click();
  });
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
      for (const id of SITE_IDS) {
        await page.locator(`[data-geo-site="${id}"]`).click();
        await expect(page.locator("#visit-geographic")).toBeVisible();
        await expect(page.locator(".aerial-reference img")).toBeVisible();
        await poll(() => page.locator(".aerial-reference img").evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
        await page.locator("#back-regional").click();
      }
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
        "Receção",
      );
      await expect(page.locator("#resume-site")).toBeVisible();
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
        status: "passed",
        base,
        visited,
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
