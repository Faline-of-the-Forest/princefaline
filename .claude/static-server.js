const http=require('http'),fs=require('fs'),path=require('path'),url=require('url');
const ROOT=process.argv[2]||process.cwd(), PORT=+(process.argv[3]||8123);
const MIME={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2','.woff':'font/woff','.ico':'image/x-icon'};
http.createServer((req,res)=>{
  let p=decodeURIComponent(url.parse(req.url).pathname);
  let f=path.join(ROOT,p);
  try{ if(fs.statSync(f).isDirectory()) f=path.join(f,'index.html'); }catch{}
  fs.readFile(f,(e,b)=>{
    if(e){res.writeHead(404,{'Content-Type':'text/plain'});return res.end('404');}
    res.writeHead(200,{'Content-Type':MIME[path.extname(f).toLowerCase()]||'application/octet-stream','Cache-Control':'no-store'});
    res.end(b);
  });
}).listen(PORT,()=>console.log('serving '+ROOT+' on http://localhost:'+PORT));
