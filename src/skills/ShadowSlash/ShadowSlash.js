import {
  Vector3,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Color4,
  ParticleSystem,
  Texture,
  TransformNode,
  PointLight,
  ShaderMaterial,
  Effect
} from "@babylonjs/core";
import { BaseSkill } from "../BaseSkill";

Effect.ShadersStore["shadowSlashVertexShader"] = `
precision highp float;
attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;
uniform mat4 worldViewProjection;
uniform float time;
uniform float segmentIndex;
uniform float totalSegments;
varying vec2 vUV;
varying float vU;
void main() {
  vec3 p = position + normal * (sin(time*18.0 + position.x*2.0) * 0.025);
  gl_Position = worldViewProjection * vec4(p, 1.0);
  vUV = uv;
  vU = (uv.x + segmentIndex) / totalSegments;
}
`;

Effect.ShadersStore["shadowSlashFragmentShader"] = `
precision highp float;
varying vec2 vUV;
varying float vU;
uniform float time;
uniform vec3 colorCore;
uniform vec3 colorEdge;
uniform float alphaMul;

float hash(vec2 p){return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453);} 
float noise(vec2 p){
  vec2 i=floor(p); vec2 f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1.0,0.0)),f.x), mix(hash(i+vec2(0.0,1.0)),hash(i+vec2(1.0,1.0)),f.x), f.y);
}
float fbm(vec2 p){
  float v=0.0; float a=0.5;
  for(int i=0;i<4;i++){v+=a*noise(p); p*=2.0; a*=0.5;} return v;
}

void main(){
  vec2 uv = vUV;
  float swirl = sin((vU*8.0 - time*3.0) + uv.y*6.0) * 0.03;
  uv.x += swirl;
  float n = fbm(vec2(vU*6.0 - time*2.0, uv.y*6.0));
  float edge = 1.0 - abs(uv.y - 0.5)*2.0;
  edge = pow(max(edge,0.0), 2.0);
  float crack = smoothstep(0.35, 0.65, n);
  float lightning = 1.0 - smoothstep(0.01, 0.03, abs(uv.y - 0.5 + (n-0.5)*0.4));
  vec3 col = mix(colorEdge, colorCore, edge);
  col += vec3(0.9,0.8,1.0) * lightning * 1.5;
  col += colorCore * (n*0.5);
  float centerFade = smoothstep(0.0, 0.6, abs(uv.y-0.5));
  float alpha = (edge*0.8 + lightning*0.9 + n*0.2) * alphaMul * (1.0 - (1.0-centerFade)*0.35);
  if(alpha < 0.01) discard;
  gl_FragColor = vec4(col, alpha);
}
`;

Effect.ShadersStore["crackVertexShader"] = `
precision highp float;
attribute vec3 position;
attribute vec2 uv;
uniform mat4 worldViewProjection;
varying vec2 vUV;
void main(){ vUV = uv; gl_Position = worldViewProjection * vec4(position,1.0); }
`;

Effect.ShadersStore["crackFragmentShader"] = `
precision highp float;
varying vec2 vUV;
uniform float time;
uniform vec3 glowColor;
uniform float alphaMul;
float hash(vec2 p){return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453);} 
float noise(vec2 p){vec2 i=floor(p); vec2 f=fract(p); f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1.0,0.0)),f.x),mix(hash(i+vec2(0.0,1.0)),hash(i+vec2(1.0,1.0)),f.x),f.y);} 
float ridged(vec2 p){float n=noise(p); return 1.0-abs(n*2.0-1.0);} 
void main(){
  vec2 uv = vUV*vec2(4.0, 4.0);
  float r = ridged(uv + time*0.6);
  float lines = smoothstep(0.92, 0.97, r);
  float edgeGlow = smoothstep(0.88, 0.92, r);
  vec3 col = mix(vec3(0.0), glowColor, edgeGlow);
  float alpha = mix(0.0, 1.0, lines) * alphaMul;
  if(alpha < 0.01) discard;
  gl_FragColor = vec4(col, alpha);
}
`;

export class ShadowSlash extends BaseSkill {
  constructor(scene, player) {
    super(scene, player, "影斩", 0.0);
  }

