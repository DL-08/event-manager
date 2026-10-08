from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]


class TechTextIntegrationTests(unittest.TestCase):
    def test_component_files_and_usage_exist(self):
        html = (ROOT / "index.html").read_text(encoding="utf-8")
        css = (ROOT / "style.css").read_text(encoding="utf-8")
        script = (ROOT / "tech-text.js").read_text(encoding="utf-8")

        self.assertIn('id="tech-text-host"', html)
        self.assertIn('tech-text.js', html)
        self.assertIn('.tech-text', css)
        self.assertIn('class TechText', script)
        self.assertIn('requestAnimationFrame', script)

    def test_component_configuration_is_rendered(self):
        html = (ROOT / "index.html").read_text(encoding="utf-8")
        self.assertRegex(html, r'<div[^>]+id="tech-text-host"')
        self.assertNotIn('TechText', html)

    def test_no_react_dependency_was_added(self):
        html = (ROOT / "index.html").read_text(encoding="utf-8")
        self.assertNotIn('react', html.lower())
        self.assertNotIn('jsx', html.lower())


if __name__ == "__main__":
    unittest.main()
