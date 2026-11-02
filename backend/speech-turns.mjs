// Provider boundaries are not punctuation or approval by the author.
export class SpeechTurns {
  turns=[]; current=null; duplicateFinals=0;
  accept(e,atMs){
    if(e.type==='speechStart'){
      if(e.turnId==null)throw Error('Turno sin identificación.');
      if(this.turns.some(t=>t.turnId===e.turnId))throw Error('Inicio de turno repetido.');
      this.current={turnId:e.turnId,startAtMs:atMs,startAudioProcessedMs:e.audioProcessedMs??null,endAtMs:null,completeAtMs:null,endToCompleteMs:null,partial:'',text:null};
      this.turns.push(this.current);
    }else if(e.type==='transcript'){
      if(!this.current||typeof e.transcript!=='string')throw Error('Parcial sin turno.');
      if(this.current.text===null)this.current.partial=e.transcript;
    }else if(e.type==='speechEnd'||e.type==='speechComplete'){
      const t=this.turns.find(t=>t.turnId===e.turnId);if(!t)throw Error('Evento de turno desconocido.');
      if(e.type==='speechEnd'){t.endAtMs??=atMs;t.endAudioProcessedMs=e.audioProcessedMs??null;}
      else {
        if(typeof e.transcript!=='string')throw Error('Final de turno sin texto.');
        if(t.text!==null){if(t.text!==e.transcript)throw Error('Final de turno contradictorio.');this.duplicateFinals++;return;}
        t.text=e.transcript;t.completeAtMs=atMs;t.endToCompleteMs=t.endAtMs===null?null:atMs-t.endAtMs;t.completeAudioProcessedMs=e.audioProcessedMs??null;
      }
    }
  }
  get complete(){return this.turns.every(t=>t.text!==null);}
  get text(){return this.turns.map(t=>t.text??'').filter(Boolean).join(' ');}
  snapshot(){return this.turns.map(({partial,...t})=>({...t,partial:t.text===null?partial:null}));}
}
