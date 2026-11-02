// Isolated UI fixture: only synthetic data, no audio, credentials, catalogue or real inference.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const files=new Map([['/live','apps/desktop/index.html'],['/receiver.css','apps/shared/style.css'],['/live.js','apps/desktop/live.js'],['/report-editor.js','apps/desktop/report-editor.js'],['/report-review.js','apps/desktop/report-review.js'],['/stream-client.js','apps/desktop/stream-client.js'],['/review-ui.js','apps/shared/review-ui.js'],['/qr.js','node_modules/qrcode-generator/dist/qrcode.js']]);
for(const file of ['report-model.js','lab-timing.js','metrics.js','client.js','protocol.js'])files.set('/shared/'+file,'apps/shared/'+file);
for(const file of fs.readdirSync(path.join(root,'apps/shared/fonts')).filter(f=>f.endsWith('.ttf')))files.set('/shared/fonts/'+file,'apps/shared/fonts/'+file);
const state={demo:false,metaConfigured:true,build:'SYNTHETIC-UI-FIXTURE',sourceHash:null,configs:[{id:'fixture-muse',engine:'muse',name:'Sin glosario',keywords:[]}],runs:[],reviews:[],reviewDocuments:[]};
const templates=[{id:'fixture-tc',name:'TC · ejemplo sintético',category:'TC',text:'TÉCNICA\nTexto sintético para probar la interfaz.\n\nHALLAZGOS\nFragmento de prueba derecho. Medida de prueba: 5 mm.\n\nCONCLUSIÓN\nTexto sintético sin uso clínico.'},{id:'fixture-eco',name:'Ecografía · ejemplo sintético',category:'Ecografía',text:'TÉCNICA\nEjemplo sintético.\n\nHALLAZGOS\nTexto de prueba.\n\nCONCLUSIÓN\nSolo verificación de interfaz.'}];
const server=http.createServer(async(req,res)=>{const url=new URL(req.url,'http://localhost');res.setHeader('Cache-Control','no-store');const json=x=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify(x));};
 if(url.pathname==='/api/state')return json(state);
 if(url.pathname==='/api/templates')return json({templates,summary:{},version:'synthetic-fixture'});
 if(url.pathname==='/api/report-reviews'&&req.method==='POST'){let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>100000){res.writeHead(413);res.end();return;}}const body=JSON.parse(raw);return json({id:'fixture-review',status:'completed',suggestions:[{original:body.text.includes('derecho')?'derecho':body.text.slice(0,12),reason:'Aviso sintético para comprobar navegación; no es una inferencia.',evidence:[]}]});}
 if(url.pathname==='/api/reviews/cancel')return json({status:'cancelled'});
 const file=files.get(url.pathname);if(!file){res.writeHead(404);res.end();return;}let data=fs.readFileSync(path.join(root,file));const ext=path.extname(file);res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.ttf':'font/ttf'})[ext]);
 if(ext==='.html')data=data.toString().replace('src="/desktop.js"','src="/live.js"').replace('</body>','<aside style="position:fixed;bottom:0;right:0;font:11px system-ui;background:#302d28;color:#ebe7dd;padding:3px 8px;z-index:100">PRUEBA AISLADA · SIN AUDIO NI IA REAL</aside></body>');res.end(data);
});
server.listen(8796,'127.0.0.1',()=>console.log('Synthetic desktop UI: http://127.0.0.1:8796/live'));
