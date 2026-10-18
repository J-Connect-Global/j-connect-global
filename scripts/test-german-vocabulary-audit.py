"""Regression tests for PDF geometry. No external PDFs or PyMuPDF install required."""
import importlib.util, sys, types, unittest
from pathlib import Path
sys.modules['fitz'] = types.SimpleNamespace()
spec = importlib.util.spec_from_file_location('audit', Path(__file__).with_name('audit-german-vocabulary.py'))
audit = importlib.util.module_from_spec(spec)
spec.loader.exec_module(audit)
class Page:
    def __init__(self, words): self.words = words
    def get_text(self, kind): return self.words
class GeometryTests(unittest.TestCase):
    def test_both_headword_columns_and_no_example_column(self):
        # x0,y0,x1,y1,text: example text must not become a headword.
        words = [(35,100,70,110,'Abfahrt,'),(305,100,350,110,'Quittung,'),
                 (150,100,200,110,'Donaudampfschiff'),(305,120,345,130,'der'),(328,120,370,130,'Termin,')]
        audit.fitz.open = lambda _: [Page(words)]
        entries, groups = audit.extract('fixture',1,1,[(34,106),(304,375)],[])
        self.assertIn('Abfahrt', entries)
        self.assertIn('Quittung', entries)
        self.assertIn('Termin', entries)
        self.assertNotIn('Donaudampfschiff', entries)
        self.assertEqual(groups,{})
    def test_word_group_pages_and_explicit_aliases(self):
        audit.fitz.open = lambda _: [Page([(10,100,80,110,'vierundzwanzig'),(10,120,80,130,'Abend,-e'),(10,140,80,150,'Samstag/Sonnabend'),(10,160,80,170,'(Kita)'),(10,180,80,190,'Seite')])]
        _, groups = audit.extract('fixture',2,1,[],[0])
        self.assertEqual(groups['vierundzwanzig'], [1])
        self.assertEqual(groups['Abend'], [1])
        self.assertEqual(groups['Sonnabend'], [1])
        self.assertEqual(groups['Kita'], [1])
        self.assertNotIn('Seite', groups)
        self.assertEqual(audit.comparison_keys('sich beeilen'), ['sich beeilen','beeilen'])
        self.assertEqual(audit.comparison_keys('Schmerzen'), ['Schmerzen','Schmerz'])
        self.assertEqual(audit.comparison_keys('Wasser'), ['Wasser'])
    def test_hyphenated_headword_joins_only_adjacent_line(self):
        audit.fitz.open = lambda _: [Page([(35,100,100,110,'Aufenthalts-'),(35,114,100,124,'erlaubnis')])]
        entries, _ = audit.extract('fixture',1,1,[(34,106)],[])
        self.assertIn('Aufenthaltserlaubnis', entries)
if __name__ == '__main__': unittest.main()
