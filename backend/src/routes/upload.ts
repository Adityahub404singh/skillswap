import { Router, type IRouter } from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { db } from "../db.js";
import { eq } from "drizzle-orm";
import { usersTable } from "../schema/index.js";
import { requireAuth, type AuthRequest } from "../middlewares/auth.js";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Memory storage — file kabhi disk pe nahi likhta, seedha buffer se Cloudinary jaata hai
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }); // max 5MB

const router: IRouter = Router();

router.post("/avatar", requireAuth, upload.single("avatar"), async (req: AuthRequest, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const uploadResult = await new Promise<any>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: "skillswap/avatars",
          transformation: [{ width: 500, height: 500, crop: "fill", gravity: "face" }],
        },
        (err, result) => (err ? reject(err) : resolve(result))
      );
      stream.end(req.file!.buffer);
    });

    await db.update(usersTable)
      .set({ avatar: uploadResult.secure_url } as any)
      .where(eq(usersTable.id, req.userId!));

    res.json({ success: true, avatar: uploadResult.secure_url });
  } catch (err: any) {
    console.error("Avatar upload error:", err);
    res.status(500).json({ error: "Upload failed" });
  }
});

export default router;