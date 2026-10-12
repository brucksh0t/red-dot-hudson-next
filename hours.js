// Tonight at Red Dot: open/closed from posted hours, computed in America/New_York.
// Preview any moment with ?now=2026-10-16T18:00 (interpreted as Hudson local time).
(function(){
  var DINNER=[17*60,21*60+30], BRUNCH=[11*60,15*60];
  // 0=Sun..6=Sat. Wed/Thu are not on the posted hours.
  var HOURS={0:[BRUNCH,DINNER],1:[DINNER],2:[DINNER],3:[],4:[],5:[DINNER],6:[BRUNCH,DINNER]};
  var NAMES=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  function nyNow(){
    var q=new URLSearchParams(location.search).get('now');
    if(q){var m=q.match(/^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d)/);
      if(m){var d=new Date(Date.UTC(+m[1],m[2]-1,+m[3]));return {day:d.getUTCDay(),min:+m[4]*60+ +m[5]};}}
    var p={};new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'})
      .formatToParts(new Date()).forEach(function(x){p[x.type]=x.value;});
    return {day:['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(p.weekday),min:(+p.hour%24)*60+ +p.minute};
  }
  function fmt(m){var h=Math.floor(m/60),mm=m%60,ap=h>=12?'PM':'AM';h=h%12||12;return h+(mm?':'+(mm<10?'0':'')+mm:'')+' '+ap;}
  function label(s){return s===BRUNCH?'Brunch':'Dinner';}
  function fmtShort(m){var h=Math.floor(m/60),mm=m%60;h=h%12||12;return h+(mm?':'+(mm<10?'0':'')+mm:'');}
  function next(n){for(var k=1;k<=7;k++){var d=(n.day+k)%7;if(HOURS[d].length)return {d:d,s:HOURS[d][0]};}}
  function compute(n){
    var today=HOURS[n.day],i,s;
    for(i=0;i<today.length;i++){s=today[i];
      if(n.min>=s[0]&&n.min<s[1]){var left=s[1]-n.min;
        return {cls:left<=30?'is-soon':'is-open',text:'Open now · '+label(s)+' until '+fmtShort(s[1])};}}
    for(i=0;i<today.length;i++){s=today[i];
      if(n.min<s[0]) return {cls:'is-later',text:'Opens '+fmt(s[0])+(s===DINNER?' tonight':' today')+' · '+label(s)+' until '+fmtShort(s[1])};}
    var x=next(n);
    if(n.day===3||n.day===4) return {cls:'is-closed',unposted:true,text:'Not on the posted hours today · Next: '+NAMES[x.d]+' '+label(x.s).toLowerCase()+' '+fmt(x.s[0])};
    return {cls:'is-closed',text:'Closed now · Next: '+NAMES[x.d]+' '+label(x.s).toLowerCase()+' '+fmt(x.s[0])};
  }
  var n=nyNow(),r=compute(n),el=document.querySelector('[data-status]');
  if(el){el.classList.add(r.cls);el.querySelector('[data-status-text]').textContent=r.text;}
  var sub=document.querySelector('[data-status-sub]');
  if(sub) sub.innerHTML=(r.unposted?'Wed/Thu hours aren\u2019t posted. Call to confirm: ':'Hours as posted. Wed/Thu and holidays aren\u2019t posted. Call to confirm: ')+'<a href="tel:+15188283657">(518) 828-3657</a>';
  var row=document.querySelector('[data-hours] tr[data-day="'+n.day+'"]');if(row)row.classList.add('today');
  window.__redDot={compute:compute};
})();
