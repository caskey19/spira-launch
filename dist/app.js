const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const views=new Map();let rendererModule;
const pending=new Map();
async function initViewer(element){
  if(views.has(element))return views.get(element);
  if(pending.has(element))return pending.get(element);
  const job=(async()=>{try{rendererModule??=import('./assets/viewer.js');const {createViewer}=await rendererModule;const view=createViewer(element,{hero:element.dataset.viewer==='hero'});views.set(element,view);if(element.dataset.viewer==='explorer')view.setState(productState);return view;}catch(error){console.warn('Spira 3D fallback:',error);element.querySelector('.viewer-status').textContent='The interactive preview is unavailable. The product image and design descriptions are still available.';element.classList.add('has-fallback');return null;}})();pending.set(element,job);return job;
}
const viewerObserver=new IntersectionObserver(entries=>{for(const entry of entries){const view=views.get(entry.target);if(entry.isIntersecting){initViewer(entry.target).then(v=>v?.setVisible(true));}else view?.setVisible(false);}},{rootMargin:'100px'});
document.querySelectorAll('[data-viewer]').forEach(el=>viewerObserver.observe(el));
const explorer=document.querySelector('[data-viewer="explorer"]');
let productState={section:false,lid:false,spout:false,exploded:false};
const descriptions={
  assembled:{number:'01 — FORM',title:'One considered shape.',copy:'A body-aligned lid, a small screw cap, and a soft spiral you can feel. An everyday object, rethought from the inside out.'},
  inside:{number:'02 — THE HELIX',title:'The mixer is the wall.',copy:'Deeper ribs follow a helix inside the bottle. They’re intended to encourage movement as you shake—without a loose ball or separate insert. Physical mixing tests are still ahead.'},
  exploded:{number:'03 — THE ASSEMBLY',title:'A place for every part.',copy:'A wide filling lid for adding your mix. A small screw cap for drinking. Both closures share the same natural-fiber design direction.'},
  lid:{number:'02 — FILLING LID',title:'Room to make your mix.',copy:'Unscrew the main lid to add water and powder through the wide neck. The recessed neck lets the closed lid follow the bottle’s outline.'},
  spout:{number:'03 — DRINKING CAP',title:'A small twist to sip.',copy:'The hollow screw cap fits over the spout. Remove it to reveal the drinking opening. The cap meets the rim rather than plugging the passage.'},
  body:{number:'01 — WALL HELIX',title:'A twist you can feel.',copy:'Shallow contours outside. Deeper mixing ribs inside. One integrated body, with a warm, tactile fiber finish.'}
};
function describe(key){const d=descriptions[key];document.querySelector('.explorer-number').textContent=d.number;document.getElementById('detail-title').textContent=d.title;document.getElementById('detail-copy').textContent=d.copy;}
function syncControls(){document.querySelectorAll('[data-product-state]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.productState===(productState.exploded?'exploded':productState.section?'inside':'assembled'))));document.querySelector('[data-opening="spout"]').setAttribute('aria-pressed',String(productState.spout||productState.exploded));document.querySelector('[data-opening="lid"]').setAttribute('aria-pressed',String(productState.lid||productState.exploded));document.querySelector('[data-opening="spout"]').innerHTML=(productState.spout||productState.exploded?'Screw cap on':'Unscrew spout')+' <span aria-hidden="true">↗</span>';document.querySelector('[data-opening="lid"]').innerHTML=(productState.lid||productState.exploded?'Close main lid':'Lift main lid')+' <span aria-hidden="true">↑</span>';}
async function updateModel(){syncControls();const view=await initViewer(explorer);view?.setState(productState);}
document.querySelectorAll('[data-product-state]').forEach(button=>button.addEventListener('click',()=>{const state=button.dataset.productState;productState={section:state==='inside',lid:false,spout:state==='inside',exploded:state==='exploded'};document.querySelectorAll('[data-hotspot]').forEach(b=>b.setAttribute('aria-pressed','false'));describe(state);updateModel();}));
document.querySelectorAll('[data-opening]').forEach(button=>button.addEventListener('click',()=>{const key=button.dataset.opening;if(productState.exploded){productState.exploded=false;productState.lid=true;productState.spout=true;}productState[key]=!productState[key];describe(key);updateModel();}));
document.querySelectorAll('[data-rotate]').forEach(button=>button.addEventListener('click',async()=>{const view=await initViewer(explorer);view?.rotate(Number(button.dataset.rotate)*.4);}));
document.querySelectorAll('[data-hotspot]').forEach(button=>button.addEventListener('click',async()=>{const key=button.dataset.hotspot;document.querySelectorAll('[data-hotspot]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));describe(key);productState=key==='body'?{section:true,spout:true,lid:false,exploded:false}:key==='lid'?{section:false,spout:false,lid:true,exploded:false}:{section:false,spout:true,lid:false,exploded:false};await updateModel();views.get(explorer)?.focus(key);}));
// One open answer at a time, using native details/summary keyboard behavior.
document.querySelectorAll('details').forEach(detail=>detail.addEventListener('toggle',()=>{if(detail.open)document.querySelectorAll('details').forEach(other=>{if(other!==detail)other.open=false;});}));
// A short user-triggered transition; no continuous spin or scroll hijacking.
if(!reduced.matches&&'animate' in Element.prototype){document.querySelector('.hero-copy').animate([{opacity:0,transform:'translateY(12px)'},{opacity:1,transform:'translateY(0)'}],{duration:650,easing:'cubic-bezier(.2,.7,.2,1)'});}
window.addEventListener('pagehide',event=>{if(event.persisted)return;viewerObserver.disconnect();for(const view of views.values())view.dispose();});
