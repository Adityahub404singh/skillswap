import cron from "node-cron";
import { createJitsiJoinUrl } from "../services/jitsi.js";
import { transporter } from "../../utils/mailer.js";
import { processConnectEmailOutbox } from "./connect-email-outbox.js";

function escapeIcs(value: unknown) {
  return String(value ?? "").replace(/\\/g, "\\\\").replace(/\r\n|\r|\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}
function icsDate(value: string | Date) {
  return new Date(value).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}
function buildIcs(a: any, bookingId: string, method = "PUBLISH") {
  if (!a?.startAt) return null;
  const start = new Date(a.startAt);
  const end = new Date(start.getTime() + Number(a.durationMinutes || 60) * 60000);
  const location = a.location || a.joinUrl || "";
  const lines = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//SkillSwap//Connect//EN",
    "CALSCALE:GREGORIAN", `METHOD:${method}`, "BEGIN:VEVENT",
    `UID:connect-${bookingId}@skillswap`,
    `DTSTAMP:${icsDate(new Date())}`, `DTSTART:${icsDate(start)}`, `DTEND:${icsDate(end)}`,
    `SUMMARY:${escapeIcs(a.title)}`, `DESCRIPTION:${escapeIcs("SkillSwap Connect session")}`,
    `LOCATION:${escapeIcs(location)}`, "END:VEVENT", "END:VCALENDAR"
  ];
  return lines.join("\r\n");
}
async function hydrate(pool: any, payload: any, job: any, recipient: any) {
  const bookingId = payload?.data?.bookingId || payload?.bookingId;
  if (!bookingId) return payload;
  const result = await pool.query(
    `SELECT b.id AS booking_id, b.status AS booking_status,
            b.host_user_id, b.participant_user_id, b.attendance_mode,
            COALESCE(b.proposed_start_at, b.requested_start_at, a.start_at) AS starts_at,
            a.title, a.duration_minutes, a.timezone, a.delivery_mode,
            a.session_type, a.location, a.format,
            hu.name AS host_name, hu.email AS host_email,
            pu.name AS participant_name, pu.email AS participant_email,
            COALESCE(ar.room_name, m.room_name) AS room_name
       FROM connect_bookings b
       JOIN connect_activities a ON a.id=b.activity_id
       LEFT JOIN users hu ON hu.id::text=b.host_user_id
       LEFT JOIN users pu ON pu.id::text=b.participant_user_id
       LEFT JOIN connect_meetings m ON m.booking_id=b.id
       LEFT JOIN connect_activity_rooms ar ON ar.activity_id=a.id AND a.session_type NOT IN ('one_to_one','standard')
      WHERE b.id=$1`,
    [bookingId]
  );
  if (!result.rowCount) return payload;
  const row = result.rows[0];
  const appointment: any = {
    bookingId: row.booking_id,
    status: row.booking_status,
    title: row.title,
    hostName: row.host_name,
    participantName: row.participant_name,
    startAt: row.starts_at,
    durationMinutes: row.duration_minutes,
    timezone: row.timezone,
    deliveryMode: row.delivery_mode || row.format,
    sessionType: row.session_type,
    location: row.location
  };
  if (row.booking_status === "confirmed" && row.delivery_mode !== "offline" &&
      row.attendance_mode !== "offline" && row.room_name) {
    appointment.joinUrl = createJitsiJoinUrl({ roomName: row.room_name, activity: {
      startAt: row.starts_at, durationMinutes: row.duration_minutes,
      hostUserId: row.host_user_id
    }, member: recipient });
  }
  return { ...payload, appointment };
}

export function startConnectRuntime(pool: any) {
  let running = false;
  const task = cron.schedule("* * * * *", async () => {
    if (running) return;
    running = true;
    try {
      // Promote due reminder rows into the same transactional email outbox.
      await pool.query(
        `WITH due AS (
           SELECT id, booking_id, user_id, reminder_kind
           FROM connect_reminders
           WHERE status='pending' AND scheduled_at <= NOW()
           ORDER BY scheduled_at
           FOR UPDATE SKIP LOCKED
           LIMIT 100
         ), marked AS (
           UPDATE connect_reminders r SET status='sent', attempts=attempts+1
           FROM due WHERE r.id=due.id RETURNING due.booking_id, due.user_id, due.reminder_kind
         ), notices AS (
           INSERT INTO connect_notifications(user_id,type,title,body,data)
           SELECT user_id, 'session_reminder', 'Upcoming SkillSwap session',
                  'Your session starts soon (' || reminder_kind || ').',
                  jsonb_build_object('bookingId', booking_id, 'reminderKind', reminder_kind)
           FROM marked RETURNING id, user_id, data
         )
         INSERT INTO connect_email_outbox(user_id, notification_id, event_type, payload, status, available_at)
         SELECT user_id, id, 'session_reminder',
                jsonb_build_object('title','Upcoming SkillSwap session',
                                   'body','Your session starts soon.',
                                   'data',data),
                'pending', NOW()
         FROM notices
         ON CONFLICT (notification_id) DO NOTHING`
      );
      await processConnectEmailOutbox({
        pool,
        resolveUserEmail: async (userId: string) => {
          const r = await pool.query("SELECT id::text AS id, name, email FROM users WHERE id::text=$1 LIMIT 1", [userId]);
          return r.rows[0] || null;
        },
        hydratePayload: (payload: any, job: any, recipient: any) => hydrate(pool, payload, job, recipient),
        sendEmail: async ({ to, subject, text, html, payload, eventType }: any) => {
          const appointment = payload?.appointment;
          const shouldAttachCalendar =
            appointment &&
            (appointment.status === "confirmed" || appointment.status === "cancelled") &&
            !["booking_pending", "booking_request", "reschedule_request"].includes(String(eventType));
          const ics = shouldAttachCalendar
            ? buildIcs(appointment, appointment.bookingId, appointment.status === "cancelled" ? "CANCEL" : "PUBLISH")
            : null;
          const attachments = ics ? [{
            filename: "skillswap-session.ics",
            content: ics,
            contentType: "text/calendar; charset=utf-8; method=PUBLISH"
          }] : [];
          await transporter.sendMail({
            from: `"SkillSwap Connect" <${process.env.EMAIL_USER || process.env.SMTP_USER}>`,
            to, subject, text, html, attachments,
            headers: { "X-SkillSwap-Connect-Event": String(eventType || "notification") }
          });
        }
      });
    } catch (error) {
      console.error("[Connect runtime]", error);
    } finally {
      running = false;
    }
  });
  console.log("[SkillSwap Connect] email and reminder worker scheduled every minute");
  return task;
}
