import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import * as THREE from '../dist/assets/vendor/three.module.js';
import {createSpiraModel,SPIRA_SPEC} from '../dist/assets/spira-model.js';
const base=new URL('../dist/',import.meta.url);
const html=fs.readFileSync(new URL('index.html',base),'utf8');
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size,'Unique IDs');
for(const [,url]of html.matchAll(/(?:href|src)="([^"]+)"/g)){
  if(url.startsWith('#')){if(url.length>1)assert(ids.includes(url.slice(1)),`Anchor ${url}`);}
  else if(!url.includes('://'))assert(fs.existsSync(new URL(url,base)),`Missing local asset ${url}`);
}
assert(!/<form\b|type="email"|data-cart|data-checkout/i.test(html),'Preview has no commerce or email collection');
assert(html.includes('Coming soon'));assert(!/\$\d|countdown/i.test(html));
for(const file of ['dist/app.js','dist/assets/viewer.js','dist/assets/spira-model.js'])execFileSync(process.execPath,['--check',file]);
globalThis.document={createElement(){return{getContext(){return{fillRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},fillText(){}};}};}};
const model=createSpiraModel();model.root.updateWorldMatrix(true,true);
const bounds=new THREE.Box3().setFromObject(model.root);assert(Math.abs(bounds.max.y-SPIRA_SPEC.height)<.05);
assert.equal(model.lid.userData.mainOuter*2,90);
for(const obsolete of ['tapered_drink_port_plug','latch_keeper_bridge','captured_same_finish_hinge_axle'])assert(!model.root.getObjectByName(obsolete));
for(const name of ['external_spout_helical_thread','external_helical_thread','hollow_female_threaded_spout_cap'])assert(model.root.getObjectByName(name));
const top=model.lid.userData.spoutTop;
const ray=new THREE.Raycaster(new THREE.Vector3(0,top+3,model.lid.userData.spoutZ),new THREE.Vector3(0,-1,0),0,22);
assert(ray.intersectObjects(model.lid.children,true).some(h=>h.object.name==='solid_overcap_roof'));
assert.equal(model.root.getObjectByName('solid_overcap_roof').geometry.type,'LatheGeometry','Rounded crown');
assert(Math.abs(model.lid.userData.capBase-model.lid.userData.deckTop-1.2)<1e-6,'Close-seated cap');
model.setPose(0,26,-Math.PI*2*1.5);model.root.updateWorldMatrix(true,true);assert.equal(ray.intersectObjects(model.lid.children,true).length,0,'Open continuous drinking passage');
model.setState({section:true});model.root.traverse(o=>{for(const n of o.geometry?.attributes.position.array||[])assert(Number.isFinite(n));});
const css=fs.readFileSync(new URL('style.css',base),'utf8');
const tokens=Object.fromEntries([...css.matchAll(/--([a-z]+):(#[0-9a-f]{6})/g)].map(m=>[m[1],m[2]]));
function lum(hex){const a=hex.slice(1).match(/../g).map(h=>{const v=parseInt(h,16)/255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});return a[0]*.2126+a[1]*.7152+a[2]*.0722;}
const contrast={};for(const [fg,bg]of [['ink','cream'],['muted','cream'],['muted','paper'],['paper','olive'],['sage','olive'],['clay','cream']]){const a=lum(tokens[fg]),b=lum(tokens[bg]),ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);assert(ratio>=4.5,`${fg}/${bg} text contrast`);contrast[`${fg}/${bg}`]=+ratio.toFixed(2);}
model.dispose();
for(const options of [{diameter:72,opening:24},{diameter:94,opening:16}]){
  const variation=createSpiraModel(options);variation.root.updateWorldMatrix(true,true);
  const seatBox=new THREE.Box3().setFromObject(variation.root.getObjectByName('integral_molded_cap_seat'));
  assert(seatBox.max.z<=variation.lid.userData.mainOuter-1.1+.01,'Cap seat must stay on the crown at adjustable body sizes');
  variation.dispose();
}
console.log(JSON.stringify({status:'passed',checks:['local assets and anchors','no commerce or email collection','JavaScript syntax','revision 5 closed dimensions','both threaded closures','rounded close-seated drinking cap','no former flip-top components','open drinking passage','finite cutaway geometry','text color contrast'],contrast},null,2));
