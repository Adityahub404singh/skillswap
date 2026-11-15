import jwt from "jsonwebtoken";

export function createJitsiJoinUrl({ roomName, activity, member }) {
  const appId = process.env.JITSI_APP_ID;
  const keyId = process.env.JITSI_KEY_ID;
  const privateKeyRaw = process.env.JITSI_PRIVATE_KEY;
  const domain = process.env.JITSI_DOMAIN;

  if (!appId || !keyId || !privateKeyRaw || !domain) return null;
  if (!roomName || !activity?.startAt || !member?.id) return null;

  const startsAt = new Date(activity.startAt).getTime();
  const endsAt = startsAt + Number(activity.durationMinutes || 60) * 60_000;
  if (!Number.isFinite(startsAt) || !Number.isFinite(endsAt)) return null;

  const now = Math.floor(Date.now() / 1000);
  const nbf = Math.max(now - 30, Math.floor(startsAt / 1000) - 15 * 60);
  const exp = Math.max(now + 60, Math.floor(endsAt / 1000) + 60 * 60);
  const privateKey = privateKeyRaw.replace(/\\n/g, "\n");

  const token = jwt.sign({
    aud: "jitsi",
    iss: "chat",
    sub: domain,
    room: roomName,
    nbf,
    exp,
    context: {
      user: {
        name: member.name || "SkillSwap user",
        email: member.email || undefined,
        moderator: String(member.id) === String(activity.hostUserId)
      }
    }
  }, privateKey, {
    algorithm: "RS256",
    header: { kid: `${appId}/${keyId}`, typ: "JWT", alg: "RS256" }
  });

  return `https://${domain}/${encodeURIComponent(roomName)}?jwt=${encodeURIComponent(token)}`;
}
