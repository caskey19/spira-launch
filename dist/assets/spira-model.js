// Adapted directly from SPIRA's revision 4 review model. Dimensions in mm.
import * as THREE from './vendor/three.module.js';
export const SPIRA_SPEC=Object.freeze({height:195,diameter:90,depth:10,outsideDepth:1.6,turns:2,wall:3,opening:24});
export function createSpiraModel(options={}){
const params={...SPIRA_SPEC,explode:0,section:false,flip:false,...options};
let product,bodyGroup,bodyMesh,lidGroup,flipGroup,rebuild,updatePose;
const scene=new THREE.Group(),floor={visible:true};let lidDetail=false,yaw=0;
function sanitize(){params.height=Math.max(190,Math.min(250,params.height));}
function fiberTexture(){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=768;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#bfb29b';ctx.fillRect(0,0,768,768);
  let seed=92;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<44000;i++){
    const x=random()*768,y=random()*768,v=random();
    ctx.strokeStyle=v>.5?'rgba(245,237,218,.34)':'rgba(86,74,57,.22)';
    ctx.lineWidth=.2+random()*.9;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+(random()-.4)*11,y+random()*4);ctx.stroke();
  }
  const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;
  map.wrapS=map.wrapT=THREE.RepeatWrapping;map.repeat.set(2,2);return map;
}
const fiber=fiberTexture();
const bodyMaterial=new THREE.MeshStandardMaterial({color:'#f4eee1',map:fiber,bumpMap:fiber,bumpScale:.42,roughness:1,side:THREE.DoubleSide});
const coatingMaterial=new THREE.MeshStandardMaterial({color:'#eee4ce',map:fiber,bumpMap:fiber,bumpScale:.08,roughness:.74,side:THREE.DoubleSide});
const sectionMaterial=new THREE.MeshStandardMaterial({color:'#eee1c9',map:fiber,bumpMap:fiber,bumpScale:.3,roughness:1,side:THREE.DoubleSide});
const sectionPlane=new THREE.Plane(new THREE.Vector3(1,0,0),0);
const lidMaterial=bodyMaterial.clone(); // Exactly the same finish and tint as the body.
const lidInnerMaterial=coatingMaterial.clone();
const sharedMaterials=[bodyMaterial,coatingMaterial,sectionMaterial,lidMaterial,lidInnerMaterial];

