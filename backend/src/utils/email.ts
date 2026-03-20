import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

function generateMeetLink(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz";
  const part = (len: number) =>
    Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `https://meet.jit.si/skillswap-${Date.now()}-${Math.random().toString(36).substr(2, 9)}#config.lobby.enabled=false`;
}

export async function sendBookingConfirmation(
  studentEmail: string,
  studentName: string,
  mentorName: string,
  skill: string,
  scheduledDate: Date,
  meetLink: string
) {
  const dateStr = scheduledDate.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "full",
    timeStyle: "short",
  });

  await transporter.sendMail({
    from: `"SkillSwap" <${process.env.EMAIL_USER}>`,
    to: studentEmail,
    subject: `Session Booked! 🎉 - ${skill} with ${mentorName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9;">
        <div style="background: #6366f1; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0;">SkillSwap 🚀</h1>
        </div>
        <div style="background: white; padding: 30px; border-radius: 0 0 8px 8px;">
          <h2 style="color: #333;">Session Confirmed! ✅</h2>
          <p style="color: #666;">Hi <strong>${studentName}</strong>,</p>
          <p style="color: #666;">Your session has been booked successfully!</p>
          
          <div style="background: #f0f0ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Skill:</strong> ${skill}</p>
            <p style="margin: 5px 0;"><strong>Mentor:</strong> ${mentorName}</p>
            <p style="margin: 5px 0;"><strong>Date & Time:</strong> ${dateStr}</p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${meetLink}" style="background: #6366f1; color: white; padding: 15px 30px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: bold;">
              Join Google Meet 🎥
            </a>
          </div>

          <p style="color: #999; font-size: 14px;">Meeting Link: <a href="${meetLink}">${meetLink}</a></p>
          <p style="color: #999; font-size: 14px;">⏰ Please join 5 minutes before the session starts.</p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #999; font-size: 12px; text-align: center;">SkillSwap - Learn & Teach Skills</p>
        </div>
      </div>
    `,
  });
}

export async function sendMentorNotification(
  mentorEmail: string,
  mentorName: string,
  studentName: string,
  skill: string,
  scheduledDate: Date,
  meetLink: string
) {
  const dateStr = scheduledDate.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "full",
    timeStyle: "short",
  });

  await transporter.sendMail({
    from: `"SkillSwap" <${process.env.EMAIL_USER}>`,
    to: mentorEmail,
    subject: `New Session Request! 📚 - ${skill} from ${studentName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9;">
        <div style="background: #6366f1; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0;">SkillSwap 🚀</h1>
        </div>
        <div style="background: white; padding: 30px; border-radius: 0 0 8px 8px;">
          <h2 style="color: #333;">New Session Booked! 🎉</h2>
          <p style="color: #666;">Hi <strong>${mentorName}</strong>,</p>
          <p style="color: #666;">A student has booked a session with you!</p>
          
          <div style="background: #f0f0ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Skill:</strong> ${skill}</p>
            <p style="margin: 5px 0;"><strong>Student:</strong> ${studentName}</p>
            <p style="margin: 5px 0;"><strong>Date & Time:</strong> ${dateStr}</p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${meetLink}" style="background: #6366f1; color: white; padding: 15px 30px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: bold;">
              Join Google Meet 🎥
            </a>
          </div>

          <p style="color: #999; font-size: 14px;">Meeting Link: <a href="${meetLink}">${meetLink}</a></p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #999; font-size: 12px; text-align: center;">SkillSwap - Learn & Teach Skills</p>
        </div>
      </div>
    `,
  });
}

export async function sendSessionReminder(
  email: string,
  name: string,
  skill: string,
  meetLink: string
) {
  await transporter.sendMail({
    from: `"SkillSwap" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `⏰ Session Starting in 30 minutes - ${skill}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>⏰ Reminder: Your session starts in 30 minutes!</h2>
        <p>Hi <strong>${name}</strong>,</p>
        <p>Your <strong>${skill}</strong> session is starting soon!</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${meetLink}" style="background: #6366f1; color: white; padding: 15px 30px; border-radius: 8px; text-decoration: none; font-size: 16px;">
            Join Now 🎥
          </a>
        </div>
      </div>
    `,
  });
}

export async function sendRatingRequest(
  studentEmail: string,
  studentName: string,
  mentorName: string,
  skill: string,
  sessionId: number
) {
  await transporter.sendMail({
    from: `"SkillSwap" <${process.env.EMAIL_USER}>`,
    to: studentEmail,
    subject: `Rate your session with ${mentorName} ⭐`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>How was your session? ⭐</h2>
        <p>Hi <strong>${studentName}</strong>,</p>
        <p>Your <strong>${skill}</strong> session with <strong>${mentorName}</strong> is complete!</p>
        <p>Please rate your experience to help other students.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/sessions" style="background: #6366f1; color: white; padding: 15px 30px; border-radius: 8px; text-decoration: none; font-size: 16px;">
            Rate Session ⭐
          </a>
        </div>
      </div>
    `,
  });
}

export { generateMeetLink };
