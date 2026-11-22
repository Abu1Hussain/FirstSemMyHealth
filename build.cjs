const fs=require('fs'),path=require('path'),vm=require('vm');
const pages={index:'home',about:'about',services:'services',features:'features',demo:'demo',contact:'contact'};
for(const [name,page] of Object.entries(pages)){
 const nodes={header:{},main:{},footer:{}};
 const doc={body:{dataset:{page}},querySelector:s=>nodes[s]||(s==='.menu'?{addEventListener(){}}:null),querySelectorAll:()=>[],getElementById:()=>null};
 vm.runInNewContext(fs.readFileSync('dist/app.js','utf8'),{document:doc,Date,console},{timeout:1000});
 let html=fs.readFileSync(`dist/${name}.html`,'utf8');
 for(const tag of ['header','main','footer']) html=html.replace(new RegExp(`<${tag}([^>]*)>[\\s\\S]*?<\\/${tag}>`),`<${tag}$1>${nodes[tag].innerHTML}</${tag}>`);
 fs.writeFileSync(`dist/${name}.html`,html);
 if(!html.includes('<h1>'))throw Error('Missing heading '+name);
 for(const m of html.matchAll(/(?:src|href)="([^"]+)"/g)) {const href=m[1];if(/^(https?:|mailto:|#)/.test(href))continue;if(!fs.existsSync(path.join('dist',href.split('#')[0])))throw Error('Broken asset or link '+href);}
 console.log(`${name}.html: rendered, heading and local links verified`);
}
