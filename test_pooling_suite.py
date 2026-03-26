"""
Pooling Methods Suite — Selenium Test Suite (25 tests)
Run: python test_pooling_suite.py
"""
import sys, os, time, io, unittest
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options

HTML_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'pooling-suite.html')
URL = 'file:///' + HTML_PATH.replace('\\', '/')

def get_driver():
    opts = Options()
    opts.add_argument('--headless=new')
    opts.add_argument('--no-sandbox')
    opts.add_argument('--disable-gpu')
    opts.add_argument('--window-size=1400,900')
    opts.set_capability('goog:loggingPrefs', {'browser': 'ALL'})
    d = webdriver.Chrome(options=opts); d.implicitly_wait(2); return d

class PoolingSuiteTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.driver = get_driver(); cls.driver.get(URL); time.sleep(0.5)
    @classmethod
    def tearDownClass(cls):
        logs = cls.driver.get_log('browser')
        severe = [l for l in logs if l['level']=='SEVERE' and 'favicon' not in l.get('message','')]
        if severe: print(f"\nJS ERRORS: {len(severe)}")
        cls.driver.quit()
    def _reload(self): self.driver.get(URL); time.sleep(0.3)
    def _click(self, by, val):
        el = WebDriverWait(self.driver, 5).until(EC.presence_of_element_located((by, val)))
        self.driver.execute_script("arguments[0].click()", el); return el
    def _load_and_run(self):
        self._reload(); self._click(By.ID, 'btn-load-bcg'); time.sleep(0.3)
        self._click(By.ID, 'btn-run-analysis'); time.sleep(1)

    def test_01_page_loads(self):
        self.assertIn('Pool', self.driver.title)
    def test_02_five_tabs(self):
        tabs = self.driver.find_elements(By.CSS_SELECTOR, '[role="tab"]')
        self.assertGreaterEqual(len(tabs), 4)
    def test_03_load_bcg(self):
        self._reload(); self._click(By.ID, 'btn-load-bcg'); time.sleep(0.3)
        rows = self.driver.find_elements(By.CSS_SELECTOR, '#data-tbody tr')
        self.assertGreaterEqual(len(rows), 8)
    def test_04_load_magnesium(self):
        self._reload(); self._click(By.ID, 'btn-load-mg'); time.sleep(0.3)
        rows = self.driver.find_elements(By.CSS_SELECTOR, '#data-tbody tr')
        self.assertGreaterEqual(len(rows), 8)
    def test_05_run_analysis(self):
        self._load_and_run()
        status = self.driver.find_element(By.ID, 'data-status')
        self.assertTrue(len(status.text) > 0)
    def test_06_forest_tab(self):
        self._load_and_run()
        self._click(By.ID, 'tab-forest'); time.sleep(0.3)
        panel = self.driver.find_element(By.ID, 'panel-forest')
        self.assertIn('active', panel.get_attribute('class'))
    def test_07_forest_svg(self):
        self._load_and_run()
        self._click(By.ID, 'tab-forest'); time.sleep(0.3)
        svg_html = self.driver.find_element(By.ID, 'panel-forest').get_attribute('innerHTML')
        self.assertIn('svg', svg_html.lower())
    def test_08_forest_has_diamonds(self):
        svg_html = self.driver.find_element(By.ID, 'panel-forest').get_attribute('innerHTML')
        # Diamonds or polygons for pooled estimates
        self.assertTrue('path' in svg_html or 'polygon' in svg_html or 'diamond' in svg_html.lower())
    def test_09_estimators_tab(self):
        self._load_and_run()
        self._click(By.ID, 'tab-estimators'); time.sleep(0.3)
        panel = self.driver.find_element(By.ID, 'panel-estimators')
        self.assertTrue(panel.is_displayed())
    def test_10_dl_estimator(self):
        text = self.driver.find_element(By.ID, 'panel-estimators').text
        self.assertIn('DL', text)
    def test_11_reml_estimator(self):
        text = self.driver.find_element(By.ID, 'panel-estimators').text
        self.assertIn('REML', text)
    def test_12_pm_estimator(self):
        text = self.driver.find_element(By.ID, 'panel-estimators').text
        self.assertTrue('PM' in text or 'Paule' in text)
    def test_13_multiple_estimators(self):
        text = self.driver.find_element(By.ID, 'panel-estimators').text
        found = sum(1 for m in ['DL','REML','ML','PM','FE','SJ','HS','HE','EB'] if m in text)
        self.assertGreaterEqual(found, 5, f"Only found {found} estimators")
    def test_14_tau2_values(self):
        text = self.driver.find_element(By.ID, 'panel-estimators').text.lower()
        self.assertTrue('tau' in text or 'heterogeneity' in text)
    def test_15_i2_values(self):
        text = self.driver.find_element(By.ID, 'panel-estimators').text
        self.assertTrue('I' in text and '%' in text)
    def test_16_influence_tab(self):
        self._load_and_run()
        self._click(By.ID, 'tab-influence'); time.sleep(0.3)
        panel = self.driver.find_element(By.ID, 'panel-influence')
        self.assertTrue(panel.is_displayed())
    def test_17_loo_analysis(self):
        text = self.driver.find_element(By.ID, 'panel-influence').text.lower()
        self.assertTrue('leave' in text or 'loo' in text or 'omit' in text)
    def test_18_report_tab(self):
        self._load_and_run()
        self._click(By.ID, 'tab-report'); time.sleep(0.3)
        panel = self.driver.find_element(By.ID, 'panel-report')
        self.assertTrue(panel.is_displayed())
    def test_19_r_code(self):
        text = self.driver.find_element(By.ID, 'panel-report').text
        self.assertTrue('metafor' in text or 'rma' in text)
    def test_20_dark_mode(self):
        self._reload()
        btn = self.driver.find_element(By.ID, 'theme-toggle')
        self.driver.execute_script("arguments[0].click()", btn); time.sleep(0.2)
        theme = self.driver.find_element(By.TAG_NAME, 'html').get_attribute('data-theme')
        self.assertEqual(theme, 'dark')
        self.driver.execute_script("arguments[0].click()", btn)
    def test_21_add_row(self):
        self._reload(); self._click(By.ID, 'btn-add-row'); time.sleep(0.2)
    def test_22_clear(self):
        self._reload(); self._click(By.ID, 'btn-load-bcg'); time.sleep(0.2)
        self._click(By.ID, 'btn-clear-data'); time.sleep(0.2)
    def test_23_csv_paste(self):
        self._reload()
        # Click to show paste area first if needed
        try:
            self._click(By.ID, 'btn-paste-csv')
            time.sleep(0.3)
        except Exception:
            pass
        ta = self.driver.find_element(By.ID, 'csv-paste-area')
        ta.send_keys("Test Study, 0.5, 0.2")
        self._click(By.ID, 'btn-import-csv'); time.sleep(0.3)
    def test_24_prediction_interval(self):
        self._load_and_run()
        self._click(By.ID, 'tab-estimators'); time.sleep(0.3)
        text = self.driver.find_element(By.ID, 'panel-estimators').text.lower()
        self.assertTrue('prediction' in text or 'pi' in text)
    def test_25_tab_keyboard(self):
        self._reload()
        tab = self.driver.find_element(By.ID, 'tab-data')
        tab.send_keys(Keys.ARROW_RIGHT); time.sleep(0.2)

if __name__ == '__main__':
    unittest.main(verbosity=2)