  execute() {
    const origin = this.player.mesh.position.clone();
    const dir = this.player.mesh.getDirection(Vector3.Forward());
    const rotY = Math.atan2(dir.x, dir.z);
    this._createEffect(origin.add(new Vector3(0, 0.4, 0)), rotY);
  }

  _createEffect(position, rotation) {
    const scene = this.scene;
    const glowLayer = this.player.glowLayer;
    const radius = 1.7;
    const width = 0.12;
    const duration = 0.22;
    const fadeDuration = 0.5;
    const segments = 32;

    const root = new TransformNode("shadowSlashRoot", scene);
    root.position = position.clone();
    root.rotation.y = rotation - Math.PI/2;

    const light = new PointLight("shadowLight", new Vector3(0,0.6,0), scene);
    light.parent = root;
    light.intensity = 2.6;
    light.diffuse = new Color3(0.5,0.15,0.8);
    light.specular = new Color3(0.6,0.25,1.0);
    light.range = 6;

    const emitter = new TransformNode("shadowEmitter", scene);
    emitter.parent = root;

    const coreTex = this._createCircleTexture(new Color4(0.3,0.05,0.4,1.0), new Color4(0.9,0.8,1.0,1.0));
    const sparkTex = this._createSparkTexture();

    const smokePS = new ParticleSystem("shadowSmoke", 800, scene);
    smokePS.particleTexture = coreTex;
    smokePS.emitter = emitter;
    smokePS.minEmitBox = new Vector3(-0.2,-0.2,-0.2);
    smokePS.maxEmitBox = new Vector3(0.2,0.2,0.2);
    smokePS.color1 = new Color4(0.02,0.02,0.02,0.25);
    smokePS.color2 = new Color4(0.05,0.02,0.07,0.15);
    smokePS.colorDead = new Color4(0,0,0,0);
    smokePS.minSize = 0.15; smokePS.maxSize = 0.35;
    smokePS.minLifeTime = 0.25; smokePS.maxLifeTime = 0.5;
    smokePS.emitRate = 900;
    smokePS.blendMode = ParticleSystem.BLENDMODE_STANDARD;
    smokePS.minEmitPower = 0.3; smokePS.maxEmitPower = 1.2;
    smokePS.start();

    const shardPS = new ParticleSystem("shadowShards", 600, scene);
    shardPS.particleTexture = sparkTex;
    shardPS.emitter = emitter;
    shardPS.minEmitBox = new Vector3(-0.1,-0.1,-0.1);
    shardPS.maxEmitBox = new Vector3(0.1,0.1,0.1);
    shardPS.color1 = new Color4(0.7,0.3,1.0,1.0);
    shardPS.color2 = new Color4(0.4,0.1,0.7,1.0);
    shardPS.colorDead = new Color4(0.1,0.0,0.2,0.0);
    shardPS.minSize = 0.08; shardPS.maxSize = 0.22;
    shardPS.minLifeTime = 0.2; shardPS.maxLifeTime = 0.6;
    shardPS.emitRate = 700;
    shardPS.blendMode = ParticleSystem.BLENDMODE_ADD;
    shardPS.minEmitPower = 2.5; shardPS.maxEmitPower = 6.0;
    shardPS.gravity = new Vector3(0,-4,0);
    shardPS.start();

    const starPS = new ParticleSystem("shadowStars", 300, scene);
    starPS.particleTexture = sparkTex;
    starPS.emitter = emitter;
    starPS.color1 = new Color4(1.0,1.0,1.0,1.0);
    starPS.color2 = new Color4(0.8,0.6,1.0,1.0);
    starPS.colorDead = new Color4(0.2,0.2,0.5,0.0);
    starPS.minSize = 0.05; starPS.maxSize = 0.12;
    starPS.minLifeTime = 0.3; starPS.maxLifeTime = 0.7;
    starPS.emitRate = 500;
    starPS.blendMode = ParticleSystem.BLENDMODE_ADD;
    starPS.minEmitPower = 3.0; starPS.maxEmitPower = 7.0;
    starPS.start();

    const trailSegs = [];
    const energyLayers = [];

    const makeMat = (idx, total) => {
      const m = new ShaderMaterial("shadowMat_"+idx, scene, {vertex:"shadowSlash", fragment:"shadowSlash"}, {
        attributes:["position","normal","uv"],
        uniforms:["worldViewProjection","time","colorCore","colorEdge","alphaMul","segmentIndex","totalSegments"],
        needAlphaBlending:true
      });
      m.setColor3("colorCore", new Color3(0.3,0.05,0.4));
      m.setColor3("colorEdge", new Color3(0.5,0.15,0.8));
      m.setFloat("alphaMul", 1.0);
      m.setFloat("segmentIndex", idx);
      m.setFloat("totalSegments", total);
      m.setFloat("time", 0);
      m.backFaceCulling = false;
      return m;
    };

    const outerMat = new StandardMaterial("outerShadowGlow", scene);
    outerMat.emissiveColor = new Color3(0.3,0.08,0.6);
    outerMat.alpha = 0.28;
    outerMat.disableLighting = true;
    outerMat.backFaceCulling = false;

    let current = 0;
    const fps = 60;
    let frame = 0;

    const obs = scene.onBeforeRenderObservable.add(() => {
      frame++;
      const prog = Math.min(frame / (duration * fps), 1.0);
      const target = Math.floor(prog * segments);
      const ang = Math.PI * (-0.5 + prog);
      emitter.position.x = Math.cos(ang) * radius;
      emitter.position.z = Math.sin(ang) * radius;
      light.position.x = emitter.position.x;
      light.position.z = emitter.position.z;
      light.intensity = 2.6 + Math.sin(frame*0.6)*1.0;

      while(current < target && current < segments){
        const seg = this._createArc(scene, radius, width, current, segments);
        seg.parent = root;
        const mat = makeMat(current, segments);
        seg.material = mat;
        if(glowLayer){ glowLayer.addIncludedOnlyMesh(seg); }
        trailSegs.push({mesh:seg, material:mat, created:frame});

        const inner = this._createArc(scene, radius-0.12, width*0.6, current, segments);
        inner.parent = root;
        const innerMat = new StandardMaterial("innerShadow_"+current, scene);
        innerMat.emissiveColor = new Color3(0.7,0.6,1.0);
        innerMat.alpha = 0.6;
        innerMat.disableLighting = true; innerMat.backFaceCulling = false;
        inner.material = innerMat;
        if(glowLayer){ glowLayer.addIncludedOnlyMesh(inner); }
        energyLayers.push({mesh:inner, material:innerMat, created:frame, type:"inner"});

        const outer = this._createArc(scene, radius+0.22, width*1.4, current, segments);
        outer.parent = root;
        const om = outerMat.clone("outerShadow_"+current);
        outer.material = om;
        energyLayers.push({mesh:outer, material:om, created:frame, type:"outer"});

        const crack = MeshBuilder.CreatePlane("crack_"+current, {size:0.8}, scene);
        crack.parent = root;
        crack.position = new Vector3(Math.cos(ang)*radius*0.8, 0.15, Math.sin(ang)*radius*0.8);
        const cmat = new ShaderMaterial("crackMat_"+current, scene, {vertex:"crack", fragment:"crack"}, {
          attributes:["position","uv"], uniforms:["worldViewProjection","time","glowColor","alphaMul"], needAlphaBlending:true
        });
        cmat.setColor3("glowColor", new Color3(0.6,0.2,1.0));
        cmat.setFloat("alphaMul", 1.0);
        cmat.setFloat("time", 0);
        crack.material = cmat;
        if(glowLayer){ glowLayer.addIncludedOnlyMesh(crack); }
        energyLayers.push({mesh:crack, material:cmat, created:frame, type:"crack"});

        current++;
      }

      const trailFrames = fadeDuration * fps;
      const t = frame * 0.02;
      for(let i=trailSegs.length-1; i>=0; i--){
        const seg = trailSegs[i];
        const age = frame - seg.created;
        if(seg.material instanceof ShaderMaterial){ seg.material.setFloat("time", t); }
        if(age > trailFrames){
          seg.mesh.dispose(); seg.material.dispose(); trailSegs.splice(i,1);
        } else {
          const fp = age / trailFrames;
          if(seg.material instanceof ShaderMaterial){ seg.material.setFloat("alphaMul", 1.0 * (1.0 - fp*fp)); }
          else { seg.material.alpha = 0.9 * (1.0 - fp*fp); }
        }
      }

      for(let i=energyLayers.length-1; i>=0; i--){
        const layer = energyLayers[i];
        const age = frame - layer.created;
        if(layer.material instanceof ShaderMaterial){ layer.material.setFloat("time", t); }
        if(age > trailFrames){
          layer.mesh.dispose(); layer.material.dispose(); energyLayers.splice(i,1);
        } else {
          const fp = age / trailFrames;
          if(layer.type === "inner") layer.material.alpha = 0.6 * (1.0 - fp);
          else if(layer.type === "outer") layer.material.alpha = 0.28 * (1.0 - fp*fp);
          else if(layer.type === "crack") {
            layer.material.setFloat("alphaMul", 1.0 - fp/0.3);
          }
        }
      }

      if(prog >= 1.0){
        if(smokePS.isStarted()) smokePS.stop();
        if(shardPS.isStarted()) shardPS.stop();
        if(starPS.isStarted()) starPS.stop();
      }

      if(trailSegs.length===0 && energyLayers.length===0 && prog>=1.0){
        scene.onBeforeRenderObservable.remove(obs);
        smokePS.dispose(); shardPS.dispose(); starPS.dispose();
        light.dispose(); emitter.dispose(); root.dispose();
      }
    });
  }

