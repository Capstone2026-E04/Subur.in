# Validation

There is no schema validation library (no Joi/Zod/express-validator) — every controller validates `req.body`/`req.params`/`req.query` manually and returns a `400` with a descriptive `message` on failure. This keeps validation logic next to the handler it protects, at the cost of some repetition across controllers.

## Common Patterns

**Required field check:**
```javascript
if (!deviceId || !label || !plantId || !polybagId) {
  return res.status(400).json({
    success: false,
    message: 'deviceId, label, plantId, dan polybagId wajib diisi.'
  });
}
```

**Numeric range check (sensor values):**
```javascript
const ph = parseFloat(phValue);
if (isNaN(ph)) {
  return res.status(400).json({ success: false, message: 'phValue dan moistureValue harus berupa angka valid.' });
}
if (ph < 0 || ph > 14) {
  return res.status(400).json({ success: false, message: 'Nilai pH harus berada dalam rentang 0 sampai 14.' });
}
```

**Integer with a minimum (device config):**
```javascript
const parsedDelay = Number(delay_ms);
if (!Number.isInteger(parsedDelay) || parsedDelay < 100) {
  return res.status(400).json({ success: false, message: '"delay_ms" harus berupa bilangan bulat dan minimal 100 ms.' });
}
```

**String length/emptiness (profile update):**
```javascript
if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
  return res.status(400).json({ success: false, message: 'Nama tidak boleh kosong.' });
}
if (name !== undefined && name.trim().length > 100) {
  return res.status(400).json({ success: false, message: 'Nama tidak boleh melebihi 100 karakter.' });
}
```

The AI layer duplicates its own range checks in [`ai/services/recommendation.service.js`](../../backend/src/ai/services/recommendation.service.js) (throwing `TypeError`/`RangeError` instead of returning HTTP responses), since it's called both from `recommendation.controller.js` and `device.controller.js` — controllers only need to validate what a client can pass in directly (e.g. simulate's `phValue`/`moistureValue`), while the service re-validates as a safety net against any caller.

## MQTT Payload Validation

Telemetry from devices is validated in [`mqtt/subscribers/sensor_subscriber.js`](../../backend/src/mqtt/subscribers/sensor_subscriber.js) rather than via the HTTP layer: `ph` and `moisture` must be finite numbers in range, and malformed JSON is dropped. Invalid payloads trigger a `Notification` (throttled to one per device per hour via a Redis lock key `sensor:invalid_notified:<deviceId>`) instead of a client-facing HTTP error, since there's no request/response cycle for MQTT.

## Adding Validation to a New Endpoint

Match the existing style: check required fields first, then type/format, then range/business rules, returning as soon as one fails — don't accumulate multiple errors into one response, controllers here always return on the first failure.
