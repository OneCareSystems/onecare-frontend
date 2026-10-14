/** Count every distinct API status without assuming a fixed status vocabulary. */
export const calculateQueueStatusCounts = (records) => {
  const counts = new Map();

  for (const record of records) {
    if (typeof record?.status !== "string" || record.status.trim() === "") {
      throw new TypeError("Queue records must have a non-empty status");
    }
    counts.set(record.status, (counts.get(record.status) ?? 0) + 1);
  }

  return Array.from(counts, ([status, count]) => ({ status, count }));
};
