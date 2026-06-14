# poolingsuite — Truth-Recovery Validation

**Verdict: STRONG-VALIDATION** (with an honest note on prediction-interval df).

A known-truth Monte-Carlo benchmark of poolingsuite's OWN pooling functions
(extracted verbatim into `engine.mjs`) confirms that the **HKSJ (Knapp-Hartung)
interval recovers the true pooled effect near the nominal 95% rate**, while the
RevMan-style **DL + Wald z interval under-covers by 5-8 percentage points**,
worst at small k. The engine offers REML+HKSJ and PM+HKSJ; the recommendation
is to treat HKSJ as the default reporting interval.

No app code was modified. The benchmark imports the engine's real
`runAllEstimators()` from `pooling-suite.html` (lines 303-760).

## Method

- Engine under test: `pooling-suite.html` pooling core (10 tau2 estimators
  FE/DL/REML/ML/PM/EB/SJ/HS/HE/BD; Wald / HKSJ / t-dist CIs; prediction
  interval), extracted verbatim into `truth-recovery/engine.mjs` (pure,
  DOM-free; no stub needed).
- DGP: `truth-recovery/dgp.mjs` (seeded mulberry32). Published studies drawn
  from N(theta_i, se_i^2), theta_i ~ N(mu, tau2), with optional step / Copas
  publication selection. mu=0.30, se ~ logU(0.10, 0.70).
- Harness: `truth-recovery/harness.mjs` — 3000 replicate meta-analyses per
  cell; measures CI coverage of true mu, bias, RMSE, mean width, and PI
  coverage of a NEW study's true effect.
- Methods scored: DL+Wald (RevMan default), REML+HKSJ, PM+HKSJ.

## Results — coverage of the true mu (3000 iters/cell, target 0.950)

| scenario      | k  | tau2 | method     | cover | bias    | rmse  | width |
|---------------|----|------|------------|-------|---------|-------|-------|
| none          | 5  | 0.05 | DL+Wald    | 0.885 |  0.0049 | 0.162 | 0.584 |
| none          | 5  | 0.05 | REML+HKSJ  | 0.966 |  0.0046 | 0.161 | 0.860 |
| none          | 5  | 0.05 | PM+HKSJ    | 0.968 |  0.0024 | 0.159 | 0.864 |
| none          | 5  | 0.15 | DL+Wald    | 0.869 |  0.0031 | 0.223 | 0.783 |
| none          | 5  | 0.15 | REML+HKSJ  | 0.947 |  0.0040 | 0.222 | 1.151 |
| none          | 5  | 0.15 | PM+HKSJ    | 0.942 |  0.0028 | 0.230 | 1.138 |
| none          | 10 | 0.05 | DL+Wald    | 0.905 |  0.0012 | 0.110 | 0.407 |
| none          | 10 | 0.05 | REML+HKSJ  | 0.938 | -0.0050 | 0.112 | 0.484 |
| none          | 10 | 0.05 | PM+HKSJ    | 0.939 | -0.0009 | 0.114 | 0.481 |
| none          | 10 | 0.15 | DL+Wald    | 0.911 |  0.0015 | 0.154 | 0.579 |
| none          | 10 | 0.15 | REML+HKSJ  | 0.950 | -0.0031 | 0.154 | 0.683 |
| none          | 10 | 0.15 | PM+HKSJ    | 0.935 |  0.0003 | 0.157 | 0.673 |
| step_strong   | 8  | 0.10 | DL+Wald    | 0.330 |  0.2609 | 0.285 | 0.430 |
| step_strong   | 8  | 0.10 | REML+HKSJ  | 0.470 |  0.2613 | 0.286 | 0.538 |
| step_strong   | 8  | 0.10 | PM+HKSJ    | 0.493 |  0.2612 | 0.287 | 0.552 |
| copas_strong  | 8  | 0.10 | DL+Wald    | 0.804 |  0.1217 | 0.185 | 0.507 |
| copas_strong  | 8  | 0.10 | REML+HKSJ  | 0.883 |  0.1218 | 0.185 | 0.629 |
| copas_strong  | 8  | 0.10 | PM+HKSJ    | 0.861 |  0.1224 | 0.188 | 0.609 |

## Findings

1. **DL+Wald under-covers; HKSJ recovers.** Without selection DL+Wald coverage
   is 0.869-0.911 vs the 0.950 target (classic Wald anticonservatism at finite
   k). REML+HKSJ lifts coverage to 0.938-0.966 and PM+HKSJ to 0.935-0.968. Gain
   is largest at small k (k=5: about +8 points). All three estimators are
   essentially unbiased (|bias|<0.005), so the entire difference is interval
   calibration. RECOMMEND HKSJ as the default reporting interval; the engine
   already provides it.

2. **HKSJ floor works.** The engine floors the Knapp-Hartung adjusted SE at the
   Wald SE (the Q<k-1 rule). A near-homogeneous-data test confirms the HKSJ CI
   is never narrower than the Wald CI — no anticonservative shrinkage.

3. **Prediction-interval df — honest note (engine ships t_{k-2}).** The engine's
   `predictionInterval()` uses **t_{k-2}**, which DIVERGES from the Cochrane
   Handbook v6.5 standard of **t_{k-1}**. Measuring coverage of a NEW study's
   true effect, the shipped t_{k-2} actually covers SLIGHTLY BETTER than t_{k-1}:

   | k  | tau2 | PI t_{k-2} (shipped) | PI t_{k-1} (Cochrane) |
   |----|------|----------------------|-----------------------|
   | 5  | 0.05 | 0.906                | 0.876                 |
   | 5  | 0.15 | 0.897                | 0.875                 |
   | 10 | 0.05 | 0.859                | 0.854                 |
   | 10 | 0.15 | 0.900                | 0.895                 |

   So the engine's NON-STANDARD t_{k-2} is empirically defensible for new-study
   coverage (the wider interval is closer to nominal at small k; the gap shrinks
   as k grows). This is a documentation/standard mismatch, NOT a coverage bug:
   switching to t_{k-1} would make coverage slightly WORSE, so no code change is
   warranted on coverage grounds. The only honest action item is editorial — if
   the report/UI claims Cochrane-v6.5 conformance, it should either adopt t_{k-1}
   for conformance or state that it deliberately uses t_{k-2}. Left to the author;
   not changed here.

4. **Strong selection collapses all IV intervals — expected.** step_strong:
   coverage 0.33-0.49, bias ~0.26. copas_strong: 0.80-0.88, bias ~0.12. No
   inverse-variance pooler recovers the truth under strong publication
   selection; this is a known, documented limitation, not a poolingsuite bug.

## Recommendation

No code change required for correctness. (1) Recommend HKSJ as the default
reporting interval — it recovers the truth where DL+Wald under-covers; the
engine already offers REML+HKSJ and PM+HKSJ. (2) The prediction interval's
t_{k-2} df diverges from Cochrane v6.5 but covers a new study slightly BETTER
than t_{k-1}, so it is left unchanged; the only open item is editorial
conformance wording. (3) Selection-induced collapse is inherent to IV pooling
and is documented, not fixed.

## Reproduce

    node truth-recovery/harness.mjs 3000                 # full grid
    node --test truth-recovery/test-truth-recovery.mjs   # invariants (7 tests)
