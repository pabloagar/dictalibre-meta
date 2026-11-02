// Browser monotonic clock only. These intervals include dictation and are not acoustic latency.
export function textIntervals({start,end,final,first=null,hasFinalText=true}){
 const span=(a,b)=>Number.isFinite(a)&&Number.isFinite(b)&&b>=a?b-a:null;
 return {receiveStartToFirstTextMs:span(start,first??(hasFinalText?final:null)),receiveStartToFinalTextMs:span(start,final),receiveEndToTextMs:span(end,final)};
}
