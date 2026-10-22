
import fs from 'node:fs';
const en=JSON.parse(fs.readFileSync('src/locales/en.json','utf8'));
const ta=JSON.parse(fs.readFileSync('src/locales/ta.json','utf8'));
const flatten=(o,p='')=>Object.entries(o).flatMap(([k,v])=>v&&typeof v==='object'&&!Array.isArray(v)?flatten(v,p+k+'.'):[p+k]);
const keys=['publicLanding','booking','confirmation'];
const a=flatten(Object.fromEntries(keys.map(k=>[k,en[k]])));
const b=flatten(Object.fromEntries(keys.map(k=>[k,ta[k]])));
const missing=a.filter(k=>!b.includes(k)),extra=b.filter(k=>!a.includes(k));
if(missing.length||extra.length){console.error({missing,extra});process.exit(1);}console.log('Public translation keys match.');
