import * as THREE from './vendor/three.module.js';
import {createSpiraModel} from './spira-model.js';

/** Event-driven renderer. No animation loop while idle or offscreen. */
export function createViewer(element,{hero=false,onInteraction=()=>{}}={}){
  const mount=element.querySelector('.canvas-mount');
  const status=element.querySelector('.viewer-status');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(31,1,.5,2000);
  const renderer=new THREE.WebGLRenderer({alpha:true,antialias:devicePixelRatio<2,powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,matchMedia('(max-width:760px)').matches?1.5:2));
  renderer.setClearColor(0,0);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.localClippingEnabled=true;
  const canvas=renderer.domElement;canvas.tabIndex=0;canvas.setAttribute('role','img');canvas.setAttribute('aria-label',hero?'Spira concept bottle. Drag or use left and right arrow keys to rotate.':'Interactive Spira bottle. Drag or use arrow keys to rotate. Use nearby controls to reveal the inside and openings.');
  mount.append(canvas);
  scene.add(new THREE.HemisphereLight(0xfff8ed,hero?0x7b776b:0x5b6e4d,2.1));
  const key=new THREE.DirectionalLight(0xfff5e5,3.0);key.position.set(-180,300,250);key.castShadow=true;key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:-180,right:180,top:330,bottom:-120,near:1,far:900});key.shadow.bias=-.001;key.shadow.normalBias=.24;key.shadow.radius=4;scene.add(key);
  const fill=new THREE.DirectionalLight(0xeaf1e7,1.0);fill.position.set(180,130,-200);scene.add(fill);
  const rim=new THREE.DirectionalLight(0xfff5df,1.25);rim.position.set(110,200,-30);scene.add(rim);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(700,700),new THREE.ShadowMaterial({opacity:hero?.15:.2}));floor.rotation.x=-Math.PI/2;floor.position.y=-1.5;floor.receiveShadow=true;scene.add(floor);
  const model=createSpiraModel();scene.add(model.root);
  let yaw=hero?-.3:-.3,pitch=hero?.12:.22,zoom=1,visible=true,disposed=false,frame=0,animation=0,pointer=null;
  let current={lid:0,cap:0,turn:0},target={...current};
  function draw(){
    frame=0;if(disposed||!visible)return;
    model.root.rotation.set(0,yaw,hero?-.115:0);model.root.updateWorldMatrix(true,true);model.setClipRotation(yaw);
    const bounds=new THREE.Box3().setFromObject(model.root),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
    const tangent=Math.tan(camera.fov*Math.PI/360),vertical=size.y*Math.abs(Math.cos(pitch))+size.z*Math.abs(Math.sin(pitch)),depth=size.y*Math.abs(Math.sin(pitch))+size.z*Math.abs(Math.cos(pitch));
    const fit=(Math.max(vertical/(2*tangent),size.x/(2*tangent*camera.aspect))+depth/2)*(hero?1.13:1.18)*zoom;
    camera.position.set(center.x,center.y+Math.sin(pitch)*fit,center.z+Math.cos(pitch)*fit);camera.lookAt(center);camera.updateMatrixWorld();renderer.render(scene,camera);
  }
  function requestDraw(){if(!frame&&!disposed&&visible)frame=requestAnimationFrame(draw);}
  const resize=new ResizeObserver(()=>{const w=mount.clientWidth,h=mount.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();requestDraw();});resize.observe(mount);
  function applyPose(){model.setPose(current.lid,current.cap,current.turn);requestDraw();}
  function transition(next){
    cancelAnimationFrame(animation);target={...next};
    if(reduced.matches||!visible){current={...target};applyPose();return;}
    const from={...current},start=performance.now();
    function step(now){if(disposed)return;const t=Math.min(1,(now-start)/650),e=1-(1-t)**3;for(const k of Object.keys(target))current[k]=from[k]+(target[k]-from[k])*e;applyPose();if(t<1&&visible)animation=requestAnimationFrame(step);else{current={...target};applyPose();}}
    animation=requestAnimationFrame(step);
  }
  canvas.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0)return;pointer={id:e.pointerId,x:e.clientX,y:e.clientY,type:e.pointerType,startX:e.clientX,startY:e.clientY,drag:false};if(e.pointerType==='mouse')canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointermove',e=>{if(!pointer||e.pointerId!==pointer.id)return;const dx=e.clientX-pointer.x,dy=e.clientY-pointer.y;const horizontal=Math.abs(e.clientX-pointer.startX)>Math.abs(e.clientY-pointer.startY);if(pointer.type==='touch'&&!horizontal&&!pointer.drag)return;if(Math.hypot(e.clientX-pointer.startX,e.clientY-pointer.startY)>5)pointer.drag=true;if(pointer.drag){yaw+=dx*.009;pitch=Math.max(-.6,Math.min(.8,pitch+dy*.003));requestDraw();onInteraction();}pointer.x=e.clientX;pointer.y=e.clientY;});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,()=>{pointer=null;});
  canvas.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();if(e.key==='ArrowLeft')yaw-=.25;if(e.key==='ArrowRight')yaw+=.25;if(e.key==='ArrowUp')pitch=Math.min(.8,pitch+.12);if(e.key==='ArrowDown')pitch=Math.max(-.6,pitch-.12);requestDraw();onInteraction();}});
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();element.classList.remove('is-ready');status.textContent='Interactive preview paused. The product image remains available.';});
  canvas.addEventListener('webglcontextrestored',()=>{element.classList.add('is-ready');status.textContent='Interactive preview restored.';requestDraw();});
  const api={
    setState({section=false,lid=false,spout=false,exploded=false}={}){model.setState({section});yaw=section?-.12:yaw;transition({lid:exploded?42:lid?36:0,cap:exploded?24:spout?26:0,turn:spout||exploded?-1.5*Math.PI*2:0});},
    rotate(delta){yaw+=delta;requestDraw();},
    focus(part){pitch=part==='spout'||part==='lid'?.42:.22;requestDraw();},
    setVisible(value){visible=value;if(!value){cancelAnimationFrame(animation);current={...target};model.setPose(current.lid,current.cap,current.turn);}else requestDraw();},
    dispose(){disposed=true;cancelAnimationFrame(frame);cancelAnimationFrame(animation);resize.disconnect();model.dispose();floor.geometry.dispose();floor.material.dispose();renderer.dispose();canvas.remove();}
  };
  draw();element.classList.add('is-ready');status.textContent='Interactive preview ready.';return api;
}
