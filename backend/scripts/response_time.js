"use strict";

require("dotenv").config();
const fs = require("fs");
const jwt = require("jsonwebtoken");
const mqtt = require("mqtt");

const SAMPLE_TIMEOUT_MS = 30000;
const DASHBOARD_TIMEOUT_MS = 10000;
const DB_POLL_MS = 50;
const PAGE_POLL_MS = 30;
const SAMPLE_GAP_MS = 1000;
const GATE_KEYS = /moisture_window|water_decision|ph_decision|emergency/;

const POINTS = {
  normal: [[6.2, 26]],
  kategori: [
    [6.2, 26],
    [4.5, 26],
    [8.2, 26],
    [6.2, 14],
    [6.2, 40],
    [4.5, 14],
    [8.2, 40],
  ],
  emergency: [[6.2, 10]],
};

const BROWSER_HOOK = `
(() => {
  const originalFetch = window.fetch;
  window.__t = {};
  window.fetch = async (...args) => {
    const response = await originalFetch(...args);
    if (String(args[0]?.url ?? args[0]).includes("/recommendation")) {
      response
        .clone()
        .json()
        .then((json) => {
          const ph = json?.data?.phValue;
          if (ph == null || window.__t[ph]) return;
          requestAnimationFrame(() =>
            requestAnimationFrame(() => {
              window.__t[ph] = { t4: Date.now() };
            }),
          );
        })
        .catch(() => {});
    }
    return response;
  };
})();
`;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function stats(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  if (!n) return null;
  const mean = sorted.reduce((a, b) => a + b, 0) / n;
  const sd = Math.sqrt(sorted.reduce((a, b) => a + (b - mean) ** 2, 0) / n);
  const percentile = (p) => sorted[Math.min(n - 1, Math.ceil(p * n) - 1)];
  return {
    n,
    min: sorted[0],
    mean,
    median: percentile(0.5),
    p95: percentile(0.95),
    max: sorted[n - 1],
    sd,
  };
}

function parseArgs() {
  const arg = (name, fallback) => {
    const i = process.argv.indexOf(`--${name}`);
    return i > -1 ? process.argv[i + 1] : fallback;
  };
  const args = {
    deviceCode: arg("device"),
    scenario: arg("scenario", "normal"),
    runs: Number(arg("runs", 30)),
  };
  if (!args.deviceCode || !POINTS[args.scenario]) {
    throw new Error(
      "Pakai: --device <deviceCode> --scenario normal|kategori|emergency [--runs 30]",
    );
  }
  return args;
}

function brokerUrl() {
  const host = process.env.MQTT_BROKER_URL || "localhost";
  const port = process.env.MQTT_PORT || "1883";
  if (/^mqtts?:\/\//.test(host)) return host;
  return `${port === "8883" ? "mqtts" : "mqtt"}://${host.split(":")[0]}:${port}`;
}

async function connectMqtt() {
  const client = mqtt.connect(brokerUrl(), {
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD,
    rejectUnauthorized: false,
  });
  await new Promise((resolve, reject) =>
    client.once("connect", resolve).once("error", reject),
  );
  return client;
}

async function listenSse(url, headers, waiters) {
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`SSE gagal: HTTP ${response.status}`);
  (async () => {
    let buffer = "";
    for await (const chunk of response.body) {
      buffer += Buffer.from(chunk).toString();
      let end;
      while ((end = buffer.indexOf("\n\n")) > -1) {
        const frame = buffer.slice(0, end).replace(/^data: /, "");
        buffer = buffer.slice(end + 2);
        try {
          waiters.get(JSON.parse(frame).ph)?.(performance.now());
        } catch {
          continue;
        }
      }
    }
  })().catch(() => {});
}

