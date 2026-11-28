const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'dist'),pages=Object.keys(require('./src/page-manifest.json'));let localLinks=0,images=0;
for(const page of pages){
const html=fs.readFileSync(path.join(dir,page+'.html'),'utf8');
assert.equal((html.match(/<h1[ >]/g)||[]).length,1,`${page}: main heading`);assert(html.includes('<main id="main">'),`${page}: main landmark`);assert(!/\b(undefined|NaN|TODO)\b|lorem ipsum/i.test(html),`${page}: unfinished text`);
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length,`${page}: duplicate IDs`);
for(const m of html.matchAll(/(?:src|href)="([^"]+)"/g)){const url=m[1];if(/^(https?:|mailto:|data:)/.test(url))continue;const [file,anchor]=url.split('#'),target=file||page+'.html';assert(fs.existsSync(path.join(dir,target)),`${page}: missing ${target}`);localLinks++;if(anchor&&target.endsWith('.html'))assert(fs.readFileSync(path.join(dir,target),'utf8').includes(`id="${anchor}"`),`${page}: missing anchor ${url}`);}
for(const tag of html.matchAll(/<img\b[^>]*>/g)){assert(/\balt="[^"]*"/.test(tag[0]),`${page}: missing image alternative`);images++;}
console.log(`${page}: headings, landmarks, assets, anchors, and image alternatives passed`);
}
for (const script of ['app.js','patient-simulator.js']) new vm.Script(fs.readFileSync(path.join(dir,script),'utf8'));
const standalone=fs.readFileSync(path.join(__dirname,'START-HERE.html'),'utf8');for(const script of standalone.matchAll(/<script>([\s\S]*?)<\/script>/g))new vm.Script(script[1]);assert(!/src="(?:https?:)?\/\//.test(standalone),'Standalone remote asset dependency');
const patientHome=fs.readFileSync(path.join(dir,'index.html'),'utf8');
assert(patientHome.includes('id="patient-simulator"') && patientHome.includes('src="patient-simulator.js"'), 'Home mounts the patient simulator');
const all=pages.map(p=>fs.readFileSync(path.join(dir,p+'.html'),'utf8')).join('\n');for(const phrase of ['Sayed Hussain Ali Shubbar Hasan','myhealthcare.bh@gmail.com','logistic','pharmacy','pending','family','Arabic','0.754','69 application tables'])assert(all.includes(phrase),`Coverage: ${phrase}`);
console.log(`PASS: ${pages.length} pages; ${localLinks} local links/assets; ${images} image alternatives; JS syntax; standalone asset isolation; critical source coverage.`);

