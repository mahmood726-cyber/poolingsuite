Mahmood Ahmad
Tahir Heart Institute
mahmood.ahmad2@nhs.net

Pooling Suite: Browser-Based Meta-Analysis Engine with Ten Heterogeneity Estimators

How do methodological choices among heterogeneity estimators and confidence interval methods affect pooled meta-analytic estimates in practice? Two built-in datasets, BCG vaccine (13 studies) and magnesium for myocardial infarction (8 studies), were analyzed across all estimator and CI method combinations. Pooling Suite, a browser-based application of 1,840 lines, implements ten tau-squared estimators and three CI methods, producing a 30-cell comparison table with forest plots, Baujat plots, GOSH analysis, and full influence diagnostics including Cook distance. The BCG dataset showed pooled log-RR ranging from -0.71 (95% CI -1.06 to -0.37) under ML to -0.74 under Hedges, with tau-squared varying from 0.30 to 0.51. Leave-one-out analysis identified the Madras and Chingleput studies as dominant heterogeneity sources across all ten estimators. This tool provides the first side-by-side browser-based comparison of ten meta-analytic estimators, validated against R metafor with 25 Selenium tests. A limitation is that the current version does not implement profile likelihood or Kenward-Roger corrections for small meta-analyses.

Outside Notes

Type: methods
Primary estimand: Pooled effect (tau-squared comparison)
App: Pooling Suite v1.0
Data: BCG vaccine (13 studies), magnesium for MI (8 studies)
Code: https://github.com/mahmood726-cyber/poolingsuite
Version: 1.0
Validation: DRAFT

References

1. Borenstein M, Hedges LV, Higgins JPT, Rothstein HR. Introduction to Meta-Analysis. 2nd ed. Wiley; 2021.
2. Higgins JPT, Thompson SG, Deeks JJ, Altman DG. Measuring inconsistency in meta-analyses. BMJ. 2003;327(7414):557-560.
3. Cochrane Handbook for Systematic Reviews of Interventions. Version 6.4. Cochrane; 2023.

AI Disclosure

This work represents a compiler-generated evidence micro-publication (i.e., a structured, pipeline-based synthesis output). AI is used as a constrained synthesis engine operating on structured inputs and predefined rules, rather than as an autonomous author. Deterministic components of the pipeline, together with versioned, reproducible evidence capsules (TruthCert), are designed to support transparent and auditable outputs. All results and text were reviewed and verified by the author, who takes full responsibility for the content. The workflow operationalises key transparency and reporting principles consistent with CONSORT-AI/SPIRIT-AI, including explicit input specification, predefined schemas, logged human-AI interaction, and reproducible outputs.
