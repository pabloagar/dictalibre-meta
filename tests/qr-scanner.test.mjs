import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import qrcode from 'qrcode-generator';
import jsQR from 'jsqr';
import {qrTokenFromText,createQrScanner} from '../apps/mobile/qr-scanner.js';
import {createRelay} from '../backend/server.mjs';
const origin='https://dicta.test',token='a'.repeat(64),url=origin+'/mobile#qr='+token;
test('lector real decodifica QR sintético y acepta solo conexión del mismo origen',()=>{
 const qr=qrcode(0,'M');qr.addData(url);qr.make();const scale=5,margin=4,n=qr.getModuleCount(),width=(n+margin*2)*scale,pixels=new Uint8ClampedArray(width*width*4).fill(255);
 for(let y=0;y<n;y++)for(let x=0;x<n;x++)if(qr.isDark(y,x))for(let dy=0;dy<scale;dy++)for(let dx=0;dx<scale;dx++){const at=(((y+margin)*scale+dy)*width+(x+margin)*scale+dx)*4;pixels[at]=pixels[at+1]=pixels[at+2]=0;}
 assert.equal(jsQR(pixels,width,width).data,url);assert.equal(qrTokenFromText(url,origin),token);
 for(const invalid of ['https://evil.test/mobile#qr='+token,origin+'/live#qr='+token,origin+'/mobile?x=1#qr='+token,'javascript:alert(1)',origin+'/mobile#qr=abc'])assert.equal(qrTokenFromText(invalid,origin),null);
});
test('cámara permitida solo en documento móvil, lector y licencia servidos localmente',async t=>{
 const relay=createRelay();relay.server.listen(0,'127.0.0.1');await once(relay.server,'listening');t.after(()=>relay.close());const base='http://127.0.0.1:'+relay.server.address().port;
 for(const [path,policy] of [['/mobile','camera=(self)'],['/','camera=()']]){const r=await fetch(base+path);assert.equal(r.status,200);assert.ok(r.headers.get('permissions-policy').includes(policy));}
 for(const path of ['/qr-scanner.js','/jsqr.js','/jsqr.LICENSE'])assert.equal((await fetch(base+path)).status,200);
});
test('cancelar permiso pendiente detiene cámara tardía sin conectar ni guardar QR',async()=>{
 let resolveCamera,stops=0;const events=[];globalThis.document={hidden:false,createElement:()=>({getContext:()=>({})}),addEventListener(){}};globalThis.window={jsQR(){},addEventListener(){}};
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{mediaDevices:{getUserMedia:()=>new Promise(r=>resolveCamera=r)}}});
 const panel={hidden:true},video={},message={},cancel={focus(){}};let connected=false;
 const scanner=createQrScanner({video,panel,message,cancel,onResult:()=>connected=true,onEvent:(...e)=>events.push(e)});const pending=scanner.start();cancel.onclick();resolveCamera({getTracks:()=>[{stop:()=>stops++}]});await pending;
 assert.equal(stops,1);assert.equal(panel.hidden,true);assert.equal(connected,false);assert.ok(!JSON.stringify(events).includes(token));
});
