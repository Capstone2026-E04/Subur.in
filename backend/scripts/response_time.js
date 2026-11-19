"use strict";
/* global window, requestAnimationFrame -- dipakai di dalam konteks halaman Playwright */
// Uji response time ESP32 -> backend -> dashboard. Satu jam (laptop) untuk semua titik,
// jadi tidak butuh sinkronisasi NTP. Meniru ESP32 lewat MQTT, lalu mengamati dari luar.
//
//   T0  mqtt.publish dipanggil           T1  event SSE sensor tiba (backend sudah menerima + lookup device)
//   T2  baris recommendation_logs terlihat (polling DB)
//   T3  GET /api/devices/:id/recommendation (dipanggil setelah T2) selesai
//   T4  dashboard (Playwright) menampilkan rekomendasi baru: fetch milik aplikasi sendiri yang
//       mengembalikan pH sampel ini, lalu 2x requestAnimationFrame (~ setelah React commit + paint).
//       Aktif bila TEST_EMAIL & TEST_PASSWORD (akun pemilik device) diisi; FRONTEND_URL default
//       http://localhost:3001. Dashboard hanya fetch ulang saat event SSE tiba, dan itu terjadi
//       SEBELUM log tersimpan, jadi sampel yang tidak muncul dalam 10 dtk dicatat "tak tampil".
//
// Pakai: node scripts/response_time.js --device <deviceCode> --scenario normal|kategori|emergency [--runs 30]
// PERHATIAN: menulis rekomendasi sungguhan + memicu notifikasi + menghapus kunci gate Redis
// milik device itu. Pakai device uji khusus, bukan device tanaman yang sedang dipantau.
require("dotenv").config();
const fs = require("fs");
const jwt = require("jsonwebtoken");
const mqtt = require("mqtt");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function stats(values) {
  const v = [...values].sort((a, b) => a - b);
  const n = v.length;
  if (!n) return null;
  const mean = v.reduce((a, b) => a + b, 0) / n;
  const sd = Math.sqrt(v.reduce((a, b) => a + (b - mean) ** 2, 0) / n);
  const pct = (p) => v[Math.min(n - 1, Math.ceil(p * n) - 1)];
  return {
    n,
    min: v[0],
    mean,
    median: pct(0.5),
    p95: pct(0.95),
    max: v[n - 1],
    sd,
  };
}

// Titik uji per skenario: [pH, kelembapan VWC %]. Kelembapan darurat kering <= 16,5 %.
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

