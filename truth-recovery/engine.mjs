// engine.mjs — metaforge poolingsuite pooling functions, EXTRACTED VERBATIM
// from pooling-suite.html lines 303-760 via sed. NOT modified. Additive only.
// These are pure, DOM-free statistics functions (no document/window access).

function escapeHtml(s) {
  if (s == null) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function csvSafe(s) {
  if (s == null) return '';
  s = String(s);
  if (/^[=+@\t\r]/.test(s)) s = "'" + s;
  if (s.indexOf(',') >= 0 || s.indexOf('"') >= 0 || s.indexOf('\n') >= 0) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

/* ---------- Utility: formatNum ---------- */
function fmt(x, d) {
  if (x == null || !isFinite(x)) return '—';
  d = d ?? 4;
  return x.toFixed(d);
}
function fmt3(x) { return fmt(x, 3); }
function fmt2(x) { return fmt(x, 2); }

/* ---------- Seeded PRNG: xoshiro128** ---------- */
function xoshiro128ss(a, b, c, d) {
  return function() {
    var t = b << 9, r = a * 5; r = (r << 7 | r >>> 25) * 9;
    c ^= a; d ^= b; b ^= c; a ^= d; c ^= t;
    d = d << 11 | d >>> 21;
    return (r >>> 0) / 4294967296;
  };
}
function seedPRNG(seed) {
  // splitmix32 to derive 4 state values
  function sm(s) { s |= 0; s = s + 0x9e3779b9 | 0; var t = s ^ s >>> 16; t = Math.imul(t, 0x21f0aaad); t = t ^ t >>> 15; t = Math.imul(t, 0x735a2d97); return (t ^ t >>> 15) >>> 0; }
  var s = seed | 0;
  return xoshiro128ss(sm(s), sm(s + 1), sm(s + 2), sm(s + 3));
}

/* ---------- Statistical helpers ---------- */
function normalCDF(x) {
  // Abramowitz-Stegun approximation
  var a1=0.254829592, a2=-0.284496736, a3=1.421413741, a4=-1.453152027, a5=1.061405429, p=0.3275911;
  var sign = x < 0 ? -1 : 1; x = Math.abs(x) / Math.SQRT2;
  var t = 1 / (1 + p * x);
  var y = 1 - (((((a5*t + a4)*t) + a3)*t + a2)*t + a1)*t * Math.exp(-x*x);
  return 0.5 * (1 + sign * y);
}
function normalQuantile(p) {
  // Rational approximation (Beasley-Springer-Moro)
  if (p <= 0) return -Infinity; if (p >= 1) return Infinity;
  if (p === 0.5) return 0;
  var r, x;
  if (p < 0.5) { r = p; } else { r = 1 - p; }
  r = Math.sqrt(-2 * Math.log(r));
  // Coefficients
  var c0=2.515517, c1=0.802853, c2=0.010328, d1=1.432788, d2=0.189269, d3=0.001308;
  x = r - (c0 + c1*r + c2*r*r) / (1 + d1*r + d2*r*r + d3*r*r*r);
  return p < 0.5 ? -x : x;
}

// Chi-squared CDF via regularized incomplete gamma (series expansion)
function gammainc(a, x) {
  // Lower regularized incomplete gamma P(a,x) via series
  if (x < 0) return 0;
  if (x === 0) return 0;
  var sum = 1/a, term = 1/a;
  for (var n = 1; n < 200; n++) {
    term *= x / (a + n);
    sum += term;
    if (Math.abs(term) < 1e-14 * Math.abs(sum)) break;
  }
  return sum * Math.exp(-x + a * Math.log(x) - lgamma(a));
}
function lgamma(x) {
  // Lanczos approximation
  var g = 7, C = [0.99999999999980993,676.5203681218851,-1259.1392167224028,771.32342877765313,-176.61502916214059,12.507343278686905,-0.13857109526572012,9.9843695780195716e-6,1.5056327351493116e-7];
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - lgamma(1 - x);
  x -= 1; var a = C[0]; var t = x + g + 0.5;
  for (var i = 1; i < g + 2; i++) a += C[i] / (x + i);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}
function chi2CDF(x, df) {
  if (x <= 0) return 0;
  return gammainc(df / 2, x / 2);
}
function chi2Quantile(p, df) {
  // Wilson-Hilferty approximation + Newton refinement
  if (df <= 0) return 0;
  var z = normalQuantile(p);
  var x = df * Math.pow(1 - 2/(9*df) + z*Math.sqrt(2/(9*df)), 3);
  if (x < 0.01) x = 0.01;
  // Newton steps
  for (var i = 0; i < 20; i++) {
    var cp = chi2CDF(x, df);
    var pdf = Math.exp(-x/2 + (df/2-1)*Math.log(x/2) - lgamma(df/2)) / 2;
    if (pdf < 1e-300) break;
    var dx = (cp - p) / pdf;
    x = Math.max(0.001, x - dx);
    if (Math.abs(dx) < 1e-10) break;
  }
  return x;
}

// t-distribution quantile via Newton on betainc
function tQuantile(p, df) {
  if (df <= 0) return NaN;
  if (df > 300) return normalQuantile(p); // approximate
  // Use approximation: Abramowitz & Stegun 26.7.5
  var z = normalQuantile(p);
  var g1 = (z*z*z + z) / 4;
  var g2 = (5*z*z*z*z*z + 16*z*z*z + 3*z) / 96;
  var g3 = (3*z*z*z*z*z*z*z + 19*z*z*z*z*z + 17*z*z*z - 15*z) / 384;
  var g4 = (79*Math.pow(z,9) + 776*Math.pow(z,7) + 1482*Math.pow(z,5) - 1920*z*z*z - 945*z) / 92160;
  return z + g1/df + g2/(df*df) + g3/(df*df*df) + g4/(df*df*df*df);
}

/* ---------- Core: Fixed-effect pooling ---------- */
function fePool(yi, vi) {
  var k = yi.length;
  var w = vi.map(function(v){ return 1/v; });
  var sumW = w.reduce(function(a,b){ return a+b; }, 0);
  var theta = w.reduce(function(a,b,i){ return a + b*yi[i]; }, 0) / sumW;
  var se = Math.sqrt(1 / sumW);
  var Q = w.reduce(function(a,b,i){ return a + b * Math.pow(yi[i] - theta, 2); }, 0);
  return { theta: theta, se: se, w: w, sumW: sumW, Q: Q, k: k };
}

/* ---------- Compute weights & pooled for given tau2 ---------- */
function rePool(yi, vi, tau2) {
  var k = yi.length;
  var ws = vi.map(function(v){ return 1/(v + tau2); });
  var sumWs = ws.reduce(function(a,b){ return a+b; }, 0);
  var theta = ws.reduce(function(a,b,i){ return a + b*yi[i]; }, 0) / sumWs;
  var se = Math.sqrt(1 / sumWs);
  // Q* for this tau2
  var Qs = ws.reduce(function(a,b,i){ return a + b * Math.pow(yi[i] - theta, 2); }, 0);
  return { theta: theta, se: se, ws: ws, sumWs: sumWs, Qs: Qs, k: k, tau2: tau2 };
}

/* ---------- Tau2 Estimators ---------- */
var ESTIMATORS = {};

// 1. FE (Fixed Effect) — tau2 = 0
ESTIMATORS.FE = function(yi, vi) {
  return { tau2: 0, method: 'FE', fullName: 'Fixed-Effect (Inverse-Variance)' };
};

// 2. DL (DerSimonian-Laird)
ESTIMATORS.DL = function(yi, vi) {
  var fe = fePool(yi, vi);
  var k = yi.length;
  var C = fe.sumW - vi.map(function(v){ return 1/v; }).reduce(function(a,w){ return a + w*w; }, 0) / fe.sumW;
  var tau2 = Math.max(0, (fe.Q - (k - 1)) / C);
  return { tau2: tau2, method: 'DL', fullName: 'DerSimonian-Laird' };
};

// 3. REML (Restricted Maximum Likelihood)
// Fisher scoring on restricted profile log-likelihood.
// Score: s = 0.5 * (sum(w^2*r^2) - trP) where trP = sum(w) - sum(w^2)/sum(w), r_i = yi - theta
// Expected info: I = 0.5 * tr(P^2) = 0.5 * [sum(w^2) - 2*sum(w^3)/sum(w) + sum(w^2)^2/sum(w)^2]
ESTIMATORS.REML = function(yi, vi) {
  var k = yi.length;
  var dlResult = ESTIMATORS.DL(yi, vi);
  var tau2 = dlResult.tau2;
  for (var iter = 0; iter < 100; iter++) {
    var ws = vi.map(function(v){ return 1/(v + tau2); });
    var sumW = ws.reduce(function(a,b){ return a+b; }, 0);
    var theta = ws.reduce(function(a,b,i){ return a + b*yi[i]; }, 0) / sumW;
    var sumW2 = ws.reduce(function(a,w){ return a + w*w; }, 0);
    var sumW3 = ws.reduce(function(a,w){ return a + w*w*w; }, 0);
    // sum(w^2 * r^2) — note: w^2, NOT w like Cochran's Q
    var sumW2r2 = 0;
    for (var i = 0; i < k; i++) {
      sumW2r2 += ws[i] * ws[i] * Math.pow(yi[i] - theta, 2);
    }
    // REML score: 0.5 * (-sum(w) + sum(w^2)/sum(w) + sum(w^2*r^2))
    var score = 0.5 * (-sumW + sumW2 / sumW + sumW2r2);
    // Expected information: 0.5 * tr(P^2)
    var info = 0.5 * (sumW2 - 2 * sumW3 / sumW + sumW2 * sumW2 / (sumW * sumW));
    if (info < 1e-15) break;
    var tau2_new = Math.max(0, tau2 + score / info);
    if (Math.abs(tau2_new - tau2) < 1e-10) { tau2 = tau2_new; break; }
    tau2 = tau2_new;
  }
  return { tau2: tau2, method: 'REML', fullName: 'Restricted Maximum Likelihood' };
};

// 4. ML (Maximum Likelihood)
ESTIMATORS.ML = function(yi, vi) {
  var k = yi.length;
  var dlResult = ESTIMATORS.DL(yi, vi);
  var tau2 = dlResult.tau2;
  for (var iter = 0; iter < 100; iter++) {
    var ws = vi.map(function(v){ return 1/(v + tau2); });
    var sumWs = ws.reduce(function(a,b){ return a+b; }, 0);
    var theta = ws.reduce(function(a,b,i){ return a + b*yi[i]; }, 0) / sumWs;
    var sumWs2 = ws.reduce(function(a,w){ return a + w*w; }, 0);
    // ML EM iteration: tau2_new = sum(ws^2 * ((yi-theta)^2 - vi + tau2)) / sum(ws^2) ... but without REML correction
    // Actually for ML: tau2_new = (1/k) * sum(ws * ((yi-theta)^2 - vi + tau2))... no.
    // ML: use EM
    // tau2_new = tau2 * sum(w^2 * (yi-theta)^2) / sum(w^2)... not quite.
    // Proper ML EM:
    // tau2_new = tau2 + (sum(w^2 * ((yi-theta)^2 - (vi+tau2) + tau2^2*w_i^{-1}... )))
    //
    // Simplest: NR on profile log-likelihood.
    // l_ML(tau2) = -0.5 * [sum(log(vi+tau2)) + sum(ws*(yi-theta)^2)]
    // dl/dtau2 = -0.5 * [sumWs - sum(ws^2*(yi-theta)^2)]
    // d2l/dtau2^2 = 0.5 * [sumWs2 - 2*sum(ws^3*(yi-theta)^2)]
    // Expected info: 0.5 * sumWs2
    //
    // Fisher scoring: tau2_new = tau2 + [-0.5*sumWs + 0.5*sum(ws^2*(yi-theta)^2)] / (0.5*sumWs2)
    var Qs2 = ws.reduce(function(a,w,i){ return a + w*w*Math.pow(yi[i]-theta,2); }, 0);
    var grad_ml = -0.5 * sumWs + 0.5 * Qs2;
    var info_ml = 0.5 * sumWs2;
    var tau2_new = Math.max(0, tau2 + grad_ml / info_ml);
    if (Math.abs(tau2_new - tau2) < 1e-10) { tau2 = tau2_new; break; }
    tau2 = tau2_new;
  }
  return { tau2: tau2, method: 'ML', fullName: 'Maximum Likelihood' };
};

// 5. PM (Paule-Mandel)
ESTIMATORS.PM = function(yi, vi) {
  var k = yi.length;
  if (k < 2) return { tau2: 0, method: 'PM', fullName: 'Paule-Mandel' };
  // Find tau2 such that Q*(tau2) = k-1 via bisection
  var target = k - 1;
  function Qstar(t) {
    var ws = vi.map(function(v){ return 1/(v + t); });
    var sumWs = ws.reduce(function(a,b){ return a+b; }, 0);
    var theta = ws.reduce(function(a,b,i){ return a + b*yi[i]; }, 0) / sumWs;
    return ws.reduce(function(a,b,i){ return a + b * Math.pow(yi[i] - theta, 2); }, 0);
  }
  // Check if Q at tau2=0 is already <= k-1
  var Q0 = Qstar(0);
  if (Q0 <= target) return { tau2: 0, method: 'PM', fullName: 'Paule-Mandel' };
  // Bisection
  var lo = 0, hi = 100;
  // Expand hi if needed
  while (Qstar(hi) > target && hi < 1e10) hi *= 2;
  for (var iter = 0; iter < 200; iter++) {
    var mid = (lo + hi) / 2;
    var Qm = Qstar(mid);
    if (Math.abs(Qm - target) < 1e-10) break;
    if (Qm > target) lo = mid; else hi = mid;
  }
  return { tau2: (lo + hi) / 2, method: 'PM', fullName: 'Paule-Mandel' };
};

// 6. EB (Empirical Bayes / Morris)
ESTIMATORS.EB = function(yi, vi) {
  var k = yi.length;
  var fe = fePool(yi, vi);
  var w = fe.w;
  var sumW = fe.sumW;
  var meanW = sumW / k;
  var sumW2 = w.reduce(function(a,b){ return a + b*b; }, 0);
  // EB: iterative. Start with DL
  var tau2 = ESTIMATORS.DL(yi, vi).tau2;
  for (var iter = 0; iter < 100; iter++) {
    var ws = vi.map(function(v){ return 1/(v + tau2); });
    var sumWs = ws.reduce(function(a,b){ return a+b; }, 0);
    var theta = ws.reduce(function(a,b,i){ return a + b*yi[i]; }, 0) / sumWs;
    // EB update: tau2 = max(0, (Q* - (k-1)) / C*) where C* uses w*
    var Qs = ws.reduce(function(a,b,i){ return a + b * Math.pow(yi[i] - theta, 2); }, 0);
    var sumWs2 = ws.reduce(function(a,b){ return a + b*b; }, 0);
    var Cs = sumWs - sumWs2 / sumWs;
    var tau2_new = Math.max(0, (Qs - (k - 1)) / Cs);
    if (Math.abs(tau2_new - tau2) < 1e-10) { tau2 = tau2_new; break; }
    tau2 = tau2_new;
  }
  return { tau2: tau2, method: 'EB', fullName: 'Empirical Bayes (Morris)' };
};

// 7. SJ (Sidik-Jonkman, 2005, Stat Med 24:3899)
// One-step estimator as implemented in metafor:
// tau2_0 = population variance of yi = sum((yi - ybar)^2) / k
// Then: tau2 = tau2_0 * Q*(tau2_0) / (k - 1)
// where Q*(tau2_0) = sum(w_i * (yi - theta_w)^2), w_i = 1/(vi + tau2_0)
ESTIMATORS.SJ = function(yi, vi) {
  var k = yi.length;
  if (k < 2) return { tau2: 0, method: 'SJ', fullName: 'Sidik-Jonkman' };
  // Step 1: tau2_0 = population variance of yi
  var ybar = yi.reduce(function(a,b){ return a+b; }, 0) / k;
  var tau2_0 = yi.reduce(function(a,y){ return a + Math.pow(y - ybar, 2); }, 0) / k;
  // Step 2: Compute Q* at tau2_0
  var ws = vi.map(function(v){ return 1/(v + tau2_0); });
  var sumWs = ws.reduce(function(a,b){ return a+b; }, 0);
  var theta = ws.reduce(function(a,b,i){ return a + b*yi[i]; }, 0) / sumWs;
  var Qs = ws.reduce(function(a,b,i){ return a + b * Math.pow(yi[i] - theta, 2); }, 0);
  // Step 3: One-step SJ estimate
  var tau2 = Math.max(0, tau2_0 * Qs / (k - 1));
  return { tau2: tau2, method: 'SJ', fullName: 'Sidik-Jonkman' };
};

// 8. HS (Hunter-Schmidt)
// Uses inverse-variance weighted mean and weighted variance.
// tau2 = Q/sum(w) - k/sum(w) = (Q - k) / sum(w)
// where Q = Cochran's Q, w_i = 1/vi (as in metafor)
ESTIMATORS.HS = function(yi, vi) {
  var k = yi.length;
  var fe = fePool(yi, vi);
  var tau2 = Math.max(0, (fe.Q - k) / fe.sumW);
  return { tau2: tau2, method: 'HS', fullName: 'Hunter-Schmidt' };
};

// 9. HE (Hedges)
ESTIMATORS.HE = function(yi, vi) {
  var k = yi.length;
  // Hedges estimator: tau2 = [sum((yi - ybar)^2) - sum(vi*(1 - 1/k))] / (k - 1)
  // where ybar = unweighted mean
  var ybar = yi.reduce(function(a,b){ return a+b; }, 0) / k;
  var SS = yi.reduce(function(a,y){ return a + Math.pow(y - ybar, 2); }, 0);
  var sumVi = vi.reduce(function(a,b){ return a+b; }, 0);
  // HE: tau2 = (SS - (k-1)*vbar_adjusted) / (k-1)
  // More precisely: tau2 = [Q_UW - (k-1)] / C_UW where Q_UW and C_UW use equal weights
  // Q_UW with equal weights w_i = 1: Q = sum((yi-ybar)^2) and the expected value...
  // The Hedges (1983) estimator:
  // tau2 = [sum(yi - ybar)^2 - sum(vi) * (1 - 1/k)] / (k - 1)
  // Wait, more precisely:
  // Q_HE = sum((yi - ybar)^2)  (unweighted)
  // E[Q_HE] = (k-1)*tau2 + sum(vi) - sum(vi)/k + ...
  // Actually Hedges: tau2 = (Q_HE - sum(vi) + sum(vi)/k) / (k-1)
  var tau2 = Math.max(0, (SS - sumVi + sumVi/k) / (k - 1));
  return { tau2: tau2, method: 'HE', fullName: 'Hedges' };
};

// 10. BD (Bowden-Dudbridge iterative moment estimator)
ESTIMATORS.BD = function(yi, vi) {
  var k = yi.length;
  // Bowden et al. (2011): iterative DL that updates weights
  // Start with DL
  var tau2 = ESTIMATORS.DL(yi, vi).tau2;
  for (var iter = 0; iter < 100; iter++) {
    var ws = vi.map(function(v){ return 1/(v + tau2); });
    var sumWs = ws.reduce(function(a,b){ return a+b; }, 0);
    var theta = ws.reduce(function(a,b,i){ return a + b*yi[i]; }, 0) / sumWs;
    var Qs = ws.reduce(function(a,w,i){ return a + w*Math.pow(yi[i]-theta,2); }, 0);
    var sumWs2 = ws.reduce(function(a,w){ return a + w*w; }, 0);
    var Cs = sumWs - sumWs2 / sumWs;
    var tau2_new = Math.max(0, (Qs - (k - 1)) / Cs);
    if (Math.abs(tau2_new - tau2) < 1e-10) { tau2 = tau2_new; break; }
    // BD uses a damped update
    tau2 = 0.5 * tau2 + 0.5 * tau2_new;
  }
  return { tau2: tau2, method: 'BD', fullName: 'Bowden-Dudbridge' };
};

var ESTIMATOR_ORDER = ['FE','DL','REML','ML','PM','EB','SJ','HS','HE','BD'];
var ESTIMATOR_COLORS = {
  FE:'#6366f1', DL:'#2563eb', REML:'#0891b2', ML:'#059669',
  PM:'#d97706', EB:'#dc2626', SJ:'#9333ea', HS:'#e11d48',
  HE:'#0d9488', BD:'#7c3aed'
};

/* ---------- CI methods ---------- */
function waldCI(theta, se) {
  var z = 1.959964;
  return [theta - z * se, theta + z * se];
}
function hksjCI(theta, yi, vi, tau2, k) {
  // HKSJ: use t-distribution with k-1 df, and adjusted SE
  // qhat_HKSJ = sqrt( (1/(k*(k-1))) * sum(ws_i * (yi - theta)^2) )
  // where ws_i = 1/(vi + tau2)
  if (k < 2) return waldCI(theta, Math.sqrt(1 / vi.reduce(function(a,v){ return a + 1/v; }, 0)));
  var ws = vi.map(function(v){ return 1/(v + tau2); });
  var sumWs = ws.reduce(function(a,b){ return a+b; }, 0);
  var Qs = ws.reduce(function(a,w,i){ return a + w * Math.pow(yi[i] - theta, 2); }, 0);
  var seAdj = Math.sqrt(Qs / ((k - 1) * sumWs));
  // Floor correction: if Q < k-1, HKSJ narrows CI below Wald.
  // Enforce seAdj >= waldSE so HKSJ never shrinks below Wald CI.
  var waldSE = Math.sqrt(1 / sumWs);
  seAdj = Math.max(seAdj, waldSE);
  var tcrit = Math.abs(tQuantile(0.025, k - 1));
  return [theta - tcrit * seAdj, theta + tcrit * seAdj];
}
function tdistCI(theta, se, k) {
  if (k < 2) return waldCI(theta, se);
  var tcrit = Math.abs(tQuantile(0.025, k - 1));
  return [theta - tcrit * se, theta + tcrit * se];
}

/* ---------- Prediction interval ---------- */
function predictionInterval(theta, tau2, se, k) {
  if (k < 3) return [NaN, NaN];
  var tcrit = Math.abs(tQuantile(0.025, k - 2));
  var piSe = Math.sqrt(tau2 + se * se);
  return [theta - tcrit * piSe, theta + tcrit * piSe];
}

/* ---------- Q-test p-value ---------- */
function QpValue(Q, k) {
  if (k < 2) return 1;
  return 1 - chi2CDF(Q, k - 1);
}

/* ---------- I², H² ---------- */
function computeI2(Q, k) {
  if (k < 2) return 0;
  return Math.max(0, (Q - (k - 1)) / Q * 100);
}
function computeH2(Q, k) {
  if (k < 2) return 1;
  return Math.max(1, Q / (k - 1));
}

/* ---------- Run ALL estimators ---------- */
function runAllEstimators(yi, vi) {
  var fe = fePool(yi, vi);
  var k = yi.length;
  var results = [];
  ESTIMATOR_ORDER.forEach(function(name) {
    var est = ESTIMATORS[name](yi, vi);
    var re = rePool(yi, vi, est.tau2);
    var wald = waldCI(re.theta, re.se);
    var hksj = hksjCI(re.theta, yi, vi, est.tau2, k);
    var tdist = tdistCI(re.theta, re.se, k);
    var pi = predictionInterval(re.theta, est.tau2, re.se, k);
    results.push({
      method: name,
      fullName: est.fullName,
      tau2: est.tau2,
      I2: computeI2(fe.Q, k),
      H2: computeH2(fe.Q, k),
      theta: re.theta,
      se: re.se,
      waldCI: wald,
      hksjCI: hksj,
      tdistCI: tdist,
      PI: pi,
      Q: fe.Q,
      Qp: QpValue(fe.Q, k),
      weights: re.ws,
      k: k
    });
  });
  // I2 and H2 are actually per-estimator via tau2
  results.forEach(function(r) {
    // Compute I2 from tau2: I2 = tau2 / (tau2 + typical_vi)
    var typicalV = vi.reduce(function(a,b){ return a+b; }, 0) / k;
    r.I2_tau = r.tau2 / (r.tau2 + typicalV) * 100;
    // Or use Q-based for all: I2 = max(0, (Q-(k-1))/Q * 100)
    // Actually, for the estimator-specific I2, use the standard formula:
    // I2 = tau2 / (tau2 + s2) where s2 = (k-1)*sum(w)/(sum(w)^2 - sum(w^2))
    var w = vi.map(function(v){ return 1/v; });
    var sumW = w.reduce(function(a,b){return a+b;},0);
    var sumW2 = w.reduce(function(a,b){return a+b*b;},0);
    var s2_denom = sumW - sumW2/sumW;
    if (s2_denom > 0) {
      var s2 = (k - 1) / s2_denom;
      r.I2_est = r.tau2 / (r.tau2 + s2) * 100;
    } else {
      r.I2_est = 0;
    }
    r.H2_est = r.tau2 > 0 ? 1 + r.tau2 / ((k-1) / (sumW - sumW2/sumW)) : 1;
  });
  return results;
}

export {
  seedPRNG, normalCDF, normalQuantile, chi2CDF, chi2Quantile, tQuantile,
  fePool, rePool, ESTIMATORS, ESTIMATOR_ORDER,
  waldCI, hksjCI, tdistCI, predictionInterval, QpValue, computeI2, computeH2,
  runAllEstimators
};
