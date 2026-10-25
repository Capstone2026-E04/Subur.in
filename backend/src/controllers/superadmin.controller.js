const prisma = require("../database/connections/prisma_client");
const { sendSuccess, sendError } = require("../utils/response");

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const MAX_SEARCH_LENGTH = 100;
const DEFAULT_HISTORY_LIMIT = 100;
const MAX_HISTORY_LIMIT = 500;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const DEVICE_SUMMARY = {
  device: { select: { id: true, label: true, deviceCode: true } },
};

const DEVICE_FILTER = { deviceId: { type: "uuid" } };

const RESOURCES = {
  users: {
    model: "user",
    dateField: "createdAt",
    defaultSort: { field: "createdAt", order: "desc" },
    sortable: ["name", "email", "role", "createdAt"],
    search: ["name", "email"],
    filters: {
      role: { type: "enum", values: ["USER", "SUPERADMIN"] },
      telegramNotifyEnabled: { type: "boolean" },
    },
    select: {
      id: true,
      googleId: true,
      name: true,
      email: true,
      avatarUrl: true,
      telegramChatId: true,
      telegramNotifyEnabled: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  },
  devices: {
    model: "device",
    dateField: "createdAt",
    defaultSort: { field: "createdAt", order: "desc" },
    sortable: [
      "label",
      "deviceCode",
      "user.email",
      "plant.name",
      "status",
      "sensorInterval",
      "lastSeenAt",
      "createdAt",
    ],
    search: ["label", "deviceCode", "user.name", "user.email", "plant.name"],
    filters: {
      status: { type: "enum", values: ["ACTIVE", "INACTIVE", "OFFLINE"] },
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      plant: { select: { id: true, name: true } },
    },
  },
  plants: {
    model: "plant",
    dateField: "createdAt",
    defaultSort: { field: "name", order: "asc" },
    sortable: ["name", "minPh", "maxPh", "phTarget", "createdAt"],
    search: ["name", "scientificName"],
    filters: {},
  },
  recommendations: {
    model: "recommendationLog",
    dateField: "createdAt",
    defaultSort: { field: "createdAt", order: "desc" },
    sortable: [
      "createdAt",
      "device.label",
      "phValue",
      "moistureValue",
      "categoryCode",
      "waterVolumeLiter",
      "limeDosageGram",
      "sulfurDosageGram",
    ],
    search: ["actionText", "device.label"],
    filters: {
      ...DEVICE_FILTER,
      reduceWatering: { type: "boolean" },
      isDev: { type: "boolean" },
    },
    include: DEVICE_SUMMARY,
  },
  "sensor-logs": {
    model: "rawSensorLog",
    dateField: "timestamp",
    defaultSort: { field: "timestamp", order: "desc" },
    sortable: ["timestamp", "device.label", "ph", "moisture"],
    search: ["device.label"],
    filters: {
      ...DEVICE_FILTER,
      isDev: { type: "boolean" },
    },
    include: DEVICE_SUMMARY,
  },
  notifications: {
    model: "notification",
    dateField: "createdAt",
    defaultSort: { field: "createdAt", order: "desc" },
    sortable: ["createdAt", "device.label", "title", "type", "isRead"],
    search: ["title", "message", "device.label"],
    filters: {
      ...DEVICE_FILTER,
      type: { type: "enum", values: ["warning", "success", "info"] },
      isRead: { type: "boolean" },
    },
    include: DEVICE_SUMMARY,
  },
};

const RESOURCE_KEYS = Object.keys(RESOURCES);

function parsePositiveInt(value, fallback) {
  const parsed = parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function nest(path, leaf) {
  return path.split(".").reduceRight((acc, key) => ({ [key]: acc }), leaf);
}

function single(value) {
  if (value === undefined) return undefined;
  return typeof value === "string" ? value.trim() : null;
}

function parseFilterValue(spec, raw) {
  if (spec.type === "enum") return spec.values.includes(raw) ? raw : null;
  if (spec.type === "boolean") {
    if (raw === "true") return true;
    if (raw === "false") return false;
    return null;
  }
  if (spec.type === "uuid") return UUID_PATTERN.test(raw) ? raw : null;
  return null;
}

function buildListQuery(config, query) {
  const invalid = (name) => ({ error: `Parameter "${name}" tidak valid.` });
  const and = [];

  const search = single(query.search);
  if (search === null || (search && search.length > MAX_SEARCH_LENGTH)) {
    return invalid("search");
  }
  if (search) {
    and.push({
      OR: config.search.map((field) =>
        nest(field, { contains: search, mode: "insensitive" }),
      ),
    });
  }

  for (const [key, spec] of Object.entries(config.filters)) {
    const raw = single(query[key]);
    if (raw === null) return invalid(key);
    if (!raw) continue;
    const value = parseFilterValue(spec, raw);
    if (value === null) return invalid(key);
    and.push({ [key]: value });
  }

  for (const [key, operator] of [
    ["from", "gte"],
    ["to", "lte"],
  ]) {
    const raw = single(query[key]);
    if (raw === null) return invalid(key);
    if (!raw) continue;
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return invalid(key);
    and.push({ [config.dateField]: { [operator]: date } });
  }

  const sortBy = single(query.sortBy);
  const order = single(query.order);
  if (sortBy === null || (sortBy && !config.sortable.includes(sortBy))) {
    return invalid("sortBy");
  }
  if (order === null || (order && !["asc", "desc"].includes(order))) {
    return invalid("order");
  }
  const sort = {
    field: sortBy || config.defaultSort.field,
    order: order || (sortBy ? "asc" : config.defaultSort.order),
  };

  return {
    where: and.length > 0 ? { AND: and } : {},
    orderBy: [nest(sort.field, sort.order), { id: "desc" }],
  };
}

exports.getOverview = async (req, res, next) => {
  try {
    const counts = await Promise.all(
      RESOURCE_KEYS.map((key) => prisma[RESOURCES[key].model].count()),
    );

    const overview = Object.fromEntries(
      RESOURCE_KEYS.map((key, index) => [key, counts[index]]),
    );

    return sendSuccess(res, 200, "Ringkasan data berhasil diambil.", {
      overview,
    });
  } catch (error) {
    console.error("[SuperadminController] Gagal mengambil ringkasan data:", {
      message: error.message,
      stack: error.stack,
      userId: req.user?.id,
    });
    return next(error);
  }
};

exports.getDeviceOptions = async (req, res, next) => {
  try {
    const devices = await prisma.device.findMany({
      orderBy: [{ label: "asc" }, { id: "asc" }],
      select: {
        id: true,
        label: true,
        deviceCode: true,
        user: { select: { name: true, email: true } },
      },
    });

    return sendSuccess(res, 200, "Daftar perangkat berhasil diambil.", {
      devices,
    });
  } catch (error) {
    console.error("[SuperadminController] Gagal mengambil daftar perangkat:", {
      message: error.message,
      stack: error.stack,
      userId: req.user?.id,
    });
    return next(error);
  }
};

exports.getSensorHistory = async (req, res, next) => {
  try {
    const deviceId = single(req.query.deviceId);

    if (!deviceId || !UUID_PATTERN.test(deviceId)) {
      return sendError(res, 400, "deviceId wajib berupa UUID yang valid.");
    }

    const limit = Math.min(
      parsePositiveInt(req.query.limit, DEFAULT_HISTORY_LIMIT),
      MAX_HISTORY_LIMIT,
    );

    const logs = await prisma.rawSensorLog.findMany({
      where: { deviceId },
      orderBy: { timestamp: "desc" },
      take: limit,
      select: { id: true, timestamp: true, ph: true, moisture: true },
    });

    return sendSuccess(res, 200, "Riwayat sensor berhasil diambil.", {
      items: logs.reverse(),
    });
  } catch (error) {
    console.error("[SuperadminController] Gagal mengambil riwayat sensor:", {
      message: error.message,
      stack: error.stack,
      userId: req.user?.id,
    });
    return next(error);
  }
};

exports.listResource = async (req, res, next) => {
  try {
    const { resource } = req.params;

    if (!Object.hasOwn(RESOURCES, resource)) {
      return sendError(res, 404, "Data yang diminta tidak ditemukan.");
    }

    const config = RESOURCES[resource];
    const parsed = buildListQuery(config, req.query);

    if (parsed.error) {
      return sendError(res, 400, parsed.error);
    }

    const { model, select, include } = config;
    const page = parsePositiveInt(req.query.page, 1);
    const limit = Math.min(
      parsePositiveInt(req.query.limit, DEFAULT_LIMIT),
      MAX_LIMIT,
    );

    const [items, total] = await Promise.all([
      prisma[model].findMany({
        where: parsed.where,
        orderBy: parsed.orderBy,
        skip: (page - 1) * limit,
        take: limit,
        ...(select ? { select } : {}),
        ...(include ? { include } : {}),
      }),
      prisma[model].count({ where: parsed.where }),
    ]);

    return sendSuccess(
      res,
      200,
      "Data berhasil diambil.",
      { items },
      {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    );
  } catch (error) {
    console.error("[SuperadminController] Gagal mengambil data:", {
      message: error.message,
      stack: error.stack,
      userId: req.user?.id,
      resource: req.params?.resource,
    });
    return next(error);
  }
};
