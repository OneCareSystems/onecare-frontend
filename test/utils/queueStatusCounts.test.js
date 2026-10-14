import { describe, expect, it } from "vitest";
import { calculateQueueStatusCounts } from "../../src/utils/queueStatusCounts";

describe("calculateQueueStatusCounts", () => {
  it("counts repeated and different statuses, including unknown statuses", () => {
    expect(
      calculateQueueStatusCounts([
        { status: "waiting" },
        { status: "waiting" },
        { status: "in-consultation" },
        { status: "awaiting-review" },
      ]),
    ).toEqual([
      { status: "waiting", count: 2 },
      { status: "in-consultation", count: 1 },
      { status: "awaiting-review", count: 1 },
    ]);
  });

  it("returns no status counts for an empty queue", () => {
    expect(calculateQueueStatusCounts([])).toEqual([]);
  });

  it("rejects missing and malformed statuses instead of inventing a category", () => {
    expect(() => calculateQueueStatusCounts([{}])).toThrow(/non-empty status/i);
    expect(() => calculateQueueStatusCounts([{ status: "  " }])).toThrow(
      /non-empty status/i,
    );
    expect(() => calculateQueueStatusCounts([{ status: 3 }])).toThrow(
      /non-empty status/i,
    );
  });

  it("counts one status for each valid record", () => {
    const records = [
      { status: "ready" },
      { status: "waiting" },
      { status: "ready" },
    ];
    expect(
      calculateQueueStatusCounts(records).reduce(
        (sum, item) => sum + item.count,
        0,
      ),
    ).toBe(records.length);
  });
});
