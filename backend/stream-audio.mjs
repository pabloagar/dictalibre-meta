// Stateful windowed-sinc resampling. Fixed output: signed PCM16 mono at 24 kHz.
export const STREAM_PREPARATION='sinc-hann-64-mono-24k-v1';
export class StreamResampler {
  constructor(rate){if(!Number.isInteger(rate)||rate<8000||rate>96000)throw Error('Frecuencia inválida.');this.rate=rate;this.data=[];this.base=0;this.total=0;this.out=0;}
  push(bytes,final=false){
    if(bytes.length%2)throw Error('PCM16 incompleto.');
    for(let i=0;i<bytes.length;i+=2)this.data.push(bytes.readInt16LE(i));
    this.total+=bytes.length/2;const result=[],cutoff=.45*Math.min(1,24000/this.rate);
    while(this.out<Math.floor(this.total*24000/this.rate)){
      const pos=this.out*this.rate/24000;if(!final&&pos+32>=this.total)break;
      let sum=0,weight=0;
      for(let j=Math.ceil(pos-32);j<=Math.floor(pos+32);j++){
        const distance=j-pos,x=2*Math.PI*cutoff*distance;
        const w=(Math.abs(x)<1e-10?2*cutoff:Math.sin(x)/(Math.PI*distance))*(.5+.5*Math.cos(Math.PI*distance/32));
        sum+=(this.data[j-this.base]??0)*w;weight+=w;
      }
      result.push(Math.max(-32768,Math.min(32767,Math.round(sum/weight))));this.out++;
    }
    const drop=Math.max(0,Math.floor(this.out*this.rate/24000)-32-this.base);
    this.data=this.data.slice(drop);this.base+=drop;
    const out=Buffer.alloc(result.length*2);result.forEach((x,i)=>out.writeInt16LE(x,i*2));return out;
  }
}
export function pcmWav(pcm,rate){
  const b=Buffer.alloc(44);b.write('RIFF');b.writeUInt32LE(pcm.length+36,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(rate,24);b.writeUInt32LE(rate*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(pcm.length,40);return Buffer.concat([b,pcm]);
}
