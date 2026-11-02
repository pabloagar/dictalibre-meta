import unittest, tempfile, json, zipfile, io, contextlib, importlib.util
from pathlib import Path
spec=importlib.util.spec_from_file_location('importer',Path(__file__).resolve().parents[1]/'scripts/import-templates.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class ImportTests(unittest.TestCase):
 def test_split_preserves_all_text(self):
  text='Cabecera\nTC TÓRAX\nHallazgos: sin derrame.\n\nTC ABDOMEN\nHallazgos: hígado normal.\n'
  parts,w=m.split_studies(text);self.assertEqual(len(parts),2);self.assertEqual(''.join(p[1] for p in parts),text)
 def test_ambiguous_split_keeps_whole(self):
  text='TC TÓRAX\nHallazgos: texto\nTC ABDOMEN\nsin estructura'
  parts,w=m.split_studies(text);self.assertEqual(parts,[(None,text)]);self.assertTrue(w)
 def test_legacy_name_and_text(self):
  self.assertEqual(m.display_name('Colangiografi╠üa'),'Colangiografía')
  self.assertEqual(m.text_decode('Tórax'.encode('cp1252'))[0],'Tórax')
 def test_catalog_dedup_variants_zip_and_hashes(self):
  with tempfile.TemporaryDirectory(prefix='dicta-templates-') as tmp:
   root=Path(tmp);src=root/'source';src.mkdir();out=root/'out';text='Hallazgos:\nSin derrame pleural.\n'
   (src/'A.txt').write_bytes(text.encode('utf8'));(src/'copia.txt').write_bytes(text.encode('utf8'));(src/'variante.txt').write_bytes(text.replace('Sin','Con').encode('utf8'));(src/'~$temporal.docx').write_bytes(b'lock')
   with zipfile.ZipFile(src/'archivo.zip','w') as z:z.writestr('../fuera.txt',text)
   with contextlib.redirect_stdout(io.StringIO()):m.build(src,out)
   catalog=json.loads((out/'catalog.json').read_text(encoding='utf8'));self.assertEqual(len(catalog['templates']),2);self.assertEqual(catalog['summary']['duplicateOccurrences'],2);self.assertTrue(catalog['summary']['sourceUnchanged']);self.assertEqual(catalog['summary']['statuses']['office-lock-file'],1);self.assertFalse((root/'fuera.txt').exists())
 def test_docx_paragraphs_and_table_warning(self):
  raw=io.BytesIO()
  with zipfile.ZipFile(raw,'w') as z:z.writestr('word/document.xml','<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Sin derrame.</w:t></w:r></w:p><w:tbl><w:tr><w:tc><w:p><w:r><w:t>2,5 cm</w:t></w:r></w:p></w:tc></w:tr></w:tbl></w:body></w:document>')
  text,w=m.docx_text(raw.getvalue());self.assertEqual(text,'Sin derrame.\n2,5 cm');self.assertTrue(w)
if __name__=='__main__':unittest.main()