async function main() {
  const arg = (k, d) => {
    const i = process.argv.indexOf(`--${k}`);
    return i > -1 ? process.argv[i + 1] : d;
  };
  const deviceCode = arg("device");
  const scenario = arg("scenario", "normal");
  const runs = Number(arg("runs", 30));
  const apiUrl = process.env.API_URL || "http://localhost:3000";
  const timeoutMs = 30000;
  if (!deviceCode || !POINTS[scenario]) {
    throw new Error(
      "Pakai: --device <deviceCode> --scenario normal|kategori|emergency",
    );
  }

  const prisma = require("../src/database/connections/prisma_client");
  const redis = require("../src/database/connections/redis").getRedisClient();
  const device = await prisma.device.findUnique({ where: { deviceCode } });
  if (!device) throw new Error(`Device ${deviceCode} tidak ada di database.`);
  const token = jwt.sign({ id: device.userId }, process.env.JWT_SECRET);
  const auth = { Authorization: `Bearer ${token}` };

  const client = mqtt.connect(process.env.MQTT_BROKER_URL, {
    port: Number(process.env.MQTT_PORT) || undefined,
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD,
  });
  await new Promise((res, rej) =>
    client.once("connect", res).once("error", rej),
  );

  // Satu koneksi SSE untuk seluruh uji; dispatch ke penunggu berdasarkan nilai pH unik.
  const waiters = new Map();
  const sse = await fetch(`${apiUrl}/api/sensors/${device.id}/stream`, {
    headers: auth,
  });
  if (!sse.ok) throw new Error(`SSE gagal: HTTP ${sse.status}`);
  (async () => {
    let buf = "";
    for await (const chunk of sse.body) {
      buf += Buffer.from(chunk).toString();
      let i;
      while ((i = buf.indexOf("\n\n")) > -1) {
        const line = buf.slice(0, i).replace(/^data: /, "");
        buf = buf.slice(i + 2);
        try {
          const ev = JSON.parse(line);
          waiters.get(ev.ph)?.(performance.now());
        } catch {
          continue; // keepalive / bukan JSON
        }
      }
    }
  })().catch(() => {});

  // Browser (T4): login lewat form asli, buka dashboard, tunggu stream SSE terbuka.
  let browser = null;
  let page = null;
  if (process.env.TEST_EMAIL && process.env.TEST_PASSWORD) {
    const front = process.env.FRONTEND_URL || "http://localhost:3001";
    browser = await require("playwright").chromium.launch();
    page = await browser.newPage();
    await page.addInitScript(() => {
      const orig = window.fetch;
      window.__t = {};
      window.fetch = async (...a) => {
        const r = await orig(...a);
        if (String(a[0]?.url ?? a[0]).includes("/recommendation"))
          r.clone()
            .json()
            .then((j) => {
              const ph = j?.data?.phValue;
              if (ph == null || window.__t[ph]) return;
              const resp = Date.now();
              requestAnimationFrame(() =>
                requestAnimationFrame(() => {
                  window.__t[ph] = { resp, t4: Date.now() };
                }),
              );
            })
            .catch(() => {});
        return r;
      };
    });
    await page.goto(`${front}/login`);
    await page.fill("#login-email", process.env.TEST_EMAIL);
    await page.fill("#login-password", process.env.TEST_PASSWORD);
    const streamOpen = page.waitForRequest(/\/api\/sensors\/.+\/stream/, {
      timeout: 30000,
    });
    await page.click("#btn-login-email");
    await streamOpen;
    await sleep(2000);
  }

  const samples = [];
  for (let i = 0; i < runs; i++) {
    const [basePh, moisture] = POINTS[scenario][i % POINTS[scenario].length];
    const ph = Number((basePh + (i + 1) * 1e-4).toFixed(4)); // unik per sampel = kunci korelasi

    // Reset gate 4 jam / 7 hari / darurat agar tiap sampel menghasilkan rekomendasi.
    const keys = await redis.keys(`sensor:*${deviceCode}*`);
    const gate = keys.filter((k) =>
      /moisture_window|water_decision|ph_decision|emergency/.test(k),
    );
    if (gate.length) await redis.del(...gate);
    await redis.lpush(
      `sensor:moisture_window:${deviceCode}`,
      `${Date.now()}:${moisture}`,
    );

    const row = { run: i + 1, ph, moisture, ok: false };
    const t1p = new Promise((r) => waiters.set(ph, r));
    const topic = `suburin/devices/${deviceCode}/telemetry`;
    const t0 = performance.now();
    const t0wall = Date.now(); // jam dinding laptop yang sama dengan jam halaman browser
    client.publish(topic, JSON.stringify({ ph, soil_vwc_pct: moisture }), {
      qos: 1,
    });

    const t1 = await Promise.race([t1p, sleep(timeoutMs).then(() => null)]);
    if (t1 !== null) {
      row.t1 = t1 - t0;
      let log = null;
      while (!log && performance.now() - t0 < timeoutMs) {
        log = await prisma.recommendationLog.findFirst({
          where: { deviceId: device.id, phValue: ph },
          select: { categoryCode: true, emergencyReason: true },
        });
        if (!log) await sleep(50);
      }
      const t2 = performance.now();
      if (log) {
        await (
          await fetch(`${apiUrl}/api/devices/${device.id}/recommendation`, {
            headers: auth,
          })
        ).text();
        Object.assign(row, {
          ok: true,
          t2: t2 - t0,
          t3: performance.now() - t0,
          category: log.categoryCode,
        });
        if (page) {
          let hit;
          const until = Date.now() + 10000;
          while (!hit && Date.now() < until) {
            hit = await page.evaluate((p) => window.__t[p], ph);
            if (!hit) await sleep(30);
          }
          if (hit) Object.assign(row, { t4: hit.t4 - t0wall });
        }
      }
    }
    waiters.delete(ph);
    samples.push(row);
    console.log(
      `#${row.run} ${row.ok ? "ok" : "GAGAL"}`,
      row.ok
        ? `T1=${row.t1 | 0} T2=${row.t2 | 0} T3=${row.t3 | 0} T4=${row.t4 === undefined ? "tak tampil" : row.t4 | 0} ms ${row.category}`
        : "",
    );
    await sleep(1000);
  }

  const ok = samples.filter((s) => s.ok);
  const seg = {
    "ESP32 -> Backend (T0->T1)": ok.map((s) => s.t1),
    "Fuzzy + simpan DB (T1->T2)": ok.map((s) => s.t2 - s.t1),
    "API rekomendasi (T2->T3)": ok.map((s) => s.t3 - s.t2),
  };
  const shown = ok.filter((s) => s.t4 !== undefined);
  if (page) {
    seg["Dashboard tampil (T0->T4, hanya yang tampil)"] = shown.map(
      (s) => s.t4,
    );
    console.log(`Tampil otomatis di dashboard: ${shown.length}/${ok.length}`);
  } else {
    seg["End-to-end sampai API (T0->T3)"] = ok.map((s) => s.t3);
  }
  const f = (x) => Math.round(x);
  console.log(
    `\nSkenario: ${scenario} | n=${ok.length}/${runs} | gagal=${runs - ok.length}`,
  );
  console.log(
    "| Segmen | Min | Mean | Median | P95 | Max | SD |\n|---|---|---|---|---|---|---|",
  );
  for (const [name, vals] of Object.entries(seg)) {
    const s = stats(vals);
    if (s)
      console.log(
        `| ${name} | ${f(s.min)} | ${f(s.mean)} | ${f(s.median)} | ${f(s.p95)} | ${f(s.max)} | ${f(s.sd)} |`,
      );
  }
  const out = `response_time_${scenario}_${Date.now()}.csv`;
  fs.writeFileSync(
    out,
    [
      "run,ph,moisture,ok,t1_ms,t2_ms,t3_ms,t4_ms,category",
      ...samples.map((s) =>
        [
          s.run,
          s.ph,
          s.moisture,
          s.ok,
          s.t1 ?? "",
          s.t2 ?? "",
          s.t3 ?? "",
          s.t4 ?? "",
          s.category ?? "",
        ].join(","),
      ),
    ].join("\n"),
  );
  console.log(`CSV: ${out}`);

  client.end();
  await browser?.close();
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
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
