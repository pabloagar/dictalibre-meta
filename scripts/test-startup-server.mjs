// Isolated test fixture; no Meta key, no audio, no user data. Stop after measurement.
import fs from 'node:fs';import {createDemo} from '../backend/demo.mjs';
const demo=createDemo({openAccess:true,publicOrigin:'http://127.0.0.1:18976',build:'startup-network-test'});
const listeners=demo.server.listeners('request');demo.server.removeAllListeners('request');
demo.server.on('request',(req,res)=>{if(req.url==='/test-observer.js'){res.setHeader('Content-Type','text/javascript');res.end(fs.readFileSync('scripts/startup-observer.js'));return;}if(req.url==='/live'){const end=res.end;res.end=function(data,...args){return end.call(this,String(data).replace('<script src="/startup.js">','<script src="/test-observer.js"></script><script src="/startup.js">'),...args);};}for(const l of listeners)l.call(demo.server,req,res);});demo.server.listen(18976,'127.0.0.1');
