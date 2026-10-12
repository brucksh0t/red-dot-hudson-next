// Red Dot concept: status (America/New_York, ?now=YYYY-MM-DDTHH:MM preview), tabs, panels.
(function(){
  var DINNER=[17*60,21*60+30], BRUNCH=[11*60,15*60];
  var HOURS={0:[BRUNCH,DINNER],1:[DINNER],2:[DINNER],3:[],4:[],5:[DINNER],6:[BRUNCH,DINNER]};
  var NAMES=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  var TEL='<a href="tel:+15188283657">(518) 828-3657</a>';
  function nyNow(){
    var q=new URLSearchParams(location.search).get('now');
    if(q){var m=q.match(/^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d)/);
      if(m){var d=new Date(Date.UTC(+m[1],m[2]-1,+m[3]));return {day:d.getUTCDay(),min:+m[4]*60+ +m[5]};}}
    var p={};new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'})
      .formatToParts(new Date()).forEach(function(x){p[x.type]=x.value;});
    return {day:['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(p.weekday),min:(+p.hour%24)*60+ +p.minute};
  }
  function fmt(m){var h=Math.floor(m/60),mm=m%60,ap=h>=12?'PM':'AM';h=h%12||12;return h+(mm?':'+(mm<10?'0':'')+mm:'')+' '+ap;}
  function fs(m){var h=Math.floor(m/60),mm=m%60;h=h%12||12;return h+(mm?':'+(mm<10?'0':'')+mm:'');}
  function lab(s){return s===BRUNCH?'Brunch':'Dinner';}
  function next(n){for(var k=1;k<=7;k++){var d=(n.day+k)%7;if(HOURS[d].length)return {d:d,s:HOURS[d][0]};}}
  function compute(n){
    var t=HOURS[n.day],i,s;
    for(i=0;i<t.length;i++){s=t[i];if(n.min>=s[0]&&n.min<s[1]){var left=s[1]-n.min;
      return {cls:left<=30?'is-soon':'is-open',text:(left<=30?'Closing soon · ':'Open now · ')+lab(s)+' until '+fs(s[1]),chip:(left<=30?'Closing soon':'Open now')+' · until '+fs(s[1]),mode:s===BRUNCH?'brunch':'dinner'};}}
    for(i=0;i<t.length;i++){s=t[i];if(n.min<s[0])return {cls:'is-later',text:'Opens '+fmt(s[0])+(s===DINNER?' tonight':' today')+' · '+lab(s)+' until '+fs(s[1]),chip:lab(s)+' at '+fmt(s[0]),mode:s===BRUNCH?'brunch':'dinner'};}
    var x=next(n);
    if(n.day===3||n.day===4)return {cls:'is-closed',unposted:true,text:'Hours aren’t posted today · Next: '+NAMES[x.d]+' '+lab(x.s).toLowerCase()+' '+fmt(x.s[0]),chip:'Hours not posted today · call',mode:'dinner'};
    return {cls:'is-closed',text:'Closed now · Next: '+NAMES[x.d]+' '+lab(x.s).toLowerCase()+' '+fmt(x.s[0]),chip:'Closed · next '+NAMES[x.d].slice(0,3)+' '+fmt(x.s[0]),mode:'dinner'};
  }
  var n=nyNow(),r=compute(n);
  function paint(root){
    root.querySelectorAll('.status').forEach(function(el){el.classList.remove('is-open','is-soon','is-later','is-closed');el.classList.add(r.cls);var t=el.querySelector('[data-status-text]');if(t)t.textContent=r.text;});
    root.querySelectorAll('[data-status-sub]').forEach(function(el){el.innerHTML=(r.unposted?'Wednesday and Thursday hours aren’t posted. Call to confirm: ':'Hours as posted. Wed/Thu and holidays aren’t posted. Call to confirm: ')+TEL;});
    root.querySelectorAll('[data-hours] tr[data-day="'+n.day+'"]').forEach(function(row){row.classList.add('today');});
  }
  paint(document);
  document.querySelectorAll('.hud__chip').forEach(function(c){c.classList.add(r.cls);c.querySelector('[data-chip-text]').textContent='Tonight: '+r.chip;});
  function tabs(root){
    root.querySelectorAll('[role=tablist]').forEach(function(list){
      var ts=[].slice.call(list.querySelectorAll('[role=tab]'));
      function sel(t,focus,quiet){ts.forEach(function(o){var on=o===t;o.setAttribute('aria-selected',on);o.tabIndex=on?0:-1;var p=root.querySelector('#'+o.getAttribute('aria-controls'));if(p)p.hidden=!on;});
        var scope=list.parentNode;scope.querySelectorAll('.plate').forEach(function(f){f.hidden=f.getAttribute('data-for')!==t.getAttribute('aria-controls').replace(/^pn-/,'');});
        if(focus)t.focus();if(!quiet)document.dispatchEvent(new CustomEvent('rd:tab',{detail:t.textContent.trim().toLowerCase()}));}
      ts.forEach(function(t,i){t.addEventListener('click',function(){sel(t);});
        t.addEventListener('keydown',function(e){var k=e.key,j=null;if(k==='ArrowRight'||k==='ArrowDown')j=(i+1)%ts.length;if(k==='ArrowLeft'||k==='ArrowUp')j=(i-1+ts.length)%ts.length;if(k==='Home')j=0;if(k==='End')j=ts.length-1;if(j!==null){e.preventDefault();sel(ts[j],true);}});});
      list._sel=function(name){ts.forEach(function(t){if(t.textContent.trim().toLowerCase()===name)sel(t,false,true);});};
    });
  }
  tabs(document);
  var sheet=document.getElementById('sheet'),body=document.getElementById('sheet-body'),last=null;
  function open(id,opts){
    var src=document.getElementById(id);if(!src||!sheet)return;
    last=document.activeElement;
    var c=src.cloneNode(true);
    c.querySelectorAll('[id]').forEach(function(e){e.id='pn-'+e.id;});
    c.querySelectorAll('[aria-controls],[aria-labelledby]').forEach(function(e){['aria-controls','aria-labelledby'].forEach(function(a){if(e.hasAttribute(a))e.setAttribute(a,'pn-'+e.getAttribute(a));});});
    c.id='pn-'+id;c.removeAttribute('aria-labelledby');
    body.innerHTML='';body.appendChild(c);tabs(body);
    var h=c.querySelector('h2');document.getElementById('sheet-h').textContent=h?h.textContent:'Details';
    sheet.classList.toggle('dark',id==='parties');
    if(opts&&opts.tab){var l=body.querySelector('[role=tablist]');if(l&&l._sel)l._sel(opts.tab);}
    sheet.hidden=false;document.body.classList.add('sheet-open');
    sheet.querySelector('.sheet__in').scrollTop=0;
    document.getElementById('sheet-x').focus();
  }
  function close(){if(!sheet||sheet.hidden)return;sheet.hidden=true;document.body.classList.remove('sheet-open');body.innerHTML='';if(last&&last.focus)last.focus();}
  if(sheet){
    document.getElementById('sheet-x').addEventListener('click',close);
    sheet.addEventListener('click',function(e){if(e.target===sheet)close();});
    document.addEventListener('keydown',function(e){if(e.key==='Escape')close();
      if(e.key==='Tab'&&!sheet.hidden){var f=[].slice.call(sheet.querySelectorAll('a[href],button,[tabindex="0"]')).filter(function(x){return x.offsetParent;});if(!f.length)return;var a=f[0],z=f[f.length-1];
        if(e.shiftKey&&document.activeElement===a){e.preventDefault();z.focus();}else if(!e.shiftKey&&document.activeElement===z){e.preventDefault();a.focus();}}});
  }
  document.addEventListener('click',function(e){var b=e.target.closest('[data-open]');if(!b)return;e.preventDefault();
    var id=b.getAttribute('data-open'),mode=document.body.getAttribute('data-mode');
    if(!document.body.classList.contains('exp')){var s=document.getElementById(id);if(s)s.scrollIntoView();return;}
    open(id,id==='menu'&&mode?{tab:mode}:null);});
  window.__redDot={compute:compute,now:n,status:r,open:open,close:close};
})();