async function openDashboard(frontendUrl, email, password) {
  const browser = await require("playwright").chromium.launch();
  const page = await browser.newPage();
  await page.addInitScript(BROWSER_HOOK);
  await page.goto(`${frontendUrl}/login`);
  await page.fill("#login-email", email);
  await page.fill("#login-password", password);
  const streamOpened = page.waitForRequest(/\/api\/sensors\/.+\/stream/, {
    timeout: SAMPLE_TIMEOUT_MS,
  });
  await page.click("#btn-login-email");
  await streamOpened;
  await sleep(2000);
  return { browser, page };
}

async function resetGate(redis, deviceCode, moisture) {
  const keys = await redis.keys(`sensor:*${deviceCode}*`);
  const gate = keys.filter((key) => GATE_KEYS.test(key));
  if (gate.length) await redis.del(...gate);
  await redis.lpush(
    `sensor:moisture_window:${deviceCode}`,
    `${Date.now()}:${moisture}`,
  );
}

async function waitFor(read, timeoutMs, intervalMs) {
  const deadline = Date.now() + timeoutMs;
  let value = await read();
  while (!value && Date.now() < deadline) {
    await sleep(intervalMs);
    value = await read();
  }
  return value;
}

async function measureSample(ctx, index, runTag) {
  const { prisma, redis, mqttClient, device, auth, apiUrl, page, waiters } =
    ctx;
  const [basePh, moisture] = ctx.points[index % ctx.points.length];
  const ph = Number((basePh + (runTag * 100 + index + 1) * 1e-8).toFixed(8));
  const row = { run: index + 1, ph, moisture, ok: false };

  await resetGate(redis, device.deviceCode, moisture);

  const sensorEvent = new Promise((resolve) => waiters.set(ph, resolve));
  const t0 = performance.now();
  const t0Wall = Date.now();
  mqttClient.publish(
    `suburin/devices/${device.deviceCode}/telemetry`,
    JSON.stringify({ ph, soil_vwc_pct: moisture }),
    { qos: 1 },
  );

  const t1 = await Promise.race([
    sensorEvent,
    sleep(SAMPLE_TIMEOUT_MS).then(() => null),
  ]);
  waiters.delete(ph);
  if (t1 === null) return row;
  row.t1 = t1 - t0;

  const log = await waitFor(
    () =>
      prisma.recommendationLog.findFirst({
        where: { deviceId: device.id, phValue: ph },
        select: { categoryCode: true },
      }),
    SAMPLE_TIMEOUT_MS - row.t1,
    DB_POLL_MS,
  );
  if (!log) return row;
  row.t2 = performance.now() - t0;

  await (
    await fetch(`${apiUrl}/api/devices/${device.id}/recommendation`, {
      headers: auth,
    })
  ).text();
  row.t3 = performance.now() - t0;
  row.category = log.categoryCode;
  row.ok = true;

  if (page) {
    const shown = await waitFor(
      () => page.evaluate((key) => globalThis.__t[key], ph),
      DASHBOARD_TIMEOUT_MS,
      PAGE_POLL_MS,
    );
    if (shown) row.t4 = shown.t4 - t0Wall;
  }
  return row;
}

function describe(row) {
  if (!row.ok) return `#${row.run} GAGAL`;
  const t4 = row.t4 === undefined ? "tak tampil" : Math.round(row.t4);
  return `#${row.run} ok T1=${Math.round(row.t1)} T2=${Math.round(row.t2)} T3=${Math.round(row.t3)} T4=${t4} ms ${row.category}`;
}

function segments(samples, withDashboard) {
  const ok = samples.filter((s) => s.ok);
  const result = {
    "Broker -> Backend (T0->T1)": ok.map((s) => s.t1),
    "Fuzzy + simpan DB (T1->T2)": ok.map((s) => s.t2 - s.t1),
    "API rekomendasi (T2->T3)": ok.map((s) => s.t3 - s.t2),
  };
  if (withDashboard) {
    result["Dashboard tampil (T0->T4, hanya yang tampil)"] = ok
      .filter((s) => s.t4 !== undefined)
      .map((s) => s.t4);
  } else {
    result["End-to-end sampai API (T0->T3)"] = ok.map((s) => s.t3);
  }
  return result;
}

