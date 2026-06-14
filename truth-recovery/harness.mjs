// harness.mjs — known-truth benchmark for the poolingsuite engine.
//
// Injects a KNOWN (mu, tau^2) plus optional publication selection via dgp.mjs,
// then measures, per pooling method, how well it recovers the truth:
//
//   * COVERAGE of the true mu by the 95% interval        (target 0.95)
//   * BIAS and RMSE of the point estimate                (theta_hat - mu)
//   * PI COVERAGE of a NEW study's true effect            (target 0.95)
//
// All numbers come from the engine's OWN runAllEstimators() (extracted
// verbatim into engine.mjs). The engine ships its prediction interval on
// t_{k-2}; to test the t_{k-1} (Cochrane v6.5) question honestly we also
// reconstruct the t_{k-1} PI from the engine's own (theta, tau2, se).

import {
  runAllEstimators, tQuantile,
} from "./engine.mjs";
import { makeRng, generate } from "./dgp.mjs";

// Standard normal (Box-Muller) on the dgp RNG stream — dgp.mjs keeps `randn`
// private, so we replicate it here to draw a NEW study's true effect.
function randn(rng) {
  let u1 = rng(), u2 = rng();
  if (u1 < 1e-12) u1 = 1e-12;
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

// Methods: which estimator row + which interval field to score for CI coverage.
const METHODS = [
  { name: "DL+Wald",   est: "DL",   ci: "waldCI" },   // RevMan-style default
  { name: "REML+HKSJ", est: "REML", ci: "hksjCI" },   // recommended
  { name: "PM+HKSJ",   est: "PM",   ci: "hksjCI" },
];

function runMethod(mu, tau2, k, scenario, nIter, seed, methodSpec) {
  const rng = makeRng(seed);
  const sd = Math.sqrt(tau2);
  let covered = 0, nOk = 0, widthSum = 0;
  let piCovKm2 = 0, piCovKm1 = 0, piTotal = 0; // PI of a NEW study
  const errs = [];

  for (let it = 0; it < nIter; it++) {
    const { yi, vi } = generate(mu, tau2, k, scenario, rng);
    const newTheta = mu + sd * randn(rng); // a NEW study's true effect

    const results = runAllEstimators(yi, vi);
    const r = results.find((x) => x.method === methodSpec.est);
    if (!r) continue;
    nOk++;
    const ci = r[methodSpec.ci];
    errs.push(r.theta - mu);
    widthSum += ci[1] - ci[0];
    if (ci[0] <= mu && mu <= ci[1]) covered++;

    // PI of a NEW study's true effect: engine ships t_{k-2}; compare t_{k-1}.
    if (k >= 3) {
      const piSe = Math.sqrt(r.tau2 + r.se * r.se);
      const tcrit2 = Math.abs(tQuantile(0.025, k - 2)); // shipped
      const lo2 = r.theta - tcrit2 * piSe, hi2 = r.theta + tcrit2 * piSe;
      if (lo2 <= newTheta && newTheta <= hi2) piCovKm2++;
      const tcrit1 = Math.abs(tQuantile(0.025, k - 1)); // Cochrane v6.5
      const lo1 = r.theta - tcrit1 * piSe, hi1 = r.theta + tcrit1 * piSe;
      if (lo1 <= newTheta && newTheta <= hi1) piCovKm1++;
      piTotal++;
    }
  }

  const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
  const bias = errs.length ? mean(errs) : NaN;
  const rmse = errs.length ? Math.sqrt(mean(errs.map((e) => e * e))) : NaN;
  return {
    n: nOk,
    coverage: nOk ? covered / nOk : NaN,
    bias, rmse,
    meanWidth: nOk ? widthSum / nOk : NaN,
    piCovKm2: piTotal ? piCovKm2 / piTotal : NaN,
    piCovKm1: piTotal ? piCovKm1 / piTotal : NaN,
    piTotal,
  };
}

const CONFIGS = [
  ["none", 5, 0.05],
  ["none", 5, 0.15],
  ["none", 10, 0.05],
  ["none", 10, 0.15],
  ["step_strong", 8, 0.10],
  ["copas_strong", 8, 0.10],
];

export function grid(nIter = 2000, seed0 = 12345) {
  const mu = 0.30;
  const out = {};
  let seed = seed0;
  for (const [scen, k, tau2] of CONFIGS) {
    for (const ms of METHODS) {
      seed++;
      out[`${scen}|${k}|${tau2}|${ms.name}`] = runMethod(mu, tau2, k, scen, nIter, seed, ms);
    }
  }
  return { out, mu, configs: CONFIGS, methods: METHODS.map((m) => m.name) };
}

function f(x, w = 7, p = 3) {
  if (!isFinite(x)) return "  n/a  ".padStart(w);
  return x.toFixed(p).padStart(w);
}

function main() {
  const nIter = process.argv[2] ? parseInt(process.argv[2], 10) : 2000;
  const { out, mu } = grid(nIter);

  console.log(`# poolingsuite truth-recovery — coverage of true mu=${mu}, ${nIter} iters/cell\n`);
  console.log(
    "scenario".padEnd(14) + "k".padStart(3) + "tau2".padStart(7) + "  " +
    "method".padEnd(11) + "cover".padStart(8) + "bias".padStart(9) +
    "rmse".padStart(8) + "width".padStart(8));
  console.log("-".repeat(76));
  let lastCfg = null;
  for (const [scen, k, tau2] of CONFIGS) {
    const cfg = `${scen}|${k}|${tau2}`;
    if (lastCfg && cfg !== lastCfg) console.log("");
    lastCfg = cfg;
    for (const mname of ["DL+Wald", "REML+HKSJ", "PM+HKSJ"]) {
      const r = out[`${scen}|${k}|${tau2}|${mname}`];
      console.log(
        scen.padEnd(14) + String(k).padStart(3) + tau2.toFixed(2).padStart(7) + "  " +
        mname.padEnd(11) + f(r.coverage) + f(r.bias, 9, 4) + f(r.rmse) + f(r.meanWidth));
    }
  }

  console.log("\n\n# Prediction-interval df: coverage of a NEW study's true effect");
  console.log(
    "scenario".padEnd(14) + "k".padStart(3) + "tau2".padStart(7) + "  " +
    "method".padEnd(11) + "PI t_(k-2)*".padStart(13) + "PI t_(k-1)".padStart(13) +
    "   (* = shipped)");
  console.log("-".repeat(76));
  for (const [scen, k, tau2] of CONFIGS) {
    if (scen !== "none") continue;
    const r = out[`${scen}|${k}|${tau2}|REML+HKSJ`];
    console.log(
      scen.padEnd(14) + String(k).padStart(3) + tau2.toFixed(2).padStart(7) + "  " +
      "REML+HKSJ".padEnd(11) + f(r.piCovKm2, 13) + f(r.piCovKm1, 13));
  }
}

if (import.meta.url === `file://${process.argv[1]}` ||
    process.argv[1]?.endsWith("harness.mjs")) {
  main();
}
