"use strict";

jest.mock("node-cron", () => ({ schedule: jest.fn() }));
jest.mock("../../database/connections/prisma_client", () => ({
  $queryRawUnsafe: jest.fn(),
  $executeRawUnsafe: jest.fn(),
}));
jest.mock("../../database/connections/redis", () => ({
  getRedisClient: jest.fn(),
}));
jest.mock("../../sse/sse_manager", () => ({ broadcastToDevice: jest.fn() }));

const prisma = require("../../database/connections/prisma_client");
const {
  managePartitions,
  enableRlsOnPartitions,
} = require("../../cron/database_cleanup_cron");

describe("enableRlsOnPartitions", () => {
  it("enables RLS on each partition without RLS and skips unexpected names", async () => {
    prisma.$queryRawUnsafe.mockResolvedValue([
      { relname: "raw_sensor_logs_y2026m09" },
      { relname: 'evil"; DROP TABLE users; --' },
    ]);

    await enableRlsOnPartitions();

    expect(prisma.$executeRawUnsafe).toHaveBeenCalledTimes(1);
    expect(prisma.$executeRawUnsafe).toHaveBeenCalledWith(
      'ALTER TABLE "raw_sensor_logs_y2026m09" ENABLE ROW LEVEL SECURITY;',
    );
  });

  it("does not throw when the query fails", async () => {
    prisma.$queryRawUnsafe.mockRejectedValue(new Error("db down"));
    jest.spyOn(console, "error").mockImplementation(() => {});

    await expect(enableRlsOnPartitions()).resolves.toBeUndefined();
  });
});

describe("managePartitions", () => {
  it("enables RLS on newly created partitions and sweeps existing ones", async () => {
    prisma.$queryRawUnsafe.mockImplementation(async (sql) => {
      if (sql.includes("pg_partitioned_table")) return [{ partstrat: "r" }];
      if (sql.includes("to_regclass")) return [{ table_regclass: null }];
      return [];
    });
    prisma.$executeRawUnsafe.mockResolvedValue(0);

    await managePartitions();

    const statements = prisma.$executeRawUnsafe.mock.calls.map(([sql]) => sql);
    expect(statements.filter((s) => s.includes("PARTITION OF"))).toHaveLength(
      2,
    );
    expect(
      statements.filter((s) => s.includes("ENABLE ROW LEVEL SECURITY")),
    ).toHaveLength(2);
  });
});
