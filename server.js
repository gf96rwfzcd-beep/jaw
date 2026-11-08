const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const PORT=process.env.PORT||3000,KEY=process.env.ADMIN_KEY||'',DIR=process.env.DATA_DIR||path.join(__dirname,'data');
const FILE=path.join(DIR,'rsvp.json');fs.mkdirSync(DIR,{recursive:true});
let db={};try{db=JSON.parse(fs.readFileSync(FILE,'utf8'))}catch(e){}
const save=()=>{fs.writeFileSync(FILE+'.tmp',JSON.stringify(db));fs.renameSync(FILE+'.tmp',FILE)};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ok=k=>KEY&&k&&k.length===KEY.length&&crypto.timingSafeEqual(Buffer.from(k),Buffer.from(KEY));
const html=fs.readFileSync(path.join(__dirname,'public','index.html'));
function adminPage(){
  const r=Object.values(db).sort((a,b)=>b.at-a.at),y=r.filter(x=>x.answer==='yes'),n=r.filter(x=>x.answer==='no');
  const row=x=>`<tr><td>${esc(x.name)}</td><td class="${x.answer}">${x.answer==='yes'?'حضور':'اعتذار'}</td><td>${new Date(x.at).toLocaleString('ar-SA',{timeZone:'Asia/Riyadh'})}</td></tr>`;
  return `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>الحضور</title><style>body{font-family:'Noto Naskh Arabic',Geeza Pro,serif;background:#1d4a4f;color:#f7efe6;margin:0;padding:24px;font-size:18px}h1{margin:0 0 16px}.c{display:flex;gap:12px;margin-bottom:20px}.c div{flex:1;background:#2c6166;border-radius:14px;padding:14px;text-align:center}.c b{display:block;font-size:32px;color:#ecc9b4}table{width:100%;border-collapse:collapse}td{padding:10px 6px;border-bottom:1px solid #ffffff22}.yes{color:#9fe3b0}.no{color:#f0a6a0}</style></head><body><h1>قائمة الحضور</h1><div class="c"><div><b>${y.length}</b>سيحضر</div><div><b>${n.length}</b>اعتذر</div><div><b>${r.length}</b>الردود</div></div><table>${r.map(row).join('')||'<tr><td>لا توجد ردود بعد</td></tr>'}</table></body></html>`;
}
http.createServer((req,res)=>{
  const u=new URL(req.url,'http://x');
  if(req.method==='GET'&&u.pathname==='/admin'){
    if(!ok(u.searchParams.get('key')||'')){res.writeHead(404);return res.end('Not found')}
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});return res.end(adminPage());
  }
  if(req.method==='POST'&&u.pathname==='/api/rsvp'){
    let b='';req.on('data',d=>{b+=d;if(b.length>2000)req.destroy()});
    return req.on('end',()=>{try{
      const j=JSON.parse(b),id=String(j.id||'').slice(0,40),name=String(j.name||'').trim().slice(0,60);
      if(!/^[\w-]{8,40}$/.test(id)||!name||!['yes','no'].includes(j.answer))throw 0;
      if(!db[id]&&Object.keys(db).length>=3000)throw 0;
      db[id]={name,answer:j.answer,at:Date.now()};save();
      res.writeHead(200,{'Content-Type':'application/json'});res.end('{"ok":true}');
    }catch(e){res.writeHead(400,{'Content-Type':'application/json'});res.end('{"ok":false}')}});
  }
  if(req.method==='GET'&&(u.pathname==='/'||u.pathname.startsWith('/i/'))){
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache'});return res.end(html);
  }
  res.writeHead(404);res.end('Not found');
}).listen(PORT,()=>console.log('up on '+PORT+(KEY?'':' (ADMIN_KEY not set: admin disabled)')));
