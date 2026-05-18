const crypto = require("crypto");
const path = require("path");

const dotenv = require("dotenv");
const express = require("express");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const mongoose = require("mongoose");

dotenv.config();

const PORT = Number(process.env.PORT || 3000);
const MONGODB_URI = process.env.MONGODB_URI;
const CLIP_ENCRYPTION_KEY = process.env.CLIP_ENCRYPTION_KEY;
const CLIP_TTL_MINUTES = Number(process.env.CLIP_TTL_MINUTES || 30);
const MAX_TEXT_LENGTH = Number(process.env.MAX_TEXT_LENGTH || 50000);
const CODE_LENGTH = 6;
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

if (!MONGODB_URI) {
  throw new Error("Missing MONGODB_URI in .env");
}

if (!CLIP_ENCRYPTION_KEY) {
  throw new Error("Missing CLIP_ENCRYPTION_KEY in .env");
}

if (!/^[0-9a-fA-F]{64}$/.test(CLIP_ENCRYPTION_KEY)) {
  throw new Error("CLIP_ENCRYPTION_KEY must be a 64-character hex string.");
}

const encryptionKey = Buffer.from(CLIP_ENCRYPTION_KEY, "hex");

const clipSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      minlength: CODE_LENGTH,
      maxlength: CODE_LENGTH,
      index: true,
    },
    cipherText: {
      type: String,
      required: true,
    },
    iv: {
      type: String,
      required: true,
    },
    authTag: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: {
        expires: 0,
      },
    },
  },
  {
    timestamps: true,
  },
);

const Clip = mongoose.model("Clip", clipSchema);

function createCode() {
  let code = "";

  for (let index = 0; index < CODE_LENGTH; index += 1) {
    const randomIndex = crypto.randomInt(0, CODE_ALPHABET.length);
    code += CODE_ALPHABET[randomIndex];
  }

  return code;
}

function nextExpiryDate() {
  return new Date(Date.now() + CLIP_TTL_MINUTES * 60 * 1000);
}

function encryptText(plainText) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    cipherText: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
  };
}

function decryptText(clip) {
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    encryptionKey,
    Buffer.from(clip.iv, "base64"),
  );

  decipher.setAuthTag(Buffer.from(clip.authTag, "base64"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(clip.cipherText, "base64")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

async function saveClip(text) {
  const encrypted = encryptText(text);

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = createCode();

    try {
      await Clip.create({
        code,
        ...encrypted,
        expiresAt: nextExpiryDate(),
      });

      return code;
    } catch (error) {
      if (error?.code === 11000) {
        continue;
      }

      throw error;
    }
  }

  throw new Error("Could not allocate a share code. Try again.");
}

async function main() {
  await mongoose.connect(MONGODB_URI);

  const app = express();

  app.use(
    helmet({
      contentSecurityPolicy: false,
    }),
  );
  app.use(express.json({ limit: "64kb" }));
  app.use(express.static(path.join(__dirname)));

  const createLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: "Too many send requests from this IP. Try again later.",
    },
  });

  const retrieveLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: "Too many retrieve requests from this IP. Try again later.",
    },
  });

  app.get("/api/health", (_request, response) => {
    response.json({ ok: true });
  });

  app.post("/api/clips", createLimiter, async (request, response) => {
    const text = typeof request.body?.text === "string" ? request.body.text.trim() : "";

    if (!text) {
      response.status(400).json({ error: "Paste some text before sending." });
      return;
    }

    if (text.length > MAX_TEXT_LENGTH) {
      response.status(413).json({
        error: `Text is too large. Maximum length is ${MAX_TEXT_LENGTH} characters.`,
      });
      return;
    }

    try {
      const code = await saveClip(text);
      response.status(201).json({ code });
    } catch (error) {
      response.status(500).json({ error: "Could not save the clipboard text." });
    }
  });

  app.post("/api/clips/retrieve", retrieveLimiter, async (request, response) => {
    const code = typeof request.body?.code === "string" ? request.body.code.trim().toUpperCase() : "";

    if (!/^[A-Z0-9]{6}$/.test(code)) {
      response.status(400).json({ error: "Enter the 6-character code." });
      return;
    }

    try {
      const clip = await Clip.findOne({ code }).exec();

      if (!clip) {
        response.status(404).json({ error: "Code not found." });
        return;
      }

      if (clip.expiresAt.getTime() <= Date.now()) {
        response.status(410).json({ error: "This code has expired." });
        return;
      }

      const text = decryptText(clip);
      response.json({ text });
    } catch (error) {
      response.status(500).json({ error: "Could not retrieve the clipboard text." });
    }
  });

  app.get("*", (_request, response) => {
    response.sendFile(path.join(__dirname, "index.html"));
  });

  app.listen(PORT, () => {
    console.log(`ClipDrop server running on http://localhost:${PORT}`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
