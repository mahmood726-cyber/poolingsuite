// test-truth-recovery.mjs — assert the measured truth-recovery invariants.
//
// Run:  node --test truth-recovery/test-truth-recovery.mjs
//
// Locks in the honest findings from REPORT.md so a future engine change that
// breaks them is caught. Monte-Carlo tolerances are loose (house rule:
// coverage sims use ~0.03-0.05 slack, never tight point asserts).

import { test } from "node:test";
import assert from "node:assert/strict";
import { grid } from "./harness.mjs";
import { runAllEstimators, predictionInterval, tQuantile } from "./engine.mjs";

const N = 3000;
const G = grid(N, 4242).out;
const at = (scen, k, tau2, m) => G[`${scen}|${k}|${tau2}|${m}`];

test("DL+Wald under-covers the true mu at small k", () => {
  const r = at("none", 5, 0.05, "DL+Wald");
  assert.ok(r.coverage < 0.92,
    `DL+Wald should under-cover at k=5, got ${r.coverage.toFixed(3)}`);
});

test("REML+HKSJ recovers the true mu near nominal and beats DL+Wald", () => {
  const reml = at("none", 5, 0.05, "REML+HKSJ");
  const dl = at("none", 5, 0.05, "DL+Wald");
  assert.ok(reml.coverage > 0.92,
    `REML+HKSJ should be near-nominal at k=5, got ${reml.coverage.toFixed(3)}`);
  assert.ok(reml.coverage > dl.coverage,
    "REML+HKSJ should out-cover DL+Wald under heterogeneity");
});

test("HKSJ-over-Wald coverage gain at small k is material (>= 3 points)", () => {
  const reml = at("none", 5, 0.05, "REML+HKSJ");
  const dl = at("none", 5, 0.05, "DL+Wald");
  assert.ok(reml.coverage - dl.coverage >= 0.03,
    `HKSJ gain too small: ${(reml.coverage - dl.coverage).toFixed(3)}`);
});

test("estimators are ~unbiased without publication selection", () => {
  for (const m of ["DL+Wald", "REML+HKSJ", "PM+HKSJ"]) {
    const r = at("none", 10, 0.15, m);
    assert.ok(Math.abs(r.bias) < 0.02,
      `${m} bias should be ~0 w/o selection, got ${r.bias.toFixed(4)}`);
  }
});

test("strong step selection collapses coverage and biases mu upward", () => {
  const r = at("step_strong", 8, 0.10, "REML+HKSJ");
  assert.ok(r.coverage < 0.70,
    `strong selection must collapse coverage, got ${r.coverage.toFixed(3)}`);
  assert.ok(r.bias > 0.10, "strong step selection should bias mu upward");
});

test("HKSJ floor: HKSJ CI is never narrower than the Wald CI", () => {
  // On a near-homogeneous dataset (Q < k-1) HKSJ would otherwise shrink; the
  // engine's floor must prevent that.
  const yi = [0.20, 0.21, 0.19, 0.205, 0.195];
  const vi = [0.05, 0.05, 0.05, 0.05, 0.05];
  const r = runAllEstimators(yi, vi).find((x) => x.method === "REML");
  const wWidth = r.waldCI[1] - r.waldCI[0];
  const hWidth = r.hksjCI[1] - r.hksjCI[0];
  assert.ok(hWidth >= wWidth - 1e-9,
    `HKSJ must not shrink below Wald: hksj=${hWidth.toFixed(4)} wald=${wWidth.toFixed(4)}`);
});

test("shipped PI uses t_{k-2} (documented divergence from Cochrane t_{k-1})", () => {
  // Guard the engine's actual df choice so the REPORT's PI finding stays valid.
  const theta = 0.3, tau2 = 0.05, se = 0.1, k = 6;
  const pi = predictionInterval(theta, tau2, se, k);
  const piSe = Math.sqrt(tau2 + se * se);
  const tk2 = Math.abs(tQuantile(0.025, k - 2));
  const expectedHi = theta + tk2 * piSe;
  assert.ok(Math.abs(pi[1] - expectedHi) < 1e-9,
    `engine PI should use t_{k-2}; got hi=${pi[1].toFixed(5)} expected=${expectedHi.toFixed(5)}`);
});
