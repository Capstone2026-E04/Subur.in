"use strict";

const { connectMQTT } = require("../connection");

const CONFIG_TOPIC_PREFIX = "suburin/devices";
const CONFIG_TOPIC_SUFFIX = "config";

function publishDeviceConfig(deviceId, readingIntervalMin) {
  return new Promise((resolve, reject) => {
    const client = connectMQTT();

    if (!client || !client.connected) {
      return reject(new Error("MQTT client belum terhubung ke broker."));
    }

    const topic = `${CONFIG_TOPIC_PREFIX}/${deviceId}/${CONFIG_TOPIC_SUFFIX}`;
    const payload = JSON.stringify({ reading_interval_min: readingIntervalMin });

    client.publish(topic, payload, { qos: 1, retain: false }, (err) => {
      if (err) {
        console.error(
          `[MQTT Publisher] Gagal mempublikasikan config ke device "${deviceId}":`,
          err.message
        );
        return reject(err);
      }

      console.log(
        `[MQTT Publisher] Config berhasil dikirim ke device "${deviceId}" | Topic: ${topic} | reading_interval_min: ${readingIntervalMin}`
      );
      resolve({ topic, payload: { reading_interval_min: readingIntervalMin } });
    });
  });
}

module.exports = { publishDeviceConfig };
