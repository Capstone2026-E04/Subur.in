"use strict";

function parseCallbackData(data) {
  if (!data || typeof data !== "string") return null;

  const [domain, action, ...rest] = data.split(":");
  if (!domain || !action) return null;

  return { domain, action, value: rest.length > 0 ? rest.join(":") : null };
}

function buildCallbackData(domain, action, value) {
  return value !== undefined && value !== null ? `${domain}:${action}:${value}` : `${domain}:${action}`;
}

module.exports = { parseCallbackData, buildCallbackData };
