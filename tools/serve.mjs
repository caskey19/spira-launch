import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(fileURLToPath(new URL('../dist/',import.meta.url)));
const port=Number(process.env.PORT||4173);
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.woff2':'font/woff2','.ttf':'font/ttf','.mp4':'video/mp4','.vtt':'text/vtt; charset=utf-8','.md':'text/plain; charset=utf-8','.glb':'model/gltf-binary','.obj':'text/plain'};
const server=http.createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://localhost');let pathname=decodeURIComponent(url.pathname);if(pathname.endsWith('/'))pathname+='index.html';
 const file=path.resolve(root,'.'+pathname);if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403).end('Forbidden');return;}
 const info=await stat(file);if(!info.isFile())throw new Error('Not a file');
 const headers={'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Accept-Ranges':'bytes'};
 const buffer=await readFile(file);
 if(req.headers.range){const match=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range);if(match){const start=Number(match[1]),end=Math.min(match[2]?Number(match[2]):info.size-1,info.size-1);if(start> end||start>=info.size){res.writeHead(416,{'Content-Range':`bytes */${info.size}`}).end();return;}res.writeHead(206,{...headers,'Content-Range':`bytes ${start}-${end}/${info.size}`,'Content-Length':end-start+1});res.end(buffer.subarray(start,end+1));return;}}
 res.writeHead(200,{...headers,'Content-Length':buffer.length});res.end(req.method==='HEAD'?undefined:buffer);
 }catch{res.writeHead(404,{'Content-Type':'text/plain'}).end('Not found');}});
server.listen(port,'127.0.0.1',()=>console.log(`Spira local preview: http://127.0.0.1:${port}`));
