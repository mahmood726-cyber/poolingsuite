Mahmood Ahmad
Tahir Heart Institute
author@example.com

Pooling Suite: Side-by-Side Comparison of Fifteen Heterogeneity Estimators in the Browser

Choice of heterogeneity estimator and confidence interval method can materially change meta-analytic conclusions, yet most software offers only DerSimonian-Laird with Wald-type intervals. Pooling Suite is a browser engine implementing 15 tau-squared estimators including DerSimonian-Laird, REML, maximum likelihood, Paule-Mandel, empirical Bayes, Sidik-Jonkman, Hunter-Schmidt, and Hedges, with three CI methods: Wald, Hartung-Knapp-Sidik-Jonkman, and t-distribution. The tool produces a comparison table alongside forest plots, Baujat influence plots, GOSH subset analysis, leave-one-out diagnostics, and Cook's distance. On the canonical BCG vaccine dataset of 13 studies, tau-squared ranged from 0.30 under maximum likelihood to 0.51 under Hunter-Schmidt, pooled log-risk-ratios ranged from negative 0.71 to negative 0.74, and HKSJ intervals were 40-60% wider than Wald. Leave-one-out analysis consistently identified the Madras and Chingleput trials as dominant heterogeneity sources across all 15 estimators. All estimators were validated against R metafor through 25 Selenium tests confirming numerical agreement. Profile likelihood and Kenward-Roger corrections are not yet implemented, limiting coverage accuracy for very small meta-analyses.

Outside Notes

Type: methods
Primary estimand: Pooled effect with tau-squared comparison across estimators
App: Pooling Suite v1.0 (1,840 lines)
Data: BCG vaccine (13 studies), magnesium-for-MI (8 studies)
Code: https://github.com/mahmood726-cyber/poolingsuite
Version: 1.0
Certainty: not stated
Validation: PASS (25 Selenium tests vs R metafor)

References

1. Veroniki AA, Jackson D, Viechtbauer W, et al. Methods to estimate the between-study variance and its uncertainty in meta-analysis. Res Synth Methods. 2016;7(1):55-79.
2. Langan D, Higgins JPT, Jackson D, et al. A comparison of heterogeneity variance estimators in simulated random-effects meta-analyses. Res Synth Methods. 2019;10(1):83-98.
3. IntHout J, Ioannidis JPA, Borm GF. The Hartung-Knapp-Sidik-Jonkman method for random effects meta-analysis is straightforward and considerably outperforms the standard DerSimonian-Laird method. BMC Med Res Methodol. 2014;14:25.

AI Disclosure

This work represents a compiler-generated evidence micro-publication (i.e., a structured, pipeline-based synthesis output). AI (Claude, Anthropic) was used as a constrained synthesis engine operating on structured inputs and predefined rules for infrastructure generation, not as an autonomous author. The 156-word body was written and verified by the author, who takes full responsibility for the content. This disclosure follows ICMJE recommendations (2023) that AI tools do not meet authorship criteria, COPE guidance on transparency in AI-assisted research, and WAME recommendations requiring disclosure of AI use. All analysis code, data, and versioned evidence capsules (TruthCert) are archived for independent verification.