function printReport(scenario, samples, withDashboard) {
  const ok = samples.filter((s) => s.ok);
  if (withDashboard) {
    const shown = ok.filter((s) => s.t4 !== undefined).length;
    console.log(`Tampil otomatis di dashboard: ${shown}/${ok.length}`);
  }
  console.log(
    `\nSkenario: ${scenario} | n=${ok.length}/${samples.length} | gagal=${samples.length - ok.length}`,
  );
  console.log(
    "| Segmen | Min | Mean | Median | P95 | Max | SD |\n|---|---|---|---|---|---|---|",
  );
  for (const [name, values] of Object.entries(
    segments(samples, withDashboard),
  )) {
    const s = stats(values);
    if (!s) continue;
    const [min, mean, median, p95, max, sd] = [
      s.min,
      s.mean,
      s.median,
      s.p95,
      s.max,
      s.sd,
    ].map(Math.round);
    console.log(
      `| ${name} | ${min} | ${mean} | ${median} | ${p95} | ${max} | ${sd} |`,
    );
  }
}

function writeCsv(scenario, samples) {
  const file = `response_time_${scenario}_${Date.now()}.csv`;
  const header = "run,ph,moisture,ok,t1_ms,t2_ms,t3_ms,t4_ms,category";
  const lines = samples.map((s) =>
    [s.run, s.ph, s.moisture, s.ok, s.t1, s.t2, s.t3, s.t4, s.category]
      .map((value) => value ?? "")
      .join(","),
  );
  fs.writeFileSync(file, [header, ...lines].join("\n"));
  console.log(`CSV: ${file}`);
}

async function main() {
  const { deviceCode, scenario, runs } = parseArgs();
  const apiUrl = process.env.API_URL || "http://localhost:3000";

  const prisma = require("../src/database/connections/prisma_client");
  const redis = require("../src/database/connections/redis").getRedisClient();
  const device = await prisma.device.findUnique({ where: { deviceCode } });
  if (!device) throw new Error(`Device ${deviceCode} tidak ada di database.`);
  const auth = {
    Authorization: `Bearer ${jwt.sign({ id: device.userId }, process.env.JWT_SECRET)}`,
  };

  const mqttClient = await connectMqtt();
  const waiters = new Map();
  await listenSse(`${apiUrl}/api/sensors/${device.id}/stream`, auth, waiters);

  const { TEST_EMAIL, TEST_PASSWORD, FRONTEND_URL } = process.env;
  const dashboard =
    TEST_EMAIL && TEST_PASSWORD
      ? await openDashboard(
          FRONTEND_URL || "http://localhost:3001",
          TEST_EMAIL,
          TEST_PASSWORD,
        )
      : null;

  const ctx = {
    prisma,
    redis,
    mqttClient,
    device,
    auth,
    apiUrl,
    waiters,
    page: dashboard?.page,
    points: POINTS[scenario],
  };
  const runTag = Math.floor(Date.now() / 1000) % 10000;
  const samples = [];
  for (let i = 0; i < runs; i++) {
    const row = await measureSample(ctx, i, runTag);
    samples.push(row);
    console.log(describe(row));
    await sleep(SAMPLE_GAP_MS);
  }

  printReport(scenario, samples, Boolean(dashboard));
  writeCsv(scenario, samples);

  mqttClient.end();
  await dashboard?.browser.close();
  await prisma.$disconnect();
  redis.disconnect();
  process.exit(0);
}

if (process.argv.includes("--selftest")) {
  const s = stats([1, 2, 3, 4, 100]);
  console.assert(
    s.median === 3 && s.max === 100 && s.mean === 22 && s.p95 === 100,
    "stats salah",
  );
  console.log("selftest ok");
} else {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
