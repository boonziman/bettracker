import { createServerFn } from "@tanstack/react-start";
import { uid } from "@/lib/utils";
import type { SharedSlip } from "./share";

export const publishShare = createServerFn({ method: "POST" })
  .validator((data: SharedSlip) => data)
  .handler(async ({ data }) => {
    const sql = await (await import("@/lib/db")).getSql();
    const id = data.id || uid("s");
    await sql.query(
      `insert into shares (id, user_id, username, payload) values ($1, $2, $3, $4::jsonb)
       on conflict (id) do update set payload = excluded.payload, username = excluded.username`,
      [id, "share", data.owner || "guest", JSON.stringify({ ...data, id })],
    );
    return { id };
  });

export const readShare = createServerFn({ method: "GET" })
  .validator((id: string) => id)
  .handler(async ({ data: id }) => {
    const sql = await (await import("@/lib/db")).getSql();
    const rows = await sql.query<{ payload: SharedSlip | string }>(
      "select payload from shares where id = $1",
      [id],
    );
    if (!rows[0]) return null;
    const payload = typeof rows[0].payload === "string" ? JSON.parse(rows[0].payload) : rows[0].payload;
    return payload as SharedSlip;
  });
