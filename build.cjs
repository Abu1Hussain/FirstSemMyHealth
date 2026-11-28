const fs=require('node:fs'),path=require('node:path');
const {header,footer,esc}=require('./src/components.cjs'),content=require('./src/content.cjs'),details=require('./src/details.cjs');
const root=__dirname,dist=path.join(root,'dist');
const pages={index:{key:'home',title:'One place for your health',render:content.home},about:{key:'about',title:'Our story and team',render:content.about},services:{key:'services',title:'Solutions for patients and clinics',render:content.services},features:{key:'features',title:'Product features',render:content.features},demo:{key:'demo',title:'Explore the demo',render:content.demo},contact:{key:'contact',title:'Contact the team',render:content.contact},'project-details':{key:'details',title:'Project details and roadmap',render:details}};
const team=require('./src/team.cjs');
for(const member of team.members)pages[member.slug]={key:'about',title:member.name+' | '+member.roles.join(' & '),render:()=>team.profile(member.slug)};
const teamStyleMarker='/* Team image hotspots and individual profiles. */';
const css=fs.readFileSync(path.join(dist,'style.css'),'utf8').split(teamStyleMarker)[0].trimEnd()+'\n'+fs.readFileSync(path.join(root,'src/team.css'),'utf8'),js=fs.readFileSync(path.join(root,'src/client.js'),'utf8');fs.writeFileSync(path.join(dist,'style.css'),css);fs.writeFileSync(path.join(dist,'app.js'),js);
const patientSource = name => fs.readFileSync(path.join(root, 'src', name), 'utf8');
const patientCss = patientSource('patient-preview.css');
const clientId = process.env.REPORT_AI_BROWSER_CLIENT_ID?.trim() || '';
const relayUrl = process.env.REPORT_AI_RELAY_URL?.trim() || '';
if (clientId && !/^[A-Za-z0-9_-]{32,128}$/.test(clientId)) throw new Error('REPORT_AI_BROWSER_CLIENT_ID must be a 32–128 character base64url client identifier.');
if (relayUrl && !/^(?:https:\/\/[^\s]+|\/(?!\/)[^\s]+)$/.test(relayUrl)) throw new Error('REPORT_AI_RELAY_URL must be a site-relative path or an HTTPS URL.');
if (clientId && relayUrl) throw new Error('Choose direct browser access or an AI relay.');
const patientAiConfig = JSON.stringify({ gateway: 'https://myhealth-ai-gateway.onrender.com', clientId, relayUrl }).replace(/</g, '\\u003c');
const patientJs = `(() => {\n'use strict';\nconst patientAiConfig = ${patientAiConfig};\n${['patient-ai.js', 'patient-preview.js'].map(patientSource).join('\n')}\nwindow.MyHealthPatient = { init: initPatientPreview };\n})();`;
fs.writeFileSync(path.join(dist, 'patient-preview.css'), patientCss);
fs.writeFileSync(path.join(dist, 'patient-preview.js'), `${patientJs}\nwindow.MyHealthPatient.init();\n`);
const fragments={};
for(const [file,p] of Object.entries(pages)){
 const body=`${header(p.key)}<main id="main">${p.render()}</main>${footer()}`;fragments[file]=body;
 const patientAssets = file === 'index' ? '<link rel="stylesheet" href="patient-preview.css"><script src="patient-preview.js" defer></script>' : '';
 const html=`<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(p.title)} | myhealth</title><meta name="description" content="Explore myhealth: records, appointments, report explanations and clinic work in one University of Bahrain prototype."><meta name="theme-color" content="#102d51"><meta property="og:title" content="${esc(p.title)} | myhealth"><meta property="og:description" content="One place for your health. One clearer way to care."><meta property="og:type" content="website"><link rel="icon" href="assets/logo.png"><link rel="stylesheet" href="style.css"><script src="app.js" defer></script>${patientAssets}</head><body data-page="${p.key}">${body}</body></html>\n`;
 fs.writeFileSync(path.join(dist,`${file}.html`),html);
}
const assets={};for(const name of fs.readdirSync(path.join(dist,'assets'))){if(/\.(png|jpg|webp|svg)$/.test(name)){const ext=path.extname(name).slice(1);assets[`assets/${name}`]=`data:image/${ext==='svg'?'svg+xml':ext};base64,${fs.readFileSync(path.join(dist,'assets',name)).toString('base64')}`;}}
const downloads={};for(const name of ['project-report.txt','project-proposal.txt'])downloads['downloads/'+name]='data:text/plain;charset=utf-8;base64,'+fs.readFileSync(path.join(dist,'downloads',name)).toString('base64');
const safeJSON=x=>JSON.stringify(x).replace(/</g,'\\u003c');
const standaloneScript=`const pages=${safeJSON(fragments)},assets=${safeJSON(assets)},downloads=${safeJSON(downloads)},titles=${safeJSON(Object.fromEntries(Object.entries(pages).map(([k,p])=>[k,p.title])))};
function renderStandalone(){const [page='index',anchor]=location.hash.slice(1).split('/');const key=pages[page]?page:'index';const website=document.getElementById('website');website.innerHTML=pages[key];document.title=titles[key]+' | myhealth';document.querySelectorAll('#website img').forEach(img=>{if(assets[img.getAttribute('src')])img.src=assets[img.getAttribute('src')]});document.querySelectorAll('#website a').forEach(a=>{const href=a.getAttribute('href');if(!href)return;if(downloads[href]){a.href=downloads[href];return}const [f,h]=href.split('#');if(f.endsWith('.html')&&pages[f.slice(0,-5)])a.href='#'+f.slice(0,-5)+(h?'/'+h:'');else if(href.startsWith('#'))a.href='#'+key+'/'+href.slice(1)});window.MyHealthSite.init(website);window.MyHealthPatient.init(website);if(anchor)requestAnimationFrame(()=>document.getElementById(anchor)?.scrollIntoView());else window.scrollTo(0,0)}
window.addEventListener('hashchange',renderStandalone);document.addEventListener('DOMContentLoaded',renderStandalone);`;
fs.writeFileSync(path.join(root,'START-HERE.html'),`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>myhealth | Website preview</title><meta name="theme-color" content="#102d51"><style>${css}\n${patientCss}</style></head><body><div id="website"><p style="padding:30px">Opening myhealth… Enable JavaScript for this standalone preview, or open dist/index.html.</p></div><script>${js}</script><script>${patientJs}</script><script>${standaloneScript}</script></body></html>`);
fs.writeFileSync(path.join(root,'src','page-manifest.json'),JSON.stringify(Object.fromEntries(Object.entries(pages).map(([k,p])=>[k,{key:p.key,title:p.title}])),null,2)+'\n');
fs.writeFileSync(path.join(root,'src','rendered-pages.json'),JSON.stringify(fragments));
console.log(`Built ${Object.keys(pages).length} complete HTML pages and START-HERE.html (${(fs.statSync(path.join(root,'START-HERE.html')).size/1024/1024).toFixed(2)} MB).`);