  _createArc(scene, radius, width, index, total){
    const start = Math.PI * (-0.5 + index/total);
    const end = Math.PI * (-0.5 + (index+1.0)/total);
    const inner=[]; const outer=[]; const sub=3;
    for(let i=0;i<=sub;i++){
      const t=i/sub; const a=start + (end-start)*t;
      inner.push(new Vector3(Math.cos(a)*(radius - width/2), 0, Math.sin(a)*(radius - width/2)));
      outer.push(new Vector3(Math.cos(a)*(radius + width/2), 0, Math.sin(a)*(radius + width/2)));
    }
    return MeshBuilder.CreateRibbon("shadowArc_"+index, {pathArray:[inner,outer], closeArray:false, closePath:false}, scene);
  }

  _createCircleTexture(inner, outer){
    const size = 64; const c=document.createElement("canvas"); c.width=size; c.height=size;
    const ctx=c.getContext("2d");
    const g=ctx.createRadialGradient(size/2,size/2,0,size/2,size/2,size/2);
    g.addColorStop(0, `rgba(${Math.floor(outer.r*255)},${Math.floor(outer.g*255)},${Math.floor(outer.b*255)},${outer.a})`);
    g.addColorStop(1, `rgba(${Math.floor(inner.r*255)},${Math.floor(inner.g*255)},${Math.floor(inner.b*255)},${inner.a})`);
    ctx.fillStyle=g; ctx.beginPath(); ctx.arc(size/2,size/2,size/2,0,Math.PI*2); ctx.fill();
    return new Texture(c.toDataURL(), this.scene, false, false);
  }

  _createSparkTexture(){
    const size=32; const c=document.createElement("canvas"); c.width=size; c.height=size; const ctx=c.getContext("2d");
    ctx.clearRect(0,0,size,size); ctx.fillStyle="white"; ctx.beginPath(); ctx.arc(size/2,size/2,size*0.12,0,Math.PI*2); ctx.fill();
    return new Texture(c.toDataURL(), this.scene, false, false);
  }
}

export function castShadowSlash(character, direction){
  const skill = new ShadowSlash(character.scene, character);
  const origin = character.mesh.position.clone();
  let rotY;
  if (direction && direction instanceof Vector3) {
    const d = direction.clone(); d.y = 0; d.normalize();
    rotY = Math.atan2(d.x, d.z);
  } else {
    const f = character.mesh.getDirection(Vector3.Forward());
    rotY = Math.atan2(f.x, f.z);
  }
  skill._createEffect(origin.add(new Vector3(0, 0.4, 0)), rotY);
}
