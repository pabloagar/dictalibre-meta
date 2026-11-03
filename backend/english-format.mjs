// Conservative English commands. No numeric, unit or clinical-term rewriting.
export const ENGLISH_COMMAND_VERSION = 'en-basic-v1';
export function formatEnglishDictation(original) {
  const started = performance.now(), events = [], warnings = [];
  const replacements = {'full stop':'.', 'period':'.', 'comma':',', 'colon':':', 'semicolon':';', 'new line':'\n', 'new paragraph':'\n\n'};
  const pattern = /\b(?:new paragraph|new line|full stop|semicolon|colon|comma|period)\b/giu;
  let text = '', cursor = 0;
  for (const match of original.matchAll(pattern)) {
    if (match.index < cursor) continue;
    const start=match.index, end=start+match[0].length, command=match[0].toLowerCase();
    const before=original.slice(0,start), after=original.slice(end);
    // Colon and period also have common clinical meanings. Only headings/standalone
    // utterances are unambiguous enough for automatic replacement.
    const standalone=!before.trim()&&!after.replace(/[.,;:]/g,'').trim();
    const heading=/(?:^|\n|[.!?]\s+)(?:clinical history|history|technique|findings|impression|comparison)\s*$/iu.test(text+original.slice(cursor,start));
    const literal=(command==='colon'&&!standalone&&!heading)||(command==='period'&&!standalone)||(/^new /u.test(command)&&/^\s+of\b/iu.test(after));
    text+=original.slice(cursor,start);
    if(literal){text+=match[0];cursor=end;warnings.push({start,end,command,reason:'possible_literal'});continue;}
    const replacement=replacements[command];
    text=text.replace(/[ \t]+$/u,'');
    if(!replacement.includes('\n'))text=text.replace(/[.,;:]$/u,'');
    text+=replacement;
    cursor=end+(after.match(/^[ \t]*[.,;:]?[ \t]*/u)?.[0].length??0);
    if(!replacement.includes('\n')&&cursor<original.length)text+=' ';
    events.push({start,end,spoken:match[0],command,replacement});
  }
  text+=original.slice(cursor);
  text=text.replace(/(^[ \t]*|[.!?][ \t\r\n]+|\n\n[ \t]*)(\p{Ll})/gu,(_,prefix,letter)=>prefix+letter.toUpperCase());
  return {version:ENGLISH_COMMAND_VERSION,text,events,warnings,elapsedMs:performance.now()-started};
}
