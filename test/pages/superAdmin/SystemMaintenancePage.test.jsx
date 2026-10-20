import { afterEach, describe, expect, it } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";

import { mswState } from "../../msw/handlers";
import { closePage, openPage } from "./superAdminHarness";

const PATH = "/super-admin/system-maintenance";

afterEach(closePage);

const backupsTable = () =>
  screen.findByRole("region", { name: "Stored backups" });

describe("super-admin system maintenance — REST cases", () => {
  it("loads the backup history and the monthly schedule with bearer auth", async () => {
    openPage(PATH);

    const table = await backupsTable();

    expect(mswState.systemBackupHits).toHaveLength(1);
    expect(new URL(mswState.systemBackupHits[0].url).pathname).toBe(
      "/api/system/backups",
    );
    expect(mswState.systemBackupHits[0].authorization).toBe(
      "Bearer super-admin-rest-token",
    );
    expect(mswState.backupScheduleHits).toHaveLength(1);
    expect(mswState.backupScheduleHits[0].authorization).toBe(
      "Bearer super-admin-rest-token",
    );

    expect(screen.getByText("2 snapshots on record")).toBeInTheDocument();
    expect(within(table).getByText("#2")).toBeInTheDocument();
    expect(within(table).getByText("47.1 KB")).toBeInTheDocument();
    expect(within(table).getAllByText("AES-256")).toHaveLength(2);

    expect(screen.getByLabelText("Day of month")).toHaveValue("28");
    expect(screen.getByLabelText("Execution time")).toHaveValue("23:59");
    expect(screen.getByLabelText("Execution time")).toHaveAttribute(
      "readonly",
    );
    expect(
      screen.getByText(
        "Currently runs on the 28th of every month.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Run backup now/ }),
    ).toBeInTheDocument();
  });

  it("runs an on-demand backup through POST /system/backups", async () => {
    openPage(PATH);
    await backupsTable();

    fireEvent.click(screen.getByRole("button", { name: /Run backup now/ }));

    expect(
      await screen.findByText(/Backup #3 created — onecare-backup-/),
    ).toBeInTheDocument();
    expect(mswState.systemBackupCreateHits).toHaveLength(1);
    expect(mswState.systemBackupCreateHits[0].authorization).toBe(
      "Bearer super-admin-rest-token",
    );

    const table = await backupsTable();
    expect(screen.getByText("3 snapshots on record")).toBeInTheDocument();
    expect(within(table).getByText("#3")).toBeInTheDocument();
    // the new snapshot is prepended, not refetched
    expect(mswState.systemBackupHits).toHaveLength(1);
  });

  it("saves a new backup day through PUT /system/backup/schedule", async () => {
    openPage(PATH);
    await backupsTable();

    fireEvent.change(screen.getByLabelText("Day of month"), {
      target: { value: "5" },
    });
    expect(screen.getByText(/Pending change:/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Schedule updated.")).toBeInTheDocument();
    expect(mswState.backupScheduleUpdateHits).toHaveLength(1);
    expect(mswState.backupScheduleUpdateHits[0]).toMatchObject({
      body: { dayOfMonth: 5 },
      authorization: "Bearer super-admin-rest-token",
    });
    expect(
      screen.getByText("Currently runs on the 5th of every month."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Day of month")).toHaveValue("5");
  });

  it("keeps the editor on a schedule save the backend rejects", async () => {
    openPage(PATH);
    await backupsTable();

    mswState.backupScheduleErrorMode = "server-error";
    fireEvent.change(screen.getByLabelText("Day of month"), {
      target: { value: "9" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Internal server error")).toBeInTheDocument();
    expect(mswState.backupScheduleUpdateHits).toHaveLength(1);
    // nothing was stored: the draft still shows the pending change
    expect(screen.getByText(/Pending change:/)).toBeInTheDocument();
    expect(screen.getByLabelText("Day of month")).toHaveValue("9");
  });

  it("surfaces a backup history failure and retries it", async () => {
    mswState.systemBackupsErrorMode = "server-error";
    openPage(PATH);

    expect(
      await screen.findByText("Could not load stored backups"),
    ).toBeInTheDocument();
    expect(screen.getByText("The backup service did not answer.")).toBeInTheDocument();
    expect(mswState.systemBackupHits).toHaveLength(1);

    mswState.systemBackupsErrorMode = null;
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    await backupsTable();
    expect(mswState.systemBackupHits).toHaveLength(2);
    expect(mswState.systemBackupHits[1].authorization).toBe(
      "Bearer super-admin-rest-token",
    );
  });

  it("surfaces a schedule load failure and retries it", async () => {
    mswState.backupScheduleErrorMode = "server-error";
    openPage(PATH);

    expect(
      await screen.findByText("Could not load backup schedule"),
    ).toBeInTheDocument();
    expect(screen.getByText("Internal server error")).toBeInTheDocument();
    expect(mswState.backupScheduleHits).toHaveLength(1);

    mswState.backupScheduleErrorMode = null;
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    await waitFor(() =>
      expect(
        screen.getByText(
          "Currently runs on the 28th of every month.",
        ),
      ).toBeInTheDocument(),
    );
    expect(mswState.backupScheduleHits).toHaveLength(2);
  });
});
