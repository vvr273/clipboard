import http from "k6/http";
import { check, sleep } from "k6";

const BASE_URL = "https://clipboard-b4kp.onrender.com";
const CLIP_CODE = "W7V3DV";

export const options = {
  scenarios: {
    retrieve_load: {
      executor: "constant-vus",
      vus: 500,
      duration: "1m",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.10"],
    http_req_duration: ["p(95)<3000"],
    checks: ["rate>0.90"],
  },
};

function buildSummary(data) {
  const iterations = data.metrics.iterations?.values?.count || 0;
  const requests = data.metrics.http_reqs?.values?.count || 0;
  const failedRate = data.metrics.http_req_failed?.values?.rate || 0;
  const checkRate = data.metrics.checks?.values?.rate || 0;
  const avgDuration = data.metrics.http_req_duration?.values?.avg || 0;
  const p95Duration = data.metrics.http_req_duration?.values?.["p(95)"] || 0;
  const maxDuration = data.metrics.http_req_duration?.values?.max || 0;

  return [
    "ClipDrop retrieve load test summary",
    `Target: ${BASE_URL}/api/clips/retrieve`,
    `Code used: ${CLIP_CODE}`,
    `Duration: ${data.state.testRunDurationMs} ms`,
    `Iterations: ${iterations}`,
    `Requests: ${requests}`,
    `Failed requests: ${failedRate}`,
    `Check pass rate: ${checkRate}`,
    `Avg duration: ${avgDuration} ms`,
    `P95 duration: ${p95Duration} ms`,
    `Max duration: ${maxDuration} ms`,
  ].join("\n");
}

export default function () {
  if (CLIP_CODE === "PASTE_CODE_HERE") {
    throw new Error("Set CLIP_CODE at the top of loadtest/retrieve-test.js before running k6.");
  }

  const response = http.post(
    `${BASE_URL}/api/clips/retrieve`,
    JSON.stringify({ code: CLIP_CODE }),
    {
      headers: {
        "Content-Type": "application/json",
      },
    },
  );

  check(response, {
    "status is 200": (res) => res.status === 200,
    "response has text": (res) => {
      try {
        const body = JSON.parse(res.body);
        return typeof body.text === "string";
      } catch (_error) {
        return false;
      }
    },
  });

  sleep(1);
}

export function handleSummary(data) {
  const textSummary = buildSummary(data);

  return {
    stdout: `${textSummary}\n`,
    "loadtest/latest-summary.txt": `${textSummary}\n`,
    "loadtest/latest-summary.json": JSON.stringify(data, null, 2),
  };
}
