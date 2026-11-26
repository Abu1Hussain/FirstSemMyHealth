const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'dist');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.mp4':'video/mp4','.webm':'video/webm','.vtt':'text/vtt; charset=utf-8','.txt':'text/plain; charset=utf-8'};
http.createServer((req,res)=>{
 let decoded;try{decoded=decodeURIComponent(req.url.split('?')[0]);}catch{res.writeHead(400).end('Invalid URL');return;}
 const file=path.resolve(root,'.'+(decoded==='/'?'/index.html':decoded));
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end('Forbidden');return;}
 fs.stat(file,(err,stat)=>{if(err||!stat.isFile()){res.writeHead(404).end('Not found');return;}
 res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Accept-Ranges','bytes');
 const range=req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);let start=0,end=stat.size-1;
 if(range){start=Number(range[1]);end=range[2]?Math.min(Number(range[2]),end):end;if(start>end){res.writeHead(416,{'Content-Range':`bytes */${stat.size}`}).end();return;}res.statusCode=206;res.setHeader('Content-Range',`bytes ${start}-${end}/${stat.size}`);}
 res.setHeader('Content-Length',end-start+1);if(req.method==='HEAD'){res.end();return;}const stream=fs.createReadStream(file,{start,end});stream.on('error',()=>res.destroy());stream.pipe(res);
 });
}).listen(5173,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:5173'));
