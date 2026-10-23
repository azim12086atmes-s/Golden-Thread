import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const lock=JSON.parse(await fs.readFile(path.join(root,'great-palace/terrain-assets.json'),'utf8'));
const blobHash=b=>createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex');
for(const file of lock.files){
 const dest=path.join(root,file.path);let cached=null;
 try{cached=await fs.readFile(dest);}catch{}
 if(cached&&cached.length===file.size&&blobHash(cached)===file.sha)continue;
 const url=`https://raw.githubusercontent.com/${lock.repository}/${lock.commit}/${file.path}`;
 const response=await fetch(url);if(!response.ok)throw new Error(`Palace asset ${file.path}: HTTP ${response.status}`);
 const bytes=Buffer.from(await response.arrayBuffer());
 if(bytes.length!==file.size||blobHash(bytes)!==file.sha)throw new Error(`Pinned palace asset checksum failed: ${file.path}`);
 await fs.mkdir(path.dirname(dest),{recursive:true});await fs.writeFile(dest,bytes);
}
console.log(`Verified ${lock.files.length} pinned palace terrain assets.`);
