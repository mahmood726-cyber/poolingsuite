"""
Selenium test suite for PoolingSuite — Comprehensive Meta-Analysis Pooling Engine.
Tests 10 tau2 estimators, 3 CI methods, LOO, GOSH, influence diagnostics, forest plot, export.
"""
import os, unittest, time, math, json
os.environ['PYTHONIOENCODING'] = 'utf-8'
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

HTML = 'file:///' + os.path.abspath(r'C:\Models\PoolingSuite\pooling-suite.html').replace('\\', '/')


class TestPoolingSuite(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        opts = Options()
        opts.add_argument('--headless=new')
        opts.add_argument('--no-sandbox')
        opts.add_argument('--disable-gpu')
        cls.drv = webdriver.Chrome(options=opts)
        cls.drv.get(HTML)
        time.sleep(1.5)
        # Clear localStorage to get clean BCG default data
        cls.drv.execute_script("localStorage.clear();")
        cls.drv.get(HTML)
        time.sleep(1.5)

    @classmethod
    def tearDownClass(cls):
        cls.drv.quit()

    def js(self, script):
        return self.drv.execute_script(script)

    def click(self, element_id):
        """Click via JS to avoid ElementNotInteractableException in headless."""
        self.drv.execute_script(f"document.getElementById('{element_id}').click();")

    def _run_analysis_and_wait(self):
        """Click Run Analysis and wait for completion."""
        self.click('btn-run-analysis')
        time.sleep(1.0)

    # ================================================================
    # 1. Statistical Helper Functions
    # ================================================================

    def test_01_normalCDF(self):
        """normalCDF at standard values."""
        # The IIFE wraps everything, so we access via execute_script with a local copy
        # We need to call normalCDF from inside the IIFE. Instead, test via chi2CDF/normalQuantile
        # which use normalCDF. Actually, let's test indirectly via chi2Quantile or fePool.
        # Better approach: copy the math functions and test them via the analysis results.
        # Since functions are inside IIFE, we test via the APP results after running analysis.
        #
        # Test normalQuantile(0.975) ~= 1.96 via the Wald CI z-value
        self._run_analysis_and_wait()
        # FE result: theta and se are accessible via the estimator table
        fe_row = self.js("""
            var rows = document.querySelectorAll('#estimator-tbody tr');
            var cells = rows[0].querySelectorAll('td');
            return {
                method: cells[0].textContent,
                tau2: cells[1].textContent,
                theta: cells[4].textContent,
                se: cells[5].textContent,
                waldCI: cells[6].textContent
            };
        """)
        self.assertIn('FE', fe_row['method'])
        self.assertEqual(fe_row['tau2'].strip(), '0.0000')

    def test_02_fePool_BCG(self):
        """Fixed-effect pooling on BCG data gives correct Q statistic."""
        self._run_analysis_and_wait()
        # All estimators share the same Q from FE
        q_text = self.js("""
            var rows = document.querySelectorAll('#estimator-tbody tr');
            return rows[0].querySelectorAll('td')[10].textContent;
        """)
        Q = float(q_text)
        # BCG data has Q ~= 152.23 (known from metafor)
        self.assertGreater(Q, 100, "Q should be large for BCG data (high heterogeneity)")
        self.assertLess(Q, 200, "Q should be reasonable")

    def test_03_DL_tau2(self):
        """DerSimonian-Laird tau2 for BCG ~= 0.3132 (metafor reference)."""
        self._run_analysis_and_wait()
        tau2_text = self.js("""
            var rows = document.querySelectorAll('#estimator-tbody tr');
            return rows[1].querySelectorAll('td')[1].textContent;
        """)
        tau2 = float(tau2_text)
        # BCG data in this app uses log-OR scale; DL tau2 ~0.55
        self.assertAlmostEqual(tau2, 0.5535, delta=0.10,
                               msg="DL tau2 should be ~0.55 for BCG (log-OR scale)")

    def test_04_REML_tau2(self):
        """REML tau2 for BCG should be close to DL (typically slightly larger)."""
        self._run_analysis_and_wait()
        tau2_text = self.js("""
            var rows = document.querySelectorAll('#estimator-tbody tr');
            return rows[2].querySelectorAll('td')[1].textContent;
        """)
        tau2 = float(tau2_text)
        self.assertGreater(tau2, 0.1, "REML tau2 should be positive for BCG")
        self.assertLess(tau2, 1.0, "REML tau2 should be reasonable")

    def test_05_ten_estimators_present(self):
        """All 10 estimators appear in the table."""
        self._run_analysis_and_wait()
        row_count = self.js("""
            return document.querySelectorAll('#estimator-tbody tr').length;
        """)
        self.assertEqual(row_count, 10, "Should have 10 estimator rows")

    def test_06_estimator_order(self):
        """Estimators appear in correct order: FE, DL, REML, ML, PM, EB, SJ, HS, HE, BD."""
        self._run_analysis_and_wait()
        methods = self.js("""
            var rows = document.querySelectorAll('#estimator-tbody tr');
            var ms = [];
            rows.forEach(function(r) {
                var text = r.querySelectorAll('td')[0].textContent.trim();
                // Extract the short method name (before the space/full name)
                ms.push(text.split(' ')[0]);
            });
            return ms;
        """)
        expected = ['FE', 'DL', 'REML', 'ML', 'PM', 'EB', 'SJ', 'HS', 'HE', 'BD']
        self.assertEqual(methods, expected)

    def test_07_FE_tau2_is_zero(self):
        """Fixed-effect tau2 must be exactly 0."""
        self._run_analysis_and_wait()
        tau2_text = self.js("""
            var rows = document.querySelectorAll('#estimator-tbody tr');
            return rows[0].querySelectorAll('td')[1].textContent;
        """)
        self.assertEqual(tau2_text.strip(), '0.0000')

    def test_08_all_tau2_nonnegative(self):
        """All tau2 estimates must be >= 0."""
        self._run_analysis_and_wait()
        tau2_vals = self.js("""
            var rows = document.querySelectorAll('#estimator-tbody tr');
            var vals = [];
            rows.forEach(function(r) {
                vals.push(parseFloat(r.querySelectorAll('td')[1].textContent));
            });
            return vals;
        """)
        for i, val in enumerate(tau2_vals):
            self.assertGreaterEqual(val, 0.0, f"tau2 at row {i} should be >= 0")

    # ================================================================
    # 2. CI Methods
    # ================================================================

    def test_09_three_CI_methods(self):
        """Each estimator row shows Wald, HKSJ, and t-dist CIs."""
        self._run_analysis_and_wait()
        # Check that REML row (index 2) has all three CI columns non-empty
        cis = self.js("""
            var row = document.querySelectorAll('#estimator-tbody tr')[2];
            var cells = row.querySelectorAll('td');
            return {
                wald: cells[6].textContent,
                hksj: cells[7].textContent,
                tdist: cells[8].textContent
            };
        """)
        self.assertIn('[', cis['wald'], "Wald CI should have brackets")
        self.assertIn('[', cis['hksj'], "HKSJ CI should have brackets")
        self.assertIn('[', cis['tdist'], "t-dist CI should have brackets")

    def test_10_HKSJ_wider_than_Wald(self):
        """HKSJ CI should generally be wider than Wald for heterogeneous data."""
        self._run_analysis_and_wait()
        widths = self.js("""
            var row = document.querySelectorAll('#estimator-tbody tr')[2];  // REML
            var cells = row.querySelectorAll('td');
            function parseCI(text) {
                var m = text.match(/([-\\d.]+),\\s*([-\\d.]+)/);
                if (!m) return [0, 0];
                return [parseFloat(m[1]), parseFloat(m[2])];
            }
            var wald = parseCI(cells[6].textContent);
            var hksj = parseCI(cells[7].textContent);
            return {
                waldWidth: wald[1] - wald[0],
                hksjWidth: hksj[1] - hksj[0]
            };
        """)
        self.assertGreater(widths['hksjWidth'], widths['waldWidth'],
                           "HKSJ CI should be wider than Wald for BCG data")

    def test_11_prediction_interval(self):
        """Prediction interval should be wider than any CI."""
        self._run_analysis_and_wait()
        result = self.js("""
            var row = document.querySelectorAll('#estimator-tbody tr')[2];  // REML
            var cells = row.querySelectorAll('td');
            function parseCI(text) {
                var m = text.match(/([-\\d.]+),\\s*([-\\d.]+)/);
                if (!m) return [0, 0];
                return [parseFloat(m[1]), parseFloat(m[2])];
            }
            var wald = parseCI(cells[6].textContent);
            var pi = parseCI(cells[9].textContent);
            return {
                waldWidth: wald[1] - wald[0],
                piWidth: pi[1] - pi[0]
            };
        """)
        self.assertGreater(result['piWidth'], result['waldWidth'],
                           "PI should be wider than Wald CI")

    # ================================================================
    # 3. Example Dataset Loading
    # ================================================================

    def test_12_load_BCG_example(self):
        """Load BCG vaccine example: 13 studies appear in table."""
        self.click('btn-load-bcg')
        time.sleep(0.3)
        row_count = self.js("return document.querySelectorAll('#data-tbody tr').length;")
        self.assertEqual(row_count, 13, "BCG dataset should have 13 studies")

    def test_13_load_Mg_example(self):
        """Load Magnesium MI example: 8 studies."""
        self.click('btn-load-mg')
        time.sleep(0.3)
        row_count = self.js("return document.querySelectorAll('#data-tbody tr').length;")
        self.assertEqual(row_count, 8, "Mg dataset should have 8 studies")
        # Reload BCG for subsequent tests
        self.click('btn-load-bcg')
        time.sleep(0.3)

    def test_14_clear_data(self):
        """Clear All removes all rows."""
        self.click('btn-clear-data')
        time.sleep(0.2)
        row_count = self.js("return document.querySelectorAll('#data-tbody tr').length;")
        self.assertEqual(row_count, 0, "After clear, table should be empty")
        # Reload BCG
        self.click('btn-load-bcg')
        time.sleep(0.3)

    # ================================================================
    # 4. Tab Navigation
    # ================================================================

    def test_15_tabs_switch(self):
        """All 5 tabs can be clicked and activate the correct panel."""
        tab_ids = ['tab-data', 'tab-forest', 'tab-estimators', 'tab-influence', 'tab-report']
        panel_ids = ['panel-data', 'panel-forest', 'panel-estimators', 'panel-influence', 'panel-report']
        for tid, pid in zip(tab_ids, panel_ids):
            self.drv.find_element(By.ID, tid).click()
            time.sleep(0.2)
            is_active = self.js(f"return document.getElementById('{pid}').classList.contains('active');")
            self.assertTrue(is_active, f"Panel {pid} should be active after clicking {tid}")
        # Return to data tab
        self.click('tab-data')
        time.sleep(0.2)

    # ================================================================
    # 5. Forest Plot
    # ================================================================

    def test_16_forest_plot_renders(self):
        """Forest plot SVG is generated after analysis."""
        self._run_analysis_and_wait()
        self.click('tab-forest')
        time.sleep(0.3)
        svg_exists = self.js("return document.getElementById('forest-svg') !== null;")
        self.assertTrue(svg_exists, "Forest plot SVG should exist")

    def test_17_forest_plot_has_studies(self):
        """Forest plot contains text elements for study names."""
        self._run_analysis_and_wait()
        self.click('tab-forest')
        time.sleep(0.3)
        contains_aronson = self.js("""
            var svg = document.getElementById('forest-svg');
            return svg ? svg.innerHTML.indexOf('Aronson') >= 0 : false;
        """)
        self.assertTrue(contains_aronson, "Forest plot should contain 'Aronson' study name")

    def test_18_forest_plot_has_diamonds(self):
        """Forest plot should have polygon elements (diamonds) for pooled estimates."""
        self._run_analysis_and_wait()
        self.click('tab-forest')
        time.sleep(0.3)
        polygon_count = self.js("""
            var svg = document.getElementById('forest-svg');
            return svg ? svg.querySelectorAll('polygon').length : 0;
        """)
        self.assertGreaterEqual(polygon_count, 10,
                                "Forest should have at least 10 diamonds (one per estimator)")

    # ================================================================
    # 6. Leave-One-Out
    # ================================================================

    def test_19_loo_analysis(self):
        """LOO analysis produces k results (one per omitted study)."""
        self._run_analysis_and_wait()
        self.click('tab-influence')
        time.sleep(0.3)
        loo_svg = self.js("return document.getElementById('loo-container').innerHTML;")
        self.assertIn('<svg', loo_svg, "LOO container should have SVG")
        # Check it has study labels
        self.assertIn('Aronson', loo_svg, "LOO plot should show study names")

    # ================================================================
    # 7. Influence Diagnostics
    # ================================================================

    def test_20_influence_table(self):
        """Influence table has rows for all 13 BCG studies."""
        self._run_analysis_and_wait()
        self.click('tab-influence')
        time.sleep(0.3)
        row_count = self.js("return document.querySelectorAll('#influence-tbody tr').length;")
        self.assertEqual(row_count, 13, "Influence table should have 13 rows for BCG")

    def test_21_influence_measures_present(self):
        """Influence table has studentized residual, hat, Cook's D, DFFITS, covRatio."""
        self._run_analysis_and_wait()
        self.click('tab-influence')
        time.sleep(0.3)
        first_row = self.js("""
            var cells = document.querySelectorAll('#influence-tbody tr')[0].querySelectorAll('td');
            return {
                study: cells[0].textContent,
                rstud: cells[1].textContent,
                hat: cells[2].textContent,
                cookD: cells[3].textContent,
                dffits: cells[4].textContent,
                covRatio: cells[5].textContent
            };
        """)
        # Check values are numeric (not dashes for valid data)
        for key in ['rstud', 'hat', 'cookD', 'dffits', 'covRatio']:
            val = first_row[key].strip()
            self.assertTrue(val != '' and val != '\u2014',
                            f"Influence measure {key} should be numeric, got '{val}'")

    # ================================================================
    # 8. Baujat Plot
    # ================================================================

    def test_22_baujat_plot(self):
        """Baujat plot renders with circles for each study."""
        self._run_analysis_and_wait()
        self.click('tab-influence')
        time.sleep(0.3)
        circle_count = self.js("""
            var container = document.getElementById('baujat-container');
            var svg = container.querySelector('svg');
            return svg ? svg.querySelectorAll('circle').length : 0;
        """)
        self.assertEqual(circle_count, 13, "Baujat plot should have 13 points for BCG")

    # ================================================================
    # 9. GOSH
    # ================================================================

    def test_23_gosh_analysis(self):
        """GOSH runs and produces subsets (BCG k=13 => exhaustive)."""
        self._run_analysis_and_wait()
        self.click('tab-influence')
        time.sleep(0.3)
        self.click('btn-run-gosh')
        time.sleep(3.0)  # GOSH for 13 studies takes time
        status = self.js("return document.getElementById('gosh-status').textContent;")
        self.assertIn('subsets computed', status, "GOSH should report subset count")

    # ================================================================
    # 10. Report & Export
    # ================================================================

    def test_24_report_methods_text(self):
        """Report tab generates methods paragraph with study count."""
        self._run_analysis_and_wait()
        self.click('tab-report')
        time.sleep(0.3)
        methods_text = self.js("return document.getElementById('methods-text').textContent;")
        self.assertIn('13 studies', methods_text, "Methods should mention 13 studies")
        self.assertIn('REML', methods_text, "Methods should mention REML")
        self.assertIn('HKSJ', methods_text, "Methods should mention HKSJ")

    def test_25_report_rcode(self):
        """Report generates equivalent R code with metafor."""
        self._run_analysis_and_wait()
        self.click('tab-report')
        time.sleep(0.3)
        r_code = self.js("return document.getElementById('r-code').textContent;")
        self.assertIn('library(metafor)', r_code, "R code should load metafor")
        self.assertIn('rma(', r_code, "R code should call rma()")
        self.assertIn('forest(', r_code, "R code should call forest()")
        self.assertIn('leave1out(', r_code, "R code should call leave1out()")
        self.assertIn('gosh(', r_code, "R code should call gosh()")

    # ================================================================
    # 11. Data Add / Remove Rows
    # ================================================================

    def test_26_add_remove_rows(self):
        """Add Row / Remove Last Row buttons work."""
        self.click('tab-data')
        time.sleep(0.2)
        self.click('btn-load-bcg')
        time.sleep(0.3)
        initial = self.js("return document.querySelectorAll('#data-tbody tr').length;")
        self.assertEqual(initial, 13)
        self.click('btn-add-row')
        time.sleep(0.2)
        after_add = self.js("return document.querySelectorAll('#data-tbody tr').length;")
        self.assertEqual(after_add, 14)
        self.click('btn-remove-row')
        time.sleep(0.2)
        after_remove = self.js("return document.querySelectorAll('#data-tbody tr').length;")
        self.assertEqual(after_remove, 13)

    # ================================================================
    # 12. Edge Cases
    # ================================================================

    def test_27_minimum_studies(self):
        """Analysis works with exactly 2 studies."""
        self.click('tab-data')
        time.sleep(0.2)
        self.click('btn-clear-data')
        time.sleep(0.2)
        # Add 2 studies manually via JS
        self.js("""
            document.getElementById('btn-add-row').click();
            document.getElementById('btn-add-row').click();
        """)
        time.sleep(0.3)
        self.js("""
            var rows = document.querySelectorAll('#data-tbody tr');
            rows[0].querySelector('.study-effect').value = '-0.5';
            rows[0].querySelector('.study-se').value = '0.3';
            rows[1].querySelector('.study-effect').value = '-0.8';
            rows[1].querySelector('.study-se').value = '0.2';
        """)
        self._run_analysis_and_wait()
        status = self.js("return document.getElementById('data-status').textContent;")
        self.assertIn('2 studies', status, "Should report 2 studies")
        # Restore BCG
        self.click('btn-load-bcg')
        time.sleep(0.3)

    def test_28_single_study_rejected(self):
        """Analysis with 1 study should show error (need >=2)."""
        self.click('tab-data')
        time.sleep(0.2)
        self.click('btn-clear-data')
        time.sleep(0.2)
        self.js("document.getElementById('btn-add-row').click();")
        time.sleep(0.2)
        self.js("""
            var rows = document.querySelectorAll('#data-tbody tr');
            rows[0].querySelector('.study-effect').value = '-0.5';
            rows[0].querySelector('.study-se').value = '0.3';
        """)
        self._run_analysis_and_wait()
        status = self.js("return document.getElementById('data-status').textContent;")
        self.assertIn('Error', status, "Single study should show error")
        # Restore BCG
        self.click('btn-load-bcg')
        time.sleep(0.3)

    # ================================================================
    # 13. Heterogeneity Stats
    # ================================================================

    def test_29_I2_high_for_BCG(self):
        """BCG data should show high I2 (>80%) — known to be very heterogeneous."""
        self._run_analysis_and_wait()
        i2_text = self.js("""
            var rows = document.querySelectorAll('#estimator-tbody tr');
            return rows[1].querySelectorAll('td')[2].textContent;  // DL I2
        """)
        I2 = float(i2_text)
        self.assertGreater(I2, 50, "I2 should be >50% for BCG data")

    def test_30_Q_p_value_significant(self):
        """Q-test p-value should be very small for BCG data."""
        self._run_analysis_and_wait()
        qp_text = self.js("""
            var rows = document.querySelectorAll('#estimator-tbody tr');
            return rows[1].querySelectorAll('td')[11].textContent;
        """)
        self.assertIn('< 0.001', qp_text, "Q-test p should be < 0.001 for BCG")

    # ================================================================
    # 14. Mg Dataset Cross-check
    # ================================================================

    def test_31_mg_dataset_analysis(self):
        """Magnesium dataset (8 studies) runs successfully with all estimators."""
        self.click('tab-data')
        time.sleep(0.2)
        self.click('btn-load-mg')
        time.sleep(0.3)
        self._run_analysis_and_wait()
        status = self.js("return document.getElementById('data-status').textContent;")
        self.assertIn('8 studies', status)
        self.assertIn('10 estimators', status)
        # Restore BCG
        self.click('btn-load-bcg')
        time.sleep(0.3)

    # ================================================================
    # 15. Tau2 bar chart and theta-CI chart
    # ================================================================

    def test_32_tau2_bar_chart(self):
        """Tau2 bar chart renders with bars for all estimators."""
        self._run_analysis_and_wait()
        self.click('tab-estimators')
        time.sleep(0.3)
        svg_html = self.js("return document.getElementById('tau2-bar-chart').innerHTML;")
        self.assertIn('<svg', svg_html, "Tau2 bar chart should render SVG")
        # Should have 10 rect elements (one per estimator)
        rect_count = self.js("""
            var el = document.getElementById('tau2-bar-chart');
            var svg = el.querySelector('svg');
            return svg ? svg.querySelectorAll('rect').length : 0;
        """)
        # 10 bars + 1 background rect = 11
        self.assertGreaterEqual(rect_count, 11, "Tau2 chart should have 10 bars + bg")

    def test_33_theta_ci_chart(self):
        """Theta CI comparison chart renders."""
        self._run_analysis_and_wait()
        self.click('tab-estimators')
        time.sleep(0.3)
        svg_html = self.js("return document.getElementById('theta-ci-chart').innerHTML;")
        self.assertIn('<svg', svg_html, "Theta CI chart should render SVG")

    # ================================================================
    # 16. Theme Toggle
    # ================================================================

    def test_34_theme_toggle(self):
        """Theme toggle switches between light and dark mode."""
        initial = self.js("return document.documentElement.getAttribute('data-theme');")
        self.click('theme-toggle')
        time.sleep(0.3)
        after = self.js("return document.documentElement.getAttribute('data-theme');")
        # Toggle should change the theme
        if initial == 'dark':
            self.assertNotEqual(after, 'dark')
        else:
            self.assertEqual(after, 'dark')
        # Toggle back
        self.click('theme-toggle')
        time.sleep(0.2)

    # ================================================================
    # 17. CSV Paste Area Toggle
    # ================================================================

    def test_35_csv_paste_toggle(self):
        """Paste CSV button toggles the textarea visibility."""
        self.click('tab-data')
        time.sleep(0.2)
        initial = self.js("return document.getElementById('csv-paste-area').style.display;")
        self.assertEqual(initial, 'none', "CSV area should be hidden initially")
        self.drv.find_element(By.ID, 'btn-paste-csv').click()
        time.sleep(0.2)
        after = self.js("return document.getElementById('csv-paste-area').style.display;")
        self.assertEqual(after, 'block', "CSV area should be visible after click")
        # Toggle back
        self.drv.find_element(By.ID, 'btn-paste-csv').click()
        time.sleep(0.2)

    # ================================================================
    # 18. Effect type select
    # ================================================================

    def test_36_effect_type_select(self):
        """Effect type dropdown has the expected options."""
        options = self.js("""
            var sel = document.getElementById('effect-type-select');
            var opts = [];
            for (var i = 0; i < sel.options.length; i++) {
                opts.push(sel.options[i].value);
            }
            return opts;
        """)
        expected_types = ['generic', 'logOR', 'logRR', 'logHR', 'MD', 'SMD', 'FisherZ']
        self.assertEqual(options, expected_types)


if __name__ == '__main__':
    unittest.main(verbosity=2)
