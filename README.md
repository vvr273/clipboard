# ClipDrop

Simple online clipboard for text sharing between devices.

## Flow

1. Sender pastes text and clicks `Send`.
2. App stores the text online and generates a 6-character code.
3. Receiver opens the same page, clicks `Receive`, enters the code, and clicks `Retrieve`.
4. Receiver sees the text and can copy it with one click.

## Stack

- Static frontend: `index.html`, `styles.css`, `app.js`
- Free backend: Firebase Firestore on the Spark plan
- Free hosting: GitHub Pages, Netlify, or Vercel

## Why this fits a zero budget

- No paid server required
- No custom backend required for the first version
- Firebase Spark plan has a free tier good enough for a small personal tool
- Static hosting can be free

## Firebase setup

1. Create a Firebase project.
2. Enable Firestore Database in production or test mode.
3. Create a web app inside Firebase and copy the config values.
4. Copy `env.example.js` to `env.js`.
5. Replace the `REPLACE_ME` values in `env.js`.

## Firestore structure

Collection: `clips`

Document ID:
- the generated 6-character code

Document fields:
- `text`
- `createdAt`
- `expiresAt`

## Suggested Firestore rules for a quick prototype

These rules are intentionally simple. They are acceptable for a personal prototype, but not for a high-trust public app.

```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /clips/{clipId} {
      allow create: if request.resource.data.keys().hasOnly(['text', 'createdAt', 'expiresAt'])
        && request.resource.data.text is string
        && request.resource.data.text.size() > 0
        && request.resource.data.text.size() < 50000;
      allow read: if true;
      allow update, delete: if false;
    }
  }
}
```

## Limits and reality

- Yes, this is possible on a zero budget.
- It is fine for a small personal or demo product.
- It is not private in a strong security sense yet.
- Expired records are only checked in the client in this version.
- Real cleanup can be added later with Firebase TTL or a serverless function.

## Run locally

First create your local config file:

```bash
cp env.example.js env.js
```

Then use any static file server, for example:

```bash
npx serve .
```

Then open the local URL in the browser.
