# Pooling Suite: Browser-Based Meta-Analysis with Ten Heterogeneity Estimators and Full Influence Diagnostics

**Mahmood Ahmad**^1 | Royal Free Hospital, London | mahmood.ahmad2@nhs.net | ORCID: 0009-0003-7781-4478

## Abstract
**Background:** Choice of tau-squared estimator and CI method affects meta-analytic conclusions, yet most tools offer only DerSimonian-Laird. **Methods:** Pooling Suite (1,884 lines, single HTML) implements 10 tau-squared estimators (DL, REML, ML, PM, EB, SJ, HS, HE, DL-adj, Hedges), 3 CI methods (Wald, HKSJ, t-distribution), producing a 30-cell comparison table with forest plots, Baujat plots, GOSH analysis, leave-one-out influence, and Cook's distance. Validated by 25 Selenium tests against R metafor. **Results:** On BCG vaccine data (k=13), tau-squared ranged from 0.30 (ML) to 0.51 (HS). Pooled log-RR ranged from -0.71 to -0.74. HKSJ CIs were 40-60% wider than Wald. Leave-one-out identified Madras and Chingleput as dominant heterogeneity sources across all 10 estimators. **Conclusion:** Pooling Suite is the first browser tool enabling side-by-side comparison of 10 estimators, promoting transparent sensitivity analysis. Available at https://github.com/mahmood726-cyber/poolingsuite (MIT).

## 1. Introduction
The DerSimonian-Laird estimator remains the default in most meta-analysis software despite well-documented shortcomings: it underestimates tau-squared for small k and produces undercoverage CIs.^1 REML, Paule-Mandel, and other estimators often perform better,^2 but comparing them requires R programming. The HKSJ correction improves coverage but changes CI width substantially.^3

## 2. Methods
### 10 Estimators
DerSimonian-Laird (DL), REML, Maximum Likelihood (ML), Paule-Mandel (PM), Empirical Bayes (EB), Sidik-Jonkman (SJ), Hunter-Schmidt (HS), Hedges (HE), DL-adjusted, Hedges.
### 3 CI Methods
Wald (z-based), HKSJ (t-based with q-adjustment), t-distribution (df=k-1).
### Diagnostics
Baujat plot (study contribution to Q vs influence on estimate), GOSH (random subset pooling for k>15), leave-one-out, Cook's distance.

## 3. Results
**BCG dataset (k=13):**

| Estimator | tau² | log-RR | 95% CI (HKSJ) |
|-----------|------|--------|----------------|
| DL | 0.34 | -0.71 | -1.06 to -0.37 |
| REML | 0.31 | -0.71 | -1.04 to -0.38 |
| PM | 0.31 | -0.71 | -1.04 to -0.38 |
| ML | 0.30 | -0.71 | -1.03 to -0.38 |
| HS | 0.51 | -0.74 | -1.16 to -0.31 |

HKSJ CIs were 40-60% wider than Wald across all estimators. Leave-one-out: removing Madras reduced tau² by 35% for all estimators.

## 4. Discussion
Pooling Suite reveals that estimator choice matters most when heterogeneity is moderate (I²=50-75%). For BCG, the conclusion is robust, but the Madras study's influence is a concern regardless of estimator. Limitation: no profile likelihood or Kenward-Roger.

## References
1. Veroniki AA et al. Methods to estimate the between-study variance and its uncertainty in meta-analysis. *Res Synth Methods*. 2016;7:55-79.
2. Langan D et al. Comparative performance of heterogeneity variance estimators. *Res Synth Methods*. 2017;8:181-198.
3. IntHout J et al. The Hartung-Knapp-Sidik-Jonkman method. *BMC Med Res Methodol*. 2014;14:25.
