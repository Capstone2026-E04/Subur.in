"use strict";

const clients = new Map();

function addClient(deviceId, res) {
  if (!clients.has(deviceId)) {
    clients.set(deviceId, new Set());
  }
  clients.get(deviceId).add(res);
  console.log(
    `[SSE]  Client baru untuk device "${deviceId}". Total: ${clients.get(deviceId).size}`
  );
}

function removeClient(deviceId, res) {
  if (!clients.has(deviceId)) return;
  clients.get(deviceId).delete(res);
  if (clients.get(deviceId).size === 0) {
    clients.delete(deviceId);
  }
  console.log(
    `[SSE]  Client terputus dari device "${deviceId}".`
  );
}

function broadcastToDevice(deviceId, data) {
  if (!clients.has(deviceId)) return;
  const message = `data: ${JSON.stringify(data)}\n\n`;
  for (const res of clients.get(deviceId)) {
    try {
      res.write(message);
    } catch {
      clients.get(deviceId).delete(res);
    }
  }
}

function getClientCount(deviceId) {
  return clients.has(deviceId) ? clients.get(deviceId).size : 0;
}

module.exports = { addClient, removeClient, broadcastToDevice, getClientCount };
