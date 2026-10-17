"use strict";

const { connectMQTT } = require("../connection");

// Payload ACK = record_id polos (bukan JSON). Gagal publish hanya dicatat:
// ESP32 mengirim ulang record tertua tiap 30 detik, dan penyimpanan idempoten.
function publishRecordAck(deviceCode, recordId) {
  return new Promise((resolve) => {
    const client = connectMQTT();
    const topic = `suburin/devices/${deviceCode}/ack`;

    if (!client || !client.connected) {
      console.warn(
        `[MQTT Publisher] ACK tertunda, broker belum terhubung | ${topic}`,
      );
      return resolve(false);
    }

    client.publish(
      topic,
      String(recordId),
      { qos: 1, retain: false },
      (err) => {
        if (err) {
          console.error(
            `[MQTT Publisher] Gagal mengirim ACK ke "${topic}":`,
            err.message,
          );
          return resolve(false);
        }
        resolve(true);
      },
    );
  });
}

module.exports = { publishRecordAck };