function bodyHeight(){return params.height-19.4;}
function outerRadius(y){
  const h=bodyHeight(),t=Math.max(0,Math.min(1,y/h)),r=params.diameter/2;
  if(t<.055)return r*(.86+.07*Math.sin(t/.055*Math.PI/2));
  if(t<.79)return r*(.93+.07*(t-.055)/.735);
  // Hidden recessed neck; the cap meets the full-width body at its lower edge.
  const neckStart=h-8.5,neckEnd=h-6.7;
  if(y<=neckStart)return r;
  const s=Math.max(0,Math.min(1,(y-neckStart)/(neckEnd-neckStart)));
  return r-2.2*s*s*(3-2*s);
}
function ribShape(y,angle){
  const t=y/bodyHeight(),fade=Math.max(0,Math.min(1,(t-.04)/.08,(.95-t)/.08));
  return fade*Math.pow(Math.max(0,Math.cos(2*(angle-params.turns*Math.PI*2*t))),7);
}
function radius(y,angle,inside=false){
  // Interior rib depth does NOT deepen the outside groove.
  const displacement=(inside?params.depth:params.outsideDepth)*ribShape(y,angle);
  return outerRadius(y)-displacement-(inside?params.wall:0);
}
function wallGeometry(){
  const h=bodyHeight(),ny=168,na=192,start=params.section?Math.PI*.27:0,sweep=params.section?Math.PI*1.46:Math.PI*2;
  const vertices=[],uv=[],indices=[],groups=[];
  for(let side=0;side<2;side++)for(let j=0;j<=ny;j++){
    const y=side?h-(h-params.wall)*j/ny:h*j/ny;
    for(let i=0;i<=na;i++){const a=start+sweep*i/na,r=radius(y,a,Boolean(side));vertices.push(Math.sin(a)*r,y,Math.cos(a)*r);uv.push(i/na,j/ny);}
  }
  const row=na+1,layer=(ny+1)*row;
  for(let side=0;side<2;side++){
    const first=indices.length;
    for(let j=0;j<ny;j++)for(let i=0;i<na;i++){const a=side*layer+j*row+i,b=a+row;indices.push(a,a+1,b,b,a+1,b+1);}
    groups.push([first,indices.length-first,side]);
  }
  const first=indices.length;
  for(let i=0;i<na;i++){const a=ny*row+i,b=layer+i;indices.push(a,b,a+1,a+1,b,b+1);}
  if(params.section)for(const end of [0,na])for(let j=0;j<ny;j++){
    const a=j*row+end,b=(j+1)*row+end,c=layer+(ny-j)*row+end,d=layer+(ny-j-1)*row+end;
    indices.push(a,c,b,b,c,d);
  }
  groups.push([first,indices.length-first,2]);
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();
  for(const group of groups)geometry.addGroup(...group);return geometry;
}
function newMesh(geometry,material,parent,part,name){
  if((material===lidMaterial||material===lidInnerMaterial)&&geometry.attributes.uv){
    const positions=geometry.attributes.position,normals=geometry.attributes.normal,uv=geometry.attributes.uv;
    for(let i=0;i<positions.count;i++){
      const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i);
      if(Math.abs(normals?.getY(i)||0)>.65)uv.setXY(i,x/160+.5,z/160+.5);
      else uv.setXY(i,Math.atan2(z,x)/(Math.PI*2),y/bodyHeight());
    }
    uv.needsUpdate=true;
  }
  const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=true;mesh.receiveShadow=true;
  if(part)mesh.userData.part=part;if(name)mesh.name=name;parent.add(mesh);return mesh;
}
function annulus(outer,inner,height,parent,material,part,name){
  const points=[[inner,0],[outer,0],[outer,height],[inner,height],[inner,0]].map(p=>new THREE.Vector2(...p));
  return newMesh(new THREE.LatheGeometry(points,96),material,parent,part,name);
}
function capsuleShape(halfWidth,length=54){
  const shape=new THREE.Shape(),back=halfWidth-2,front=length-halfWidth-2;
  shape.moveTo(-halfWidth,back);shape.lineTo(-halfWidth,front);
  shape.absarc(0,front,halfWidth,Math.PI,0,true);shape.lineTo(halfWidth,back);
  shape.absarc(0,back,halfWidth,0,Math.PI,true);return shape;
}
function flatShape(shape,thickness){
  const geometry=new THREE.ExtrudeGeometry(shape,{depth:thickness,bevelEnabled:false,curveSegments:56});
  geometry.rotateX(-Math.PI/2);return geometry;
}
function roundedBox(w,h,d,r=.8){
  const shape=new THREE.Shape();const x=-w/2,y=-d/2;
  shape.moveTo(x+r,y);shape.lineTo(x+w-r,y);shape.quadraticCurveTo(x+w,y,x+w,y+r);
  shape.lineTo(x+w,y+d-r);shape.quadraticCurveTo(x+w,y+d,x+w-r,y+d);
  shape.lineTo(x+r,y+d);shape.quadraticCurveTo(x,y+d,x,y+d-r);
  shape.lineTo(x,y+r);shape.quadraticCurveTo(x,y,x+r,y);
  return flatShape(shape,h);
}
function brand(){
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=190;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#5c4730';ctx.textAlign='center';ctx.font='400 115px Arial';ctx.fillText('spira',256,125);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const material=new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2});
  const y=bodyHeight()*.65;
  const label=newMesh(new THREE.CylinderGeometry(outerRadius(y)+.25,outerRadius(y-30)+.25,30,64,1,true,-.62,1.24),material,bodyGroup);
  label.position.y=y-15;label.castShadow=false;label.receiveShadow=false;
}
function cavityVolume(){
  const h=bodyHeight(),ny=120,na=120;let volume=0;
  for(let j=0;j<ny;j++){
    const y=params.wall+(h-params.wall)*(j+.5)/ny;let area=0;
    for(let i=0;i<na;i++){const a=(i+.5)*Math.PI*2/na,r=radius(y,a,true);area+=r*r*Math.PI/na;}
    volume+=area*(h-params.wall)/ny;
  }
  return Math.round(volume/1000);
}
function disposeGeometry(group){
  group.traverse(object=>{
    object.geometry?.dispose();
    for(const material of [].concat(object.material||[])){
      if(sharedMaterials.includes(material))continue;
      if(material.map&&material.map!==fiber)material.map.dispose();material.dispose();
    }
  });
}
function neckThread(parent,neckR,h){
  // One continuous helical bead, instead of the old nonfunctional stacked rings.
  const points=[],pitch=2.6,turns=2.15;
  for(let i=0;i<=260;i++){const t=i/260,a=t*turns*Math.PI*2;points.push(new THREE.Vector3(Math.sin(a)*(neckR+.38),h-7+t*turns*pitch,Math.cos(a)*(neckR+.38)));}
  return newMesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),260,.43,8,false),bodyMaterial,parent,'Main lid / neck seal','external_helical_thread');
}
function threadedSkirt(neckR,h){
  const na=160,ny=80,low=h-8.5,high=h+3.4,outer=neckR+2.2;
  const vertices=[],uv=[],indices=[];
  for(let side=0;side<2;side++)for(let j=0;j<=ny;j++){
    const y=side?high-(high-low)*j/ny:low+(high-low)*j/ny;
    for(let i=0;i<=na;i++){
      const a=i/na*Math.PI*2;
      let delta=(y-(h-7)-2.6*a/(Math.PI*2))%2.6;if(delta<0)delta+=2.6;delta=Math.min(delta,2.6-delta);
      const groove=(y>h-7.8&&y<h-1)?.9*Math.exp(-.5*(delta/.52)**2):0;
      const r=side?neckR+.3+groove:outer;
      vertices.push(Math.sin(a)*r,y,Math.cos(a)*r);uv.push(i/na,j/ny);
    }
  }
  const row=na+1,layer=(ny+1)*row;
  for(let side=0;side<2;side++)for(let j=0;j<ny;j++)for(let i=0;i<na;i++){const a=side*layer+j*row+i,b=a+row;indices.push(a,a+1,b,b,a+1,b+1);}
  for(let i=0;i<na;i++){
    const a=i,b=layer+ny*row+i,c=ny*row+i,d=layer+i;
    indices.push(a,b,a+1,a+1,b,b+1,c,c+1,d,d,c+1,d+1);
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}
function spoutCapSleeve(inner,outer,height){
  const vertices=[],uv=[],indices=[],na=128,ny=96;
  for(let side=0;side<2;side++)for(let j=0;j<=ny;j++){
    const y=side?height-height*j/ny:height*j/ny;
    for(let i=0;i<=na;i++){
      const a=i/na*Math.PI*2;
      let d=(y-1-2.6*a/(Math.PI*2))%2.6;if(d<0)d+=2.6;d=Math.min(d,2.6-d);
      const relief=y>.4&&y<7.6?.7*Math.exp(-.5*(d/.43)**2):0;
      const r=side?inner+relief:outer;
      vertices.push(Math.sin(a)*r,y,Math.cos(a)*r);uv.push(i/na,j/ny);
    }
  }
  const row=na+1,layer=(ny+1)*row;
  for(let s=0;s<2;s++)for(let j=0;j<ny;j++)for(let i=0;i<na;i++){const a=s*layer+j*row+i,b=a+row;indices.push(a,a+1,b,b,a+1,b+1);}
  for(let i=0;i<na;i++){const a=i,b=layer+ny*row+i,c=ny*row+i,d=layer+i;indices.push(a,b,a+1,a+1,b,b+1,c,c+1,d,d,c+1,d+1);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
}
function closureGeometry(h,neckR){
  const part='Main lid / neck seal',drinkPart='Drink spout / screw closure';
  const deckBottom=h+.6,deckThickness=2.8,deckTop=deckBottom+deckThickness;
  const portR=params.opening/2,spoutZ=10,spoutH=14,spoutTop=deckTop+spoutH;
  const outer=neckR+2.2,spoutOuter=portR+2.2,capOuter=spoutOuter+2.5;
  lidGroup=new THREE.Group();lidGroup.name='flush_hollow_threaded_main_lid';product.add(lidGroup);
  newMesh(threadedSkirt(neckR,h),lidMaterial,lidGroup,part,'open_bottom_female_threaded_skirt');
  const deck=new THREE.Shape();deck.absarc(0,0,outer,0,Math.PI*2,false);
  const hole=new THREE.Path();hole.absarc(0,-spoutZ,portR,0,Math.PI*2,true);deck.holes.push(hole);
  const deckMesh=newMesh(flatShape(deck,deckThickness),lidMaterial,lidGroup,part,'deck_with_open_drink_aperture');deckMesh.position.y=deckBottom;
  const land=annulus(neckR-.25,neckR-params.wall+.25,.85,lidGroup,lidInnerMaterial,part,'continuous_annular_neck_sealing_land');land.position.y=h-.2;
  const profile=[[portR,0],[spoutOuter,0],[spoutOuter,13.5],[spoutOuter-.2,14],[portR+.25,14],[portR,13.7],[portR,0]].map(p=>new THREE.Vector2(...p));
  const spout=newMesh(new THREE.LatheGeometry(profile,96),lidMaterial,lidGroup,drinkPart,'continuous_open_threaded_drinking_spout');spout.position.set(0,deckTop,spoutZ);
  const points=[];
  for(let i=0;i<=240;i++){const t=i/240,a=t*2.15*Math.PI*2;points.push(new THREE.Vector3(Math.sin(a)*(spoutOuter+.25),deckTop+4.5+t*2.15*2.6,spoutZ+Math.cos(a)*(spoutOuter+.25)));}
  newMesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),240,.28,8,false),lidMaterial,lidGroup,drinkPart,'external_spout_helical_thread');
  // Grip texture is recessed inside the bottle's maximum diameter.
  for(let i=0;i<48;i++){const a=i/48*Math.PI*2;const grip=newMesh(new THREE.CylinderGeometry(.12,.12,6.5,4),lidMaterial,lidGroup,part,'inset_fiber_grip_flute');grip.position.set(Math.sin(a)*(outer-.14),h-3.6,Math.cos(a)*(outer-.14));}
  flipGroup=new THREE.Group();flipGroup.name='removable_screw_spout_overcap';lidGroup.add(flipGroup);
  newMesh(spoutCapSleeve(spoutOuter+.2,capOuter,10.5),lidMaterial,flipGroup,drinkPart,'hollow_female_threaded_spout_cap');
  const roof=newMesh(new THREE.CylinderGeometry(capOuter,capOuter,2,96),lidMaterial,flipGroup,drinkPart,'solid_overcap_roof');roof.position.y=11.5;
  // Flat annular underside meets the drinking rim; no plug enters the bore.
  for(let i=0;i<28;i++){const a=i/28*Math.PI*2;const flute=newMesh(new THREE.CylinderGeometry(.15,.15,8,4),lidMaterial,flipGroup,drinkPart,'small_cap_grip_flute');flute.position.set(Math.sin(a)*(capOuter-.18),5.5,Math.cos(a)*(capOuter-.18));}
  lidGroup.userData={deckTop,spoutTop,portR,spoutZ,capBase:deckTop+3.5,capOuter,mainOuter:outer};
}
updatePose=function(){
  if(!lidGroup)return;
  lidGroup.position.y=params.explode;
  flipGroup.position.set(0,lidGroup.userData.capBase+(params.flip?26:0),lidGroup.userData.spoutZ);
  flipGroup.rotation.set(0,params.flip?-2.15*Math.PI*2:0,0);
  bodyGroup.visible=!lidDetail;floor.visible=!lidDetail;
  for(const material of [lidMaterial,lidInnerMaterial]){material.clippingPlanes=params.section?[sectionPlane]:[];material.clipShadows=true;}
};
rebuild=function(){
  sanitize();if(product){scene.remove(product);disposeGeometry(product);}
  product=new THREE.Group();product.name='SPIRA_FIBER_REV4_mm';scene.add(product);
  bodyGroup=new THREE.Group();bodyGroup.name='integrated_wall_helix_body';product.add(bodyGroup);
  const h=bodyHeight();bodyMesh=newMesh(wallGeometry(),[bodyMaterial,coatingMaterial,sectionMaterial],bodyGroup,'Body / wall helix','shallow_outer_deep_inner_wall');
  const start=params.section?Math.PI*.27:0,sweep=params.section?Math.PI*1.46:Math.PI*2;
  const base=newMesh(new THREE.CylinderGeometry(outerRadius(params.wall),outerRadius(0),params.wall,128,1,false,start,sweep),bodyMaterial,bodyGroup,'Body / wall helix','closed_fiber_base');base.position.y=params.wall/2;
  neckThread(bodyGroup,outerRadius(h),h);closureGeometry(h,outerRadius(h));
  if(!params.section)brand();updatePose();product.rotation.y=yaw;

};

rebuild();
return {
  root:scene,
  get body(){return bodyGroup;},get lid(){return lidGroup;},get cap(){return flipGroup;},
  get params(){return {...params};},
  get metrics(){return {height:params.height,diameter:params.diameter,cavityMl:cavityVolume(),crestSectionMm:params.wall+params.depth-params.outsideDepth};},
  setState(next){const needsGeometry=next.section!==undefined&&next.section!==params.section;Object.assign(params,next);if(needsGeometry)rebuild();else updatePose();},
  setPose(lidLift,capLift,capTurn){lidGroup.position.y=lidLift;flipGroup.position.set(0,lidGroup.userData.capBase+capLift,lidGroup.userData.spoutZ);flipGroup.rotation.set(0,capTurn,0);},
  setClipRotation(angle){sectionPlane.normal.set(Math.cos(angle),0,-Math.sin(angle));sectionPlane.constant=0;},
  dispose(){disposeGeometry(product);for(const m of sharedMaterials)m.dispose();fiber.dispose();scene.clear();}
};
}
