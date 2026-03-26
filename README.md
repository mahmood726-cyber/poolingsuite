# Pooling Suite

Comprehensive meta-analysis pooling engine with 10 tau-squared estimators, 3 CI methods, and full influence diagnostics.

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

## Overview

Pooling Suite implements 10 between-study heterogeneity (tau-squared) estimators and 3 confidence interval approaches in a single browser-based tool, providing a side-by-side comparison of how methodological choices affect pooled estimates. It includes forest plots, leave-one-out analysis, Baujat plots, GOSH (Graphical Overview of Study Heterogeneity) plots, and a full suite of influence diagnostics (studentized residuals, hat values, Cook's distance, DFFITS, covariance ratio). All computations run client-side with no server dependencies.

## Features

- 10 tau-squared estimators: Fixed-Effect (FE), DerSimonian-Laird (DL), Restricted Maximum Likelihood (REML), Maximum Likelihood (ML), Paule-Mandel (PM), Empirical Bayes (Morris), Sidik-Jonkman (SJ), Hunter-Schmidt (HS), Hedges (HE), Bowden-Dudbridge (BD)
- 3 confidence interval methods: Wald (z-based), Hartung-Knapp-Sidik-Jonkman (HKSJ, t-based with adjusted SE), Knapp-Riliet (t-distribution)
- Full comparison table: tau-squared, I-squared, H-squared, pooled theta, SE, CIs, prediction intervals, Q-statistic for all 10 x 3 combinations
- Forest plot with selectable reference estimator for study weights
- Tau-squared bar chart comparing all estimators
- Pooled estimate chart comparing all method x CI combinations
- Leave-one-out sensitivity analysis
- Baujat plot (contribution to overall heterogeneity vs. influence on pooled result)
- GOSH plot with random subset sampling for large k
- Influence diagnostics table: studentized residuals, hat values, Cook's distance, DFFITS, covariance ratio
- Support for 7 effect types: Generic (pre-computed), log-OR, log-RR, log-HR, MD, SMD, Fisher's z
- Auto-generated methods text and equivalent R code (metafor)
- CSV import/export, JSON export
- MAIF (Meta-Analysis Interchange Format) import/export for cross-tool data flow
- Dark mode and print-optimized layout

## Quick Start

1. Download `pooling-suite.html`
2. Open in any modern browser
3. No installation, no dependencies, works offline

## Built-in Examples

- **BCG Vaccine**: 13 studies, log-RR (classic heterogeneous dataset with outliers)
- **Magnesium for MI**: 8 studies (includes large ISIS-4 trial, illustrating small-study effects)

## Methods

| Estimator | Description |
|-----------|-------------|
| FE | Fixed-effect inverse-variance weighted |
| DL | DerSimonian-Laird (moment-based) |
| REML | Restricted maximum likelihood (Fisher scoring) |
| ML | Maximum likelihood (Fisher scoring) |
| PM | Paule-Mandel (iterative, generalized Q) |
| EB | Empirical Bayes / Morris estimator |
| SJ | Sidik-Jonkman (iterative) |
| HS | Hunter-Schmidt |
| HE | Hedges (unweighted) |
| BD | Bowden-Dudbridge |

CI methods: Wald uses z-distribution; HKSJ and Knapp-Riliet use t-distribution with k-1 degrees of freedom and adjusted standard errors.

## Screenshots

> Screenshots can be added by opening the tool and using browser screenshot.

## Validation

- 25/25 Selenium tests pass
- All 10 estimators cross-validated against the R metafor package (Viechtbauer 2010)

## Export

- CSV (study data, all estimator results)
- JSON (full analysis output)
- R code (metafor equivalent)
- Methods text (clipboard, manuscript-ready)
- MAIF (Meta-Analysis Interchange Format) for cross-tool data flow
- Print report

## Citation

If you use this tool, please cite:

> Ahmad M. Pooling Suite: A comprehensive browser-based meta-analysis pooling engine with 10 estimators and influence diagnostics. 2026. Available at: https://github.com/mahmood726-cyber/pooling-suite

## Author

**Mahmood Ahmad**
Royal Free Hospital, London, United Kingdom
ORCID: [0009-0003-7781-4478](https://orcid.org/0009-0003-7781-4478)

## License

MIT
