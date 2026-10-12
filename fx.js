(function(){
var RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
// Lottie: pulsing dot next to the open/closed status (self-hosted lottie-web)
var pip=document.querySelector('[data-lottie]');
if(pip&&window.lottie){lottie.loadAnimation({container:pip,renderer:'svg',loop:!RM,autoplay:!RM,path:'dot-pulse.json'});}
// Party spaces: tap to highlight
document.querySelectorAll('.space').forEach(function(s){s.addEventListener('click',function(){
  document.querySelectorAll('.space').forEach(function(o){if(o!==s)o.setAttribute('aria-pressed','false');});
  s.setAttribute('aria-pressed',s.getAttribute('aria-pressed')==='true'?'false':'true');});});

if(RM)return;

// Hero lens: the red dot reveals the bar in full color. Follows cursor/finger, drifts on its own when idle.
var f=document.querySelector('[data-lens]');
if(f){var tx=.6,ty=.42,x=tx,y=ty,idle=0,t0=performance.now(),vis=true;
  function set(e){var r=f.getBoundingClientRect();tx=(e.clientX-r.left)/r.width;ty=(e.clientY-r.top)/r.height;idle=performance.now();}
  f.addEventListener('pointermove',set);f.addEventListener('pointerdown',set);
  new IntersectionObserver(function(es){vis=es[0].isIntersecting;}).observe(f);
  f.style.setProperty('--r',Math.round(f.offsetWidth*.3)+'px');
  addEventListener('resize',function(){f.style.setProperty('--r',Math.round(f.offsetWidth*.3)+'px');});
  (function loop(now){requestAnimationFrame(loop);if(!vis)return;
    if(now-idle>2500){var k=(now-t0)/1000;tx=.5+.28*Math.sin(k*.5);ty=.45+.22*Math.sin(k*.37+1);}
    x+=(tx-x)*.12;y+=(ty-y)*.12;f.style.setProperty('--x',(x*100).toFixed(2)+'%');f.style.setProperty('--y',(y*100).toFixed(2)+'%');})(0);
}

// WebGL: a soft neon red glow behind the hero, with a slow flicker like a sign
var cv=document.querySelector('.hero__gl'),gl=cv&&cv.getContext('webgl',{alpha:true,antialias:false});
if(gl){var vs='attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}',
  fs='precision mediump float;uniform vec2 r;uniform float t;uniform vec2 c;void main(){vec2 uv=(gl_FragCoord.xy-c*r)/r.y;float d=length(uv);float fl=.92+.08*sin(t*7.)*sin(t*1.3);float g=.11/(d+.08)*fl;float ring=smoothstep(.012,.0,abs(d-.24-.01*sin(t)))*.5*fl;vec3 col=vec3(1.,.14,.17)*(g*.55+ring);gl_FragColor=vec4(col,clamp(g*.5+ring,0.,.85));}';
  function sh(type,src){var s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);return s;}
  var pr=gl.createProgram();gl.attachShader(pr,sh(gl.VERTEX_SHADER,vs));gl.attachShader(pr,sh(gl.FRAGMENT_SHADER,fs));gl.linkProgram(pr);gl.useProgram(pr);
  var b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
  var lp=gl.getAttribLocation(pr,'p');gl.enableVertexAttribArray(lp);gl.vertexAttribPointer(lp,2,gl.FLOAT,false,0,0);
  var ur=gl.getUniformLocation(pr,'r'),ut=gl.getUniformLocation(pr,'t'),uc=gl.getUniformLocation(pr,'c');
  gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
  var on=true;new IntersectionObserver(function(es){on=es[0].isIntersecting;}).observe(cv);
  function size(){var d=Math.min(devicePixelRatio,1.5);cv.width=cv.offsetWidth*d;cv.height=cv.offsetHeight*d;gl.viewport(0,0,cv.width,cv.height);}
  size();addEventListener('resize',size);
  (function draw(now){requestAnimationFrame(draw);if(!on)return;var wide=innerWidth>=900;
    gl.uniform2f(ur,cv.width,cv.height);gl.uniform1f(ut,now/1000);gl.uniform2f(uc,wide?.74:.5,wide?.5:.72);gl.drawArrays(gl.TRIANGLES,0,3);})(0);
}

// Menu: hover a brunch dish with a photo and the dot shows it (desktop pointer only)
var peek=document.querySelector('.peek');
if(peek&&matchMedia('(hover:hover)').matches){var pi=peek.querySelector('img');
  document.querySelectorAll('[data-photo]').forEach(function(li){
    li.addEventListener('pointerenter',function(){pi.src=li.dataset.photo;peek.classList.add('on');});
    li.addEventListener('pointerleave',function(){peek.classList.remove('on');});
    li.addEventListener('pointermove',function(e){peek.style.left=(e.clientX+24)+'px';peek.style.top=(e.clientY-90)+'px';});
  });}

if(!window.gsap||!window.ScrollTrigger)return;
gsap.registerPlugin(ScrollTrigger);
// Headline: letters set in like a sign warming up
document.querySelectorAll('[data-split]').forEach(function(l){
  var nodes=[].slice.call(l.childNodes);l.textContent='';
  nodes.forEach(function(n){var wrap=n.nodeType===1?n.cloneNode(false):null,tgt=wrap||l;
    n.textContent.split(/( +)/).forEach(function(w){if(!w)return;if(/^ +$/.test(w)){tgt.appendChild(document.createTextNode(' '));return;}
      var ws=document.createElement('span');ws.style.whiteSpace='nowrap';ws.style.display='inline-block';
      w.split('').forEach(function(ch){var s=document.createElement('span');s.className='ch';s.textContent=ch;ws.appendChild(s);});tgt.appendChild(ws);});
    if(wrap)l.appendChild(wrap);});
  l.setAttribute('aria-hidden','true');});
document.querySelector('.mega').setAttribute('aria-label','Look for the red dot');
gsap.from('.mega .ch',{opacity:0,y:30,duration:.5,stagger:.025,ease:'power3.out'});
gsap.from('.hero__frame',{clipPath:'circle(0% at 50% 45%)',duration:1.2,ease:'power3.inOut',delay:.2});
gsap.from('.hero__copy > :not(.mega)',{opacity:0,y:16,duration:.6,stagger:.08,delay:.5});

// Timeline: the dot rides the rail as you read
var rail=document.querySelector('.tl__rail'),dot=document.querySelector('.tl__dot');
ScrollTrigger.matchMedia({
 '(min-width:900px)':function(){gsap.fromTo(dot,{left:0},{left:function(){return rail.offsetWidth-21;},ease:'none',scrollTrigger:{trigger:'.tl',start:'top 70%',end:'bottom 60%',scrub:.5}});},
 '(max-width:899px)':function(){gsap.fromTo(dot,{top:0},{top:function(){return rail.offsetHeight-21;},ease:'none',scrollTrigger:{trigger:'.tl',start:'top 60%',end:'bottom 60%',scrub:.5}});}
});
gsap.utils.toArray('.tl__item,.card,.ev__card,.space').forEach(function(el){
  gsap.from(el,{opacity:0,y:40,duration:.7,ease:'power2.out',scrollTrigger:{trigger:el,start:'top 88%'}});});

// Reel: real gallery photos, slow push-in frames scrubbed inside the dot, pinned
var rc=document.querySelector('.reel__cv');
if(rc){var ctx=rc.getContext('2d'),N=50,imgs=[],cur=-1,caps=document.querySelectorAll('.reel__cap span');
  for(var i=0;i<N;i++){var im=new Image();im.src='frames/f'+('00'+i).slice(-3)+'.webp';imgs.push(im);}
  function show(i){if(i===cur)return;var im=imgs[i];if(!im.complete||!im.naturalWidth){im.onload=function(){if(cur===-1||cur===i){cur=-2;show(i);}};return;}cur=i;ctx.drawImage(im,0,0,384,480);}
  imgs[0].onload=function(){show(0);};if(imgs[0].complete)show(0);
  var st={f:0};
  gsap.timeline({scrollTrigger:{trigger:'.reel',start:'top top',end:'+=220%',pin:'.reel__pin',scrub:.4,
    onUpdate:function(s){var c=Math.min(4,Math.floor(s.progress*5));caps.forEach(function(e,k){e.style.opacity=k===c?1:0;});}}})
   .to(st,{f:N-1,ease:'none',onUpdate:function(){show(Math.round(st.f));}})
   .fromTo('.reel__dot',{scale:.82},{scale:1.08,ease:'none'},0);
}
})();
