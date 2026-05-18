# ClipDrop

Clipboard sharing app with a static frontend and an Express + MongoDB backend.

## Flow

1. Sender pastes text and clicks `Send`.
2. Backend generates a 6-character code.
3. Backend encrypts the text before storing it in MongoDB.
4. Receiver opens the same page, clicks `Receive`, enters the code, and retrieves the text.

## Stack

- Frontend: `index.html`, `styles.css`, `app.js`
- Backend: `server.js` with Express
- Database: MongoDB with TTL expiry
- Security controls: AES-256-GCM encryption at rest, rate limiting, request validation

## Environment setup

1. Copy the example env file:

```bash
cp .env.example .env
```

2. Fill in these values in `.env`:

- `PORT`: local server port
- `MONGODB_URI`: MongoDB connection string
- `CLIP_ENCRYPTION_KEY`: 64-character hex key used for AES-256-GCM
- `CLIP_TTL_MINUTES`: how long a code stays valid
- `MAX_TEXT_LENGTH`: max clipboard payload size

Generate a strong encryption key with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Install

```bash
npm install
```

## Run locally

```bash
npm run dev
```

Then open `http://localhost:3000`.

## API

- `POST /api/clips`
  - body: `{ "text": "..." }`
  - returns: `{ "code": "ABC123" }`

- `POST /api/clips/retrieve`
  - body: `{ "code": "ABC123" }`
  - returns: `{ "text": "..." }`

## Notes

- Codes expire automatically using MongoDB TTL.
- Rate limiting is IP-based.
- Text is encrypted before it is written to the database.
- This version serves the static frontend from the same Express server.

## Deployment direction

For a cheap first deployment:

- frontend + API: Render, Railway, or similar Node host
- database: MongoDB Atlas

If you want stricter abuse control later, add:

- per-device tokens
- CAPTCHA on send
- retrieval attempt throttling per code
- one-time retrieval deletes
