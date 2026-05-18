# k6 Retrieve Test

This load test hits:

- `POST https://clipboard-b4kp.onrender.com/api/clips/retrieve`

## Change the code

Open [retrieve-test.js](/home/think41/vishnu/clipboard/loadtest/retrieve-test.js:1) and change:

```js
const CLIP_CODE = "PASTE_CODE_HERE";
```

to your real retrieval code, for example:

```js
const CLIP_CODE = "ABC123";
```

## What this test does

- runs `500` virtual users
- keeps them active for `1 minute`
- sends retrieve requests repeatedly
- writes a simple report after the run

## Run command

```bash
k6 run loadtest/retrieve-test.js
```

## Report files

After the run, you will get:

- [latest-summary.txt](/home/think41/vishnu/clipboard/loadtest/latest-summary.txt)
- [latest-summary.json](/home/think41/vishnu/clipboard/loadtest/latest-summary.json)

The text file is the simple report.

## Change test size

In [retrieve-test.js](/home/think41/vishnu/clipboard/loadtest/retrieve-test.js:7), change:

```js
vus: 500,
duration: "1m",
```

Examples:

- `vus: 100`
- `vus: 1000`
- `duration: "30s"`
- `duration: "5m"`
