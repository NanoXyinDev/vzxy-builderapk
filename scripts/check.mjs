import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const files=[];
function walk(dir){for(const ent of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,ent.name);if(ent.isDirectory() && ent.name!=='node_modules')walk(p);else if(ent.isFile()&&p.endsWith('.js'))files.push(p)}}
walk(path.join(root,'api'));walk(path.join(root,'public'));
console.log(`Checking ${files.length} JavaScript files...`);
for(const file of files){const code=fs.readFileSync(file,'utf8');new Function(code);}
for(const file of ['package.json','vercel.json'])JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
console.log('Static checks passed.');
