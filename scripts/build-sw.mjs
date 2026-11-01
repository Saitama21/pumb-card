import {readdir,readFile,writeFile} from 'node:fs/promises';
import {join,relative} from 'node:path';
const root=new URL('../dist/',import.meta.url).pathname;
const pkg=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8'));
async function scan(dir){
 const result=[];
 for(const ent of await readdir(dir,{withFileTypes:true})){
  const path=join(dir,ent.name);
  if(ent.isDirectory())result.push(...await scan(path));
  else if(ent.isFile()&&ent.name!=='sw.js')result.push('./'+relative(root,path).replaceAll('\\','/'));
 }
 return result;
}
const assets=await scan(root);
const lines=[
 '/* Generated at build time. No external CDN dependencies. */',
 'const CACHE='+JSON.stringify('cnc-toolbox-pro-'+pkg.version)+';',
 "const PREFIX='cnc-toolbox-pro-';",
 'const PRECACHE='+JSON.stringify([...new Set(['./',...assets])])+';',
 "self.addEventListener('install',event=>{",
 " event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(PRECACHE)).then(()=>self.skipWaiting()));",
 '});',
 "self.addEventListener('activate',event=>{",
 ' event.waitUntil((async()=>{',
 '  const names=await caches.keys();',
 '  await Promise.all(names.filter(name=>name.startsWith(PREFIX)&&name!==CACHE).map(name=>caches.delete(name)));',
 '  await self.clients.claim();',
 ' })());',
 '});',
 "self.addEventListener('fetch',event=>{",
 " const req=event.request;if(req.method!=='GET')return;",
 ' const url=new URL(req.url);if(url.origin!==self.location.origin)return;',
 " if(req.mode==='navigate'){",
 '  event.respondWith(fetch(req).then(async response=>{',
 "   if(response.ok){const cache=await caches.open(CACHE);await cache.put('./index.html',response.clone())}",
 '   return response;',
 "  }).catch(async()=>await caches.match('./index.html')||Response.error()));",
 '  return;',
 ' }',
 ' event.respondWith(caches.match(req).then(hit=>hit||fetch(req).then(async response=>{',
 '  if(response.ok){const cache=await caches.open(CACHE);await cache.put(req,response.clone())}',
 '  return response;',
 ' }).catch(()=>Response.error())));',
 '});',
];
await writeFile(join(root,'sw.js'),lines.join('\n')+'\n');
console.log('Offline precache:',assets.length,'assets');
