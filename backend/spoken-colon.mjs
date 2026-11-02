// Narrow ASR alias: singular "dos punto" only after a section heading,
// and only before a line break command/end. Never a decimal or finding count.
export function isHeadingColon(text,start,end){
 const before=text.slice(0,start),after=text.slice(end);
 return /(?:^|[\n.!?]|\bnueva l[ií]nea|\bnuevo p[aá]rrafo)\s*(?:hallazgos|impresi[oó]n(?: diagn[oó]stica)?|conclusi[oó]n(?:es)?|t[eé]cnica|antecedentes|comparaci[oó]n)\s*$/iu.test(before)
  && /^(?:[ \t]*[.,;:]?[ \t]*(?:nueva l[ií]nea|nuevo p[aá]rrafo)\b|[ \t]*\r?\n|[ \t]*[.]?[ \t]*$)/iu.test(after);
}
