"""Read-only source import. Private catalog; never rewrites source or clinical wording."""
import argparse, hashlib, io, json, re, time, unicodedata, zipfile, shutil
from pathlib import Path
from datetime import datetime, timezone
from xml.etree import ElementTree as ET
VERSION='template-import-v1'
def sha(b): return hashlib.sha256(b).hexdigest()
def display_name(s):
    if any(c in s for c in '╠╡├┬'):
        for enc in ('cp437','cp850'):
            try:
                fixed=s.encode(enc).decode('utf-8')
                return unicodedata.normalize('NFC',fixed)
            except (UnicodeError, LookupError): pass
    return unicodedata.normalize('NFC',s)
def text_decode(raw):
    if raw.startswith((b'\xff\xfe',b'\xfe\xff')): return raw.decode('utf-16'), 'utf-16', []
    try: return raw.decode('utf-8-sig'),'utf-8',[]
    except UnicodeDecodeError: return raw.decode('cp1252',errors='replace'),'cp1252',['Codificación heredada: revisar acentos.']
def docx_text(raw):
    with zipfile.ZipFile(io.BytesIO(raw)) as z:
        data=z.read('word/document.xml')
    root=ET.fromstring(data); ns={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
    lines=[]
    for p in root.findall('.//w:body//w:p',ns):
        parts=[]
        for e in p.iter():
            kind=e.tag.split('}')[-1]
            if kind=='t':parts.append(e.text or '')
            elif kind in ('br','cr'):parts.append('\n')
            elif kind=='tab':parts.append('\t')
        lines.append(''.join(parts))
    warnings=[]
    if root.findall('.//w:tbl',ns): warnings.append('Tablas convertidas a texto por orden de párrafos; comprobar estructura.')
    if root.findall('.//w:del',ns) or root.findall('.//w:ins',ns): warnings.append('Control de cambios: revisar documento original.')
    return '\n'.join(lines),warnings
TITLE=re.compile(r'^(?:TOMOGRAF[IÍ]A|TC\b|TAC\b|RM\b|RESONANCIA|ECOGRAF[IÍ]A|ECO\b|RADIOGRAF[IÍ]A|RX\b|ANGIO\w*|DOPPLER|URO\w*|COLANGIO\w*|MAMOGRAF[IÍ]A|ENTERO\w*)',re.I)
def split_studies(text):
    lines=text.splitlines(keepends=True);starts=[];offset=0
    for line in lines:
        s=line.strip();letters=[c for c in s if c.isalpha()]
        if 5<len(s)<140 and TITLE.match(s) and letters and sum(c.isupper() for c in letters)/len(letters)>.85:
            starts.append((offset,s))
        offset+=len(line)
    # A title alone is insufficient: each proposed section needs report structure.
    if len(starts)>1:
        parts=[]
        for i,(pos,title) in enumerate(starts):
            end=starts[i+1][0] if i+1<len(starts) else len(text)
            chunk=text[(0 if i==0 else pos):end]
            if not re.search(r'hallazgos|impresi[oó]n|conclusi[oó]n|antecedentes',chunk,re.I):return [(None,text)],['Posibles estudios múltiples: separación pendiente de revisión.']
            parts.append((title,chunk))
        assert ''.join(x[1] for x in parts)==text
        return parts,['Separación automática por títulos; comprobar antes de usar.']
    return [(starts[0][1] if starts else None,text)],[]
def modality(name):
    n=unicodedata.normalize('NFD',name).encode('ascii','ignore').decode().upper()
    if re.search(r'\bRM\b|RESONANCIA',n):return 'Resonancia'
    if re.search(r'\bTAC\b|\bTC\b|TOMOGRAF|ANGIOTC',n):return 'Tomografía'
    if re.search(r'\bECO\b|ECOGRAF|DOPPLER',n):return 'Ecografía / Doppler'
    if re.search(r'\bRX\b|RADIOGRAF',n):return 'Radiografía'
    return 'Otros / por clasificar'
def build(source,out):
    started=time.perf_counter();out.mkdir(parents=True,exist_ok=True);entries=[];templates={};references=[]
    if (out/'protocol.json').exists():
        history=out/'history'/datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ');history.mkdir(parents=True)
        for name in ('protocol.json','summary.json','inventory.json','catalog.json'):
            if (out/name).exists():shutil.copyfile(out/name,history/name)
    paths=sorted(p for p in source.rglob('*') if p.is_file())
    protocol={'version':VERSION,'startedAt':datetime.now(timezone.utc).isoformat(),'source':str(source),'sourceFileCount':len(paths),'scriptHash':sha(Path(__file__).read_bytes()),'hypothesis':'Importar biblioteca sin pérdida de archivos ni cambios clínicos; deduplicar solo texto idéntico.','acceptance':'Cada archivo inventariado, original intacto, división reconstruye texto extraído, errores explícitos. Revisión clínica/formato pendiente.','network':None,'repetitions':1}
    (out/'protocol.json').write_text(json.dumps(protocol,ensure_ascii=False,indent=2),encoding='utf8')
    def process(raw,relative,archive=False):
        ext=Path(relative).suffix.lower();entry={'source':relative,'sha256':sha(raw),'bytes':len(raw),'archiveMember':archive,'status':'pending','warnings':[]};entries.append(entry);t0=time.perf_counter()
        try:
            if Path(relative).name.startswith('~$'):
                entry['status']='office-lock-file';return
            if ext=='.zip':
                if archive:entry['status']='nested-archive-not-expanded';return
                with zipfile.ZipFile(io.BytesIO(raw)) as z:
                    members=[i for i in z.infolist() if not i.is_dir()]
                    if len(members)>3000 or sum(i.file_size for i in members)>100_000_000:raise ValueError('Archivo excede límites de inspección')
                    for i in members:
                        if '__MACOSX/' in i.filename or Path(i.filename).name.startswith('._'):continue
                        process(z.read(i),relative+'!/'+i.filename,True)
                entry['status']='archive-inspected';return
            if ext=='.txt':text,encoding,warnings=text_decode(raw);entry['encoding']=encoding;entry['warnings']+=warnings
            elif ext=='.docx':text,warnings=docx_text(raw);entry['warnings']+=warnings
            elif ext=='.pdf':
                from pypdf import PdfReader
                pdf=PdfReader(io.BytesIO(raw));text='\n'.join(page.extract_text() or '' for page in pdf.pages);entry['pages']=len(pdf.pages)
                is_article=bool(re.search(r'abstract|revista|journal|bibliograf[ií]a|references',text[:3000],re.I))
                candidate=not is_article and len(pdf.pages)<=10 and re.search(r'hallazgos',text,re.I) and re.search(r'impresi[oó]n|conclusi[oó]n',text,re.I)
                entry['status']='pdf-template-candidate' if candidate else 'reference';entry['characters']=len(text)
                references.append({'source':relative,'name':display_name(Path(relative).name),'type':entry['status'],'pages':len(pdf.pages),'textPreview':text[:1200]})
                # Keep all extracted PDF text for review, without auto-promoting articles to templates.
                (out/(entry['sha256']+'.pdf.txt')).write_text(text,encoding='utf8');return
            elif ext in ('.ppt','.pptx'):entry['status']='reference';references.append({'source':relative,'name':display_name(Path(relative).name),'type':'presentation-reference'});return
            else:entry['status']='unsupported';return
            if not text.strip():entry['status']='empty';return
            entry['extractedHash']=sha(text.encode());entry['characters']=len(text)
            pieces,warnings=split_studies(text);entry['warnings']+=warnings;entry['templates']=[]
            for title,chunk in pieces:
                tid=sha(chunk.encode());display=display_name(title if len(pieces)>1 and title else Path(relative).stem);category=modality(relative+' '+display)
                item=templates.setdefault(tid,{'id':tid,'name':display,'text':chunk,'category':category,'sources':[],'warnings':[],'reviewStatus':'not-clinically-reviewed'})
                item['sources'].append({'path':relative,'sha256':entry['sha256']});item['warnings']=list(dict.fromkeys(item['warnings']+entry['warnings']));entry['templates'].append(tid)
            entry['status']='imported'
        except Exception as e:entry['status']='error';entry['error']=str(e)[:300]
        finally:entry['elapsedMs']=(time.perf_counter()-t0)*1000
    for p in paths:process(p.read_bytes(),str(p.relative_to(source)))
    statuses={};extensions={}
    for e in entries:statuses[e['status']]=statuses.get(e['status'],0)+1
    for p in paths:extensions[p.suffix.lower()]=extensions.get(p.suffix.lower(),0)+1
    summary={'sourceFiles':len(paths),'archiveMembers':sum(e['archiveMember'] for e in entries),'entries':len(entries),'uniqueTemplates':len(templates),'duplicateOccurrences':sum(len(t['sources'])-1 for t in templates.values()),'references':len(references),'statuses':statuses,'extensions':extensions,'elapsedMs':(time.perf_counter()-started)*1000,'sourceUnchanged':all(sha((source/e['source']).read_bytes())==e['sha256'] for e in entries if not e['archiveMember'])}
    catalog={'version':VERSION,'generatedAt':datetime.now(timezone.utc).isoformat(),'summary':summary,'templates':list(templates.values()),'references':references}
    for name,data in [('catalog.json',catalog),('inventory.json',entries),('summary.json',summary)]:
        tmp=out/(name+'.tmp');tmp.write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf8');tmp.replace(out/name)
    print(json.dumps(summary,ensure_ascii=False,indent=2))
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('source',type=Path);p.add_argument('output',type=Path);a=p.parse_args();build(a.source,a.output)
