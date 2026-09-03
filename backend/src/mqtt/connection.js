"use strict";

const mqtt = require("mqtt");
require("dotenv").config();

let client = null;


function connectMQTT() {
  if (client) return client;

  const host = process.env.MQTT_BROKER_URL || "localhost";
  const port = process.env.MQTT_PORT || "1883";
  let brokerUrl = host;
  
  if (!/^mqtt(s)?:\/\//.test(host)) {
    const protocol = port === "8883" ? "mqtts" : "mqtt";
    const cleanHost = host.split(":")[0];
    brokerUrl = `${protocol}://${cleanHost}:${port}`;
  }
  
  const options = {
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD,
    clientId: `suburin_backend_${Math.random().toString(16).substring(2, 8)}`,
    clean: true,
    reconnectPeriod: 5000,
    connectTimeout: 30000,
    
    
    
    rejectUnauthorized: false 
  };

  console.log(`[MQTT Client]  Mencoba terhubung ke EMQX Cloud di: ${brokerUrl}`);
  
  client = mqtt.connect(brokerUrl, options);

  client.on("connect", () => {
    console.log("[MQTT Client]   Terkoneksi dengan sukses ke EMQX Cloud!");
  });

  client.on("error", (err) => {
    console.error("[MQTT Client]  Kesalahan koneksi MQTT:", err.message);
  });

  client.on("close", () => {
    console.log("[MQTT Client] ️ Koneksi MQTT terputus.");
  });

  client.on("reconnect", () => {
    console.log("[MQTT Client]  Mencoba menyambungkan kembali ke broker...");
  });

  return client;
}

module.exports = { connectMQTT };
