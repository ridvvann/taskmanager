import './style.css';
import { sb, configured } from './supabase.js';

var CAT={Work:'var(--work)',Productivity:'var(--prod)',Personal:'var(--pers)'};
var STEPS=['Just got it','Designing','Waiting confirmation','Done'],ROLES=['Designed','Marketed','Both'];
var S={tasks:[],projects:[]},view='dash',mode=innerWidth<900?'day':'week',filter='All',cur=new Date(),mini=new Date(),hide={};
cur.setHours(0,0,0,0);mini=new Date(cur.getFullYear(),cur.getMonth(),1);
var H0=7,PX=56;

var user=null,chan=null,pq='';
function mapT(r){return{id:r.id,title:r.title,cat:r.cat,date:r.due_date||'',time:(r.due_time||'').slice(0,5),done:!!r.done}}
function mapP(r){return{id:r.id,name:r.name,size:r.size||'',role:r.role,price:r.price==null?'':+r.price,qty:r.qty,items:Array.isArray(r.items)?r.items:[],invoice:r.invoice_no||'',deadline:r.deadline||'',status:r.status}}
function rowT(t){return{title:t.title,cat:t.cat,due_date:t.date||null,due_time:t.time||null,done:!!t.done}}
function rowP(p){return{name:p.name,size:p.size||'',role:p.role,price:p.price===''?0:+p.price,qty:p.qty,items:p.items||[],invoice_no:p.invoice||null,deadline:p.deadline||null,status:p.status}}
function toast(m){var t=document.getElementById('toast');if(!t){t=document.createElement('div');t.id='toast';t.className='toast';document.body.appendChild(t)}t.textContent=m;t.style.display='block';clearTimeout(t._h);t._h=setTimeout(function(){t.style.display='none'},4000)}
async function pull(){
 var a=await sb.from('tasks').select('*'),b=await sb.from('projects').select('*');
 if(a.error||b.error){toast('Couldn’t load your data: '+(a.error||b.error).message);return}
 S.tasks=a.data.map(mapT);S.projects=b.data.map(mapP);render();
}
async function dbU(tb,id,row){var r=await sb.from(tb).update(row).eq('id',id);if(r.error){toast('Couldn’t save that change. Check your connection.');pull()}}
async function dbD(tb,id){var r=await sb.from(tb).delete().eq('id',id);if(r.error){toast('Couldn’t delete that. Check your connection.');pull()}}
function onChange(p,tb){
 var isT=tb==='tasks',list=isT?S.tasks:S.projects,m=isT?mapT:mapP;
 if(p.eventType==='DELETE'){list=list.filter(function(x){return x.id!=p.old.id})}
 else{var o=m(p.new),i=list.findIndex(function(x){return x.id==o.id});if(i<0)list.push(o);else list[i]=o}
 if(isT)S.tasks=list;else S.projects=list;render();
}
function subscribe(){
 if(chan)sb.removeChannel(chan);
 chan=sb.channel('tempo-'+user.id)
  .on('postgres_changes',{event:'*',schema:'public',table:'tasks'},function(p){onChange(p,'tasks')})
  .on('postgres_changes',{event:'*',schema:'public',table:'projects'},function(p){onChange(p,'projects')})
  .subscribe();
}
async function migrate(){
 try{var r=localStorage.getItem('tempo-v1'),f='tempo-migrated-'+user.id;if(!r||localStorage.getItem(f))return;
 var d=JSON.parse(r),t=(d.tasks||[]).map(rowT),p=(d.projects||[]).map(rowP);
 if(t.length)await sb.from('tasks').insert(t);if(p.length)await sb.from('projects').insert(p);localStorage.setItem(f,'1')}catch(e){}
}
function showSetup(){
 document.body.classList.add('anon');
 document.getElementById('main').innerHTML='<div class="auth card"><h1>One step left</h1><p class="meta" style="margin-top:8px">Add your Supabase keys to the <b>.env</b> file (VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY), then restart the dev server or redeploy.</p></div>';
}
function showAuth(note){
 document.body.classList.add('anon');
 document.getElementById('main').innerHTML='<div class="auth card"><h1>Tempo</h1><p class="meta" style="margin-top:6px">Sign in so your tasks and projects sync across all your devices.</p><label for="a-em">Email</label><input id="a-em" type="email" autocomplete="email"><label for="a-pw">Password</label><input id="a-pw" type="password" autocomplete="current-password" placeholder="At least 6 characters"><p class="err" id="a-err">'+(note||'')+'</p><div class="acts"><button class="btn g" id="a-up">Create account</button><button class="btn" id="a-in">Sign in</button></div></div>';
 async function run(up){
  var e=document.getElementById('a-em').value.trim(),p=document.getElementById('a-pw').value,er=document.getElementById('a-err');
  if(!e||p.length<6){er.textContent='Enter your email and a password of at least 6 characters.';return}
  er.textContent='';
  var r=up?await sb.auth.signUp({email:e,password:p}):await sb.auth.signInWithPassword({email:e,password:p});
  if(r.error){er.textContent=r.error.message;return}
  if(up&&!r.data.session)er.textContent='Check your email to confirm your account, then sign in.';
 }
 document.getElementById('a-in').onclick=function(){run(false)};document.getElementById('a-up').onclick=function(){run(true)};
 document.getElementById('a-pw').onkeydown=function(e){if(e.key==='Enter')run(false)};
}
async function signOut(){await sb.auth.signOut()}
function start(){
 if(!user){S.tasks=[];S.projects=[];if(chan){sb.removeChannel(chan);chan=null}showAuth();return}
 document.body.classList.remove('anon');render();
 migrate().then(pull).then(notifyLate);subscribe();
}
async function boot(){
 if(!configured){showSetup();return}
 var s=(await sb.auth.getSession()).data.session;user=s?s.user:null;
 sb.auth.onAuthStateChange(function(ev,ses){var nu=ses?ses.user:null;if((nu&&nu.id)!==(user&&user.id)){user=nu;start()}});
 start();
 document.addEventListener('visibilitychange',function(){if(!document.hidden&&user)pull()});
 setInterval(function(){if(user&&!document.getElementById('modal').firstChild)render()},60000);
}
function pad(n){return n<10?'0'+n:''+n}
function ymd(d){return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())}
function today(){return ymd(new Date())}
function pd(s){return new Date(s+'T00:00')}
function diff(a,b){return Math.round((Date.parse(a)-Date.parse(b))/864e5)}
function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function money(n){return '$'+(+n||0).toLocaleString(undefined,{maximumFractionDigits:2})}
var COMM=0.05;
var UNIT={cm:1,mm:.1,m:100,in:2.54};
function cmv(v,u){return (+v||0)*(UNIT[u]||1)}
function isSmall(it){var w=cmv(it.w,it.unit),h=cmv(it.h,it.unit);return w>0&&h>0&&w*h<623.7&&((w<=21&&h<=29.7)||(w<=29.7&&h<=21))}
function autoFit(it){var w=cmv(it.w,it.unit),h=cmv(it.h,it.unit);if(!(w>0&&h>0))return 0;return Math.max(Math.floor(21/w)*Math.floor(29.7/h),Math.floor(29.7/w)*Math.floor(21/h))}
function sheets(it){var f=+it.fit||0,q=+it.qty||1;return f>0?Math.ceil(q/f):0}
function itemTotal(it){var q=+it.qty||1,pr=+it.price||0;if(it.type==='dim')return (+it.w||0)*(+it.h||0)*pr*q;if(it.type==='sheet')return pr*sheets(it);return pr*q}
function total(p){if(p.items&&p.items.length)return p.items.reduce(function(s,it){return s+itemTotal(it)},0);return (+p.price||0)*(+p.qty||1)}
function comm(n){return n*COMM}
function blankItem(){return{name:'',type:'fixed',price:'',qty:1,w:'',h:'',unit:'cm',fit:''}}
function nice(d){if(!d)return 'No date';var x=diff(d,today());if(x===0)return 'Today';if(x===1)return 'Tomorrow';if(x===-1)return 'Yesterday';return pd(d).toLocaleDateString(undefined,{weekday:'short',day:'numeric',month:'short'})}
function tm(s){if(!s)return '';var a=s.split(':'),h=+a[0];return (h%12||12)+(a[1]!=='00'?':'+a[1]:'')+(h<12?' AM':' PM')}
function taskLate(t){return !t.done&&t.date&&t.date<today()}
function projLate(p){return p.status<3&&p.deadline&&p.deadline<today()}
function lateText(d){var n=-diff(d,today());return n===1?'1 day late':n+' days late'}
function col(i){return i.k==='proj'?'var(--proj)':CAT[i.o.cat]}
function isLate(i){return i.k==='proj'?projLate(i.o):taskLate(i.o)}
function isDone(i){return i.k==='proj'?i.o.status===3:i.o.done}
function title(i){return i.k==='proj'?i.o.name:i.o.title}
function lateItems(){return S.tasks.filter(taskLate).map(function(t){return{k:'task',o:t,d:t.date}}).concat(S.projects.filter(projLate).map(function(p){return{k:'proj',o:p,d:p.deadline}})).sort(function(a,b){return a.d<b.d?-1:1})}
function itemsOn(d){return S.tasks.filter(function(t){return t.date===d&&!hide[t.cat]}).map(function(t){return{k:'task',o:t,d:d}}).concat(hide.Projects?[]:S.projects.filter(function(p){return p.deadline===d}).map(function(p){return{k:'proj',o:p,d:d}}))}
var IC={dash:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',cal:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 11h18"/>',proj:'<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M3 15l5-5 5 5 3-3 5 5"/>',tasks:'<path d="M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2"/>'};
function renderNav(){
 var h='<div class="brand">Tempo</div>';
 [['dash','Studio'],['cal','Calendar'],['add'],['proj','Projects'],['tasks','Tasks']].forEach(function(it){
  if(it[0]==='add')h+='<button class="add" id="addbtn" aria-label="Add new">+</button>';
  else h+='<button class="n'+(view===it[0]?' on':'')+'" data-v="'+it[0]+'"><svg viewBox="0 0 24 24">'+IC[it[0]]+'</svg>'+it[1]+'</button>';
 });
 h+='<div class="extra">'+miniCal()+'<h2>Scheduled</h2>'+['Work','Productivity','Personal','Projects'].map(function(c){var cl=c==='Projects'?'var(--proj)':CAT[c];return '<button class="flt'+(hide[c]?'':' on')+'" style="--c:'+cl+'" data-flt="'+c+'"><span class="bx">'+(hide[c]?'':'✓')+'</span><span class="t">'+c+'</span></button>'}).join('')+'<h2>Reminders</h2><button class="tb" id="bell" style="width:100%">Turn on late alerts</button><h2>Account</h2><p class="meta" style="margin-bottom:8px;overflow:hidden;text-overflow:ellipsis">'+esc(user?user.email:'')+'</p><button class="tb" id="so" style="width:100%">Sign out</button></div>';
 var n=document.getElementById('nav');n.innerHTML=h;
 n.querySelectorAll('.n').forEach(function(b){b.onclick=function(){view=b.dataset.v;render()}});
 document.getElementById('addbtn').onclick=function(){openTask(null,ymd(cur))};
 n.querySelectorAll('[data-flt]').forEach(function(b){b.onclick=function(){hide[b.dataset.flt]=!hide[b.dataset.flt];view='cal';render()}});
 n.querySelectorAll('[data-md]').forEach(function(b){b.onclick=function(){cur=pd(b.dataset.md);view='cal';render()}});
 var pm=document.getElementById('mp');pm.onclick=function(){mini.setMonth(mini.getMonth()-1);render()};document.getElementById('mn').onclick=function(){mini.setMonth(mini.getMonth()+1);render()};
 document.getElementById('bell').onclick=askNotify;document.getElementById('so').onclick=signOut;
}
function miniCal(){
 var y=mini.getFullYear(),m=mini.getMonth(),st=new Date(y,m,1-new Date(y,m,1).getDay()),t=today(),s=ymd(cur);
 var g=['S','M','T','W','T','F','S'].map(function(x){return '<small>'+x+'</small>'}).join('');
 for(var i=0;i<42;i++){var d=new Date(st);d.setDate(st.getDate()+i);var k=ymd(d);g+='<button data-md="'+k+'" class="'+(d.getMonth()!==m?'out ':'')+(k===t?'td ':'')+(k===s?'sl ':'')+(itemsOn(k).length?'hv':'')+'">'+d.getDate()+'</button>'}
 return '<div class="mini"><div class="mh"><button id="mp" aria-label="Previous month">‹</button>'+mini.toLocaleDateString(undefined,{month:'long',year:'numeric'})+'<button id="mn" aria-label="Next month">›</button></div><div class="g">'+g+'</div></div>';
}
function taskRow(t,sd){
 var c=CAT[t.cat];
 return '<div class="row'+(t.done?' done':'')+(taskLate(t)?' late-b':'')+'" style="--c:'+c+'"><button class="chk" data-tog="'+t.id+'" aria-label="Mark done">'+(t.done?'✓':'')+'</button><button class="t" data-et="'+t.id+'"><b>'+esc(t.title)+'</b><small>'+(taskLate(t)?'<span class="lt">'+lateText(t.date)+'</span>':(sd?nice(t.date):''))+(t.time?' '+tm(t.time):'')+'</small></button><span class="chip">'+t.cat+'</span></div>';
}
function projMini(p){
 var l=projLate(p);
 return '<button class="row'+(l?' late-b':'')+'" style="--c:var(--proj)" data-ep="'+p.id+'"><span class="dot"></span><span class="t"><b>'+esc(p.name)+'</b><small>'+(l?'<span class="lt">'+lateText(p.deadline)+'</span>':'Due '+nice(p.deadline))+' · '+STEPS[p.status]+'</small></span><span class="chip">Project</span></button>';
}
function projCard(p){
 var l=projLate(p);
 var st=STEPS.map(function(s,i){return '<button class="'+(i<=p.status?'on':'')+(i===p.status?' cur':'')+'" data-step="'+p.id+':'+i+'">'+s+'</button>'}).join('');
 return '<div class="card pcard" style="--c:'+(p.status===3?'var(--prod)':l?'var(--late)':'var(--proj)')+'"><button class="hd" data-ep="'+p.id+'"><span><b>'+esc(p.name)+'</b><span class="meta" style="display:block">'+esc(p.size||'No size set')+' · '+ROLES[p.role]+(p.invoice?' · '+esc(p.invoice):'')+'</span></span><span class="chip">'+(p.status===3?'Done':l?lateText(p.deadline):'Due '+nice(p.deadline))+'</span></button><div class="steps">'+st+'</div><div class="money"><span class="meta">'+Math.max(1,(p.items||[]).length)+(((p.items||[]).length>1)?' products':' product')+'<br>Your 5% · '+money(comm(total(p)))+'</span><b>'+money(total(p))+'</b></div></div>';
}
function days(){var a=new Date(cur);if(mode==='day')return [a];return [0,1,2,3,4,5,6].map(function(i){var d=new Date(a);d.setDate(a.getDate()+i);return d})}
function c2(i){return '<button class="c2'+(isLate(i)?' lb':'')+(isDone(i)?' dn':'')+'" style="--c:'+col(i)+'" data-e'+(i.k==='proj'?'p':'t')+'="'+i.o.id+'"><span>'+esc(title(i))+'</span></button>'}
function vWeek(){
 var ds=days(),n=ds.length,t=today(),now=new Date();
 var strip='<div class="strip">'+(function(){var a=new Date(cur);var s='';for(var i=0;i<7;i++){var d=new Date(a);d.setDate(a.getDate()+i);var k=ymd(d);s+='<button class="'+(k===ymd(cur)?'on':'')+'" data-md="'+k+'"><small>'+d.toLocaleDateString(undefined,{weekday:'narrow'})+'</small>'+d.getDate()+'</button>'}return s})()+'</div>';
 var hd='<div></div>'+ds.map(function(d){var k=ymd(d);return '<div class="dh'+(k===t?' td':'')+'"><small>'+d.toLocaleDateString(undefined,{weekday:'short'})+'</small><b>'+d.getDate()+'</b></div>'}).join('');
 var all='<div class="c0">all-day</div>'+ds.map(function(d){return '<div class="ad">'+itemsOn(ymd(d)).filter(function(i){return i.k==='proj'||!i.o.time}).map(function(i){return c2(i).replace('<span>','').replace('</span>','')}).join('')+'</div>'}).join('');
 var hrs='';for(var h=H0;h<=21;h++)hrs+='<div>'+((h%12||12)+(h<12?' AM':' PM'))+'</div>';
 var cols=ds.map(function(d){
  var k=ymd(d),its=itemsOn(k).filter(function(i){return i.k==='task'&&i.o.time}).sort(function(a,b){return a.o.time<b.o.time?-1:1}),ends=[],ln=[];
  its.forEach(function(i,x){var m=+i.o.time.slice(0,2)*60+ +i.o.time.slice(3);i.m=m;var l=0;while(ends[l]>m)l++;ends[l]=m+60;ln[x]=l});
  var nl=Math.max(1,ends.length);
  var b=its.map(function(i,x){var top=Math.max(0,Math.min((i.m-H0*60)/60*PX,14*PX-6));return '<button class="ev'+(isLate(i)?' lb':'')+(isDone(i)?' dn':'')+'" style="--c:'+col(i)+';top:'+top+'px;height:'+(PX-4)+'px;left:calc('+(ln[x]*100/nl)+'% + 2px);width:calc('+(100/nl)+'% - 4px)" data-et="'+i.o.id+'">'+esc(i.o.title)+'<small>'+tm(i.o.time)+' · '+i.o.cat+'</small></button>'}).join('');
  var nw=k===t?'<div class="now" style="top:'+Math.max(0,Math.min(((now.getHours()*60+now.getMinutes())-H0*60)/60*PX,15*PX))+'px"></div>':'';
  return '<div class="col">'+b+nw+'</div>'}).join('');
 return (mode==='day'?strip:'')+'<div class="scroll"><div class="wk n'+n+'" style="--n:'+n+'"><div class="r hd">'+hd+'</div><div class="r adr">'+all+'</div><div class="r"><div class="hrs">'+hrs+'</div>'+cols+'</div></div></div>';
}
function vMonth(){
 var y=cur.getFullYear(),m=cur.getMonth(),st=new Date(y,m,1-new Date(y,m,1).getDay()),t=today();
 var g=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(function(x){return '<div class="dw">'+x+'</div>'}).join('');
 for(var i=0;i<42;i++){var d=new Date(st);d.setDate(st.getDate()+i);var k=ymd(d),its=itemsOn(k);
  g+='<button class="mc'+(d.getMonth()!==m?' out':'')+(k===t?' td':'')+'" data-day="'+k+'"><b>'+d.getDate()+'</b><span class="dd">'+its.slice(0,3).map(c2).join('')+'</span>'+(its.length>3?'<small>+'+(its.length-3)+' more</small>':'')+'</button>'}
 return '<div class="mg">'+g+'</div>';
}
function vCal(){
 var d=cur,tl=mode==='day'?d.toLocaleDateString(undefined,{weekday:'long',day:'numeric',month:'long'}):d.toLocaleDateString(undefined,{month:'long',year:'numeric'});
 return '<div class="bar"><h1>'+tl+'</h1><button class="ib" id="pv" aria-label="Previous">‹</button><button class="tb" id="td">Today</button><button class="ib" id="nx" aria-label="Next">›</button><div class="seg" id="md">'+['day','week','month'].map(function(x){return '<button data-m="'+x+'" class="'+(mode===x?'on':'')+'">'+x[0].toUpperCase()+x.slice(1)+'</button>'}).join('')+'</div><button class="pri" id="new">+ Add</button></div>'+(mode==='month'?vMonth():vWeek());
}

function vDash(){
 var t=today(),cl=['var(--mute)','var(--acc)','var(--proj)','var(--prod)'],by=[0,0,0,0],bank=0,soon=0;
 S.projects.forEach(function(p){var v=total(p);by[p.status]+=v;if(p.status===3)bank+=comm(v);else soon+=comm(v)});
 var all=by.reduce(function(a,b){return a+b},0);
 var river=all?by.map(function(v,i){return v?'<div class="rv" style="flex:'+v+';--c:'+cl[i]+'"><b>'+money(v)+'</b><small>'+STEPS[i]+'</small></div>':''}).join(''):'<div class="empty" style="flex:1;align-self:center">Add a project and your money will flow through here.</div>';
 var W=21,rows=S.projects.filter(function(p){return p.status<3&&p.deadline}).map(function(p){var d=diff(p.deadline,t);return{p:p,d:d,late:d<0,pc:d<0?0:Math.min(d,W)/W*100}}).sort(function(a,b){return a.d-b.d});
 var ticks=[0,7,14,21].map(function(d){var x=new Date();x.setDate(x.getDate()+d);return '<span style="left:'+d/W*100+'%">'+(d?x.toLocaleDateString(undefined,{day:'numeric',month:'short'}):'Today')+'</span>'}).join('');
 var gl=[33.3,66.6,100].map(function(x){return '<i class="gl" style="left:'+x+'%"></i>'}).join('');
 var lanes=rows.length?rows.map(function(r){var c=r.late?'var(--late)':cl[r.p.status],side=r.pc>55?'right:'+(100-r.pc)+'%;margin-right:12px':'left:'+r.pc+'%;margin-left:12px';
  return '<div class="lane" style="--c:'+c+'"><i class="mk" style="left:'+r.pc+'%"></i><button class="pill" style="'+side+'" data-ep="'+r.p.id+'"><b>'+esc(r.p.name)+'</b><small>'+(r.late?'<span class="lt">'+lateText(r.p.deadline)+'</span>':r.d>W?'in '+r.d+' days':nice(r.p.deadline))+' · '+money(total(r.p))+'</small></button></div>'}).join(''):'<div class="empty" style="margin-top:8px">Nothing in the pipeline. Enjoy it.</div>';
 var fb=bank+soon?bank/(bank+soon):0,H=110;
 var jar='<svg viewBox="0 0 120 150" aria-hidden="true"><defs><clipPath id="jc"><rect x="15" y="30" width="90" height="'+H+'" rx="24"/></clipPath></defs><rect x="15" y="30" width="90" height="'+H+'" rx="24" style="fill:var(--proj);opacity:.25"/><rect x="15" y="'+(30+H-H*fb)+'" width="90" height="'+(H*fb)+'" clip-path="url(#jc)" style="fill:var(--prod)"/><rect x="15" y="30" width="90" height="'+H+'" rx="24" style="fill:none;stroke:var(--ink);stroke-width:3"/><rect x="32" y="12" width="56" height="16" rx="6" style="fill:var(--ink)"/></svg>';
 var next=S.tasks.filter(function(x){return !x.done&&x.date>=t}).sort(function(a,b){return (a.date+(a.time||'99'))<(b.date+(b.time||'99'))?-1:1}).slice(0,4);
 return '<div class="bar"><h1>Studio</h1><button class="pri" id="newp">+ Project</button></div><div class="river">'+river+'</div><small class="cap">Where your money sits right now, by stage</small>'+
 '<div class="dgrid"><div class="card"><h2 style="margin:0 0 4px">Deadline runway</h2><small class="meta">Next 3 weeks. Late work is pinned to the start.</small><div class="runw"><div class="runi"><div class="tk">'+ticks+'</div>'+gl+lanes+'</div></div></div>'+
 '<div class="card jar">'+jar+'<div><span class="meta">Your 5% banked</span><b style="color:var(--prod)">'+money(bank)+'</b><span class="meta" style="display:block;margin-top:10px">Still coming</span><b style="color:var(--proj)">'+money(soon)+'</b></div></div></div>'+
 '<h2>Up next</h2><div class="list">'+(next.length?next.map(function(x){return taskRow(x,true)}).join(''):'<div class="empty">No upcoming tasks.</div>')+'</div>';
}
function vProj(){
 var ps=S.projects.filter(function(p){var q=pq.toLowerCase();return !q||(p.name+' '+(p.invoice||'')).toLowerCase().indexOf(q)>-1}).sort(function(a,b){return (a.status===3)-(b.status===3)||(a.deadline<b.deadline?-1:1)});
 var act=S.projects.filter(function(p){return p.status<3}),a=act.reduce(function(s,p){return s+total(p)},0),e=S.projects.filter(function(p){return p.status===3}).reduce(function(s,p){return s+total(p)},0);
 return '<div class="bar"><h1>Projects</h1><button class="pri" id="newp">+ Add</button></div><div class="stats"><div class="card"><span class="meta">Still to earn · '+act.length+' active</span><b>'+money(a)+'</b></div><div class="card"><span class="meta">Finished</span><b>'+money(e)+'</b></div></div><input id="psearch" class="srch" type="search" placeholder="Search by project name or invoice number" value="'+esc(pq)+'" aria-label="Search projects"><div class="plist">'+(ps.length?ps.map(projCard).join(''):'<div class="empty">No projects yet. Tap + and pick Project.</div>')+'</div>';
}
function vTasks(){
 var f=['All','Work','Productivity','Personal'].map(function(c){return '<button class="fchip'+(filter===c?' on':'')+'" data-f="'+c+'">'+c+'</button>'}).join('');
 var ts=S.tasks.filter(function(t){return filter==='All'||t.cat===filter}).sort(function(a,b){return (a.done-b.done)||((a.date||'9')<(b.date||'9')?-1:1)});
 return '<div class="bar"><h1>Tasks</h1><button class="tb mo" data-so>Sign out</button><button class="pri" id="newt">+ Add</button></div><div class="chips">'+f+'</div><div class="list">'+(ts.length?ts.map(function(t){return taskRow(t,true)}).join(''):'<div class="empty">No tasks here yet.</div>')+'</div>';
}
function render(){
 renderNav();
 var l=lateItems(),al=l.length?'<div class="alert"><b>'+l.length+(l.length===1?' thing is late':' things are late')+'</b><div class="list">'+l.slice(0,4).map(function(i){return i.k==='task'?taskRow(i.o):projMini(i.o)}).join('')+'</div></div>':'';
 var m=document.getElementById('main');
 m.innerHTML=al+(view==='dash'?vDash():view==='cal'?vCal():view==='proj'?vProj():vTasks());
 document.title=(l.length?'('+l.length+') ':'')+'Tempo';
 bind(m);
}
function bind(m){
 function on(sel,fn){m.querySelectorAll(sel).forEach(function(b){b.onclick=function(e){e.stopPropagation();fn(b)}})}
 on('[data-tog]',function(b){var t=S.tasks.find(function(x){return x.id==b.dataset.tog});t.done=!t.done;render();dbU('tasks',t.id,{done:t.done})});
 on('[data-et]',function(b){openTask(b.dataset.et)});on('[data-ep]',function(b){openProj(b.dataset.ep)});
 on('[data-step]',function(b){var a=b.dataset.step.split(':');var pj=S.projects.find(function(p){return p.id==a[0]});pj.status=+a[1];render();dbU('projects',pj.id,{status:pj.status})});
 on('[data-so]',function(){signOut()});on('[data-f]',function(b){filter=b.dataset.f;render()});
 on('[data-md]',function(b){cur=pd(b.dataset.md);mini=new Date(cur.getFullYear(),cur.getMonth(),1);render()});
 on('[data-day]',function(b){cur=pd(b.dataset.day);mode='day';render()});
 on('[data-m]',function(b){mode=b.dataset.m;render()});
 function go(n){if(mode==='month')cur=new Date(cur.getFullYear(),cur.getMonth()+n,1);else cur.setDate(cur.getDate()+n*(mode==='day'?1:7));mini=new Date(cur.getFullYear(),cur.getMonth(),1);render()}
 var pv=document.getElementById('pv');if(pv){pv.onclick=function(){go(-1)};document.getElementById('nx').onclick=function(){go(1)};document.getElementById('td').onclick=function(){cur=new Date();cur.setHours(0,0,0,0);mini=new Date(cur.getFullYear(),cur.getMonth(),1);render()};document.getElementById('new').onclick=function(){openTask(null,ymd(cur))}}
 var sq=document.getElementById('psearch');if(sq)sq.oninput=function(){pq=sq.value;render();var n=document.getElementById('psearch');n.focus();n.setSelectionRange(n.value.length,n.value.length)};var a=document.getElementById('newp');if(a)a.onclick=function(){openProj()};a=document.getElementById('newt');if(a)a.onclick=function(){openTask()};
}
function close(){document.getElementById('modal').innerHTML=''}
function sheet(h){var md=document.getElementById('modal');md.innerHTML='<div class="scrim" id="scrim"><div class="sheet" role="dialog" aria-modal="true">'+h+'</div></div>';document.getElementById('scrim').onclick=function(e){if(e.target.id==='scrim')close()}}
function sg(id,o,cur,cl){return '<div class="sg" id="'+id+'">'+o.map(function(x,i){return '<button type="button" data-i="'+i+'" class="'+(i===cur?'on':'')+'" style="--c:'+((cl&&cl[i])||'var(--acc)')+'">'+x+'</button>'}).join('')+'</div>'}
function wire(id,set){var el=document.getElementById(id);el.querySelectorAll('button').forEach(function(b){b.onclick=function(){set(+b.dataset.i);el.querySelectorAll('button').forEach(function(x){x.classList.toggle('on',x===b)})}})}
function tabs(a,date){return '<div class="seg" style="margin-bottom:14px"><button data-tab="t" class="'+(a==='t'?'on':'')+'">Task</button><button data-tab="p" class="'+(a==='p'?'on':'')+'">Project</button></div>'}
function wireTabs(date){document.querySelectorAll('[data-tab]').forEach(function(b){b.onclick=function(){b.dataset.tab==='t'?openTask(null,date):openProj(null,date)}})}
function openTask(id,date){
 var t=id?S.tasks.find(function(x){return x.id==id}):{title:'',cat:'Work',date:date||today(),time:'',done:false};
 var cats=Object.keys(CAT),ci=cats.indexOf(t.cat),dn=t.done?1:0;
 sheet((id?'':tabs('t'))+'<h3>'+(id?'Edit task':'Add schedule')+'</h3><label for="f-title">Title</label><input id="f-title" value="'+esc(t.title)+'" placeholder="e.g. Send invoice to client"><label>Category</label>'+sg('f-cat',cats,ci,[CAT.Work,CAT.Productivity,CAT.Personal])+'<div class="two"><div><label for="f-date">Date</label><input id="f-date" type="date" value="'+esc(t.date)+'"></div><div><label for="f-time">Time (optional)</label><input id="f-time" type="time" value="'+esc(t.time)+'"></div></div>'+(id?'<label>Status</label>'+sg('f-dn',['Open','Done'],dn):'')+'<div class="acts">'+(id?'<button class="btn d" id="del">Delete</button>':'')+'<button class="btn g" id="x">Cancel</button><button class="btn" id="ok">Save</button></div>');
 wire('f-cat',function(i){ci=i});if(id)wire('f-dn',function(i){dn=i});wireTabs(date);
 document.getElementById('x').onclick=close;
 if(id)document.getElementById('del').onclick=function(){S.tasks=S.tasks.filter(function(x){return x.id!=id});close();render();dbD('tasks',id)};
 document.getElementById('ok').onclick=async function(){
  var v=document.getElementById('f-title').value.trim();if(!v){document.getElementById('f-title').focus();return}
  t.title=v;t.cat=cats[ci];t.date=document.getElementById('f-date').value;t.time=document.getElementById('f-time').value;t.done=!!dn;
  close();if(!id){var r=await sb.from('tasks').insert(rowT(t)).select().single();if(r.error){toast('Couldn’t save: '+r.error.message);return}t.id=r.data.id;if(!S.tasks.find(function(x){return x.id==t.id}))S.tasks.push(t)}else await dbU('tasks',id,rowT(t));render();
 };
}
function openProj(id,date){
 var p=id?S.projects.find(function(x){return x.id==id}):{name:'',size:'',role:0,price:0,qty:1,items:[],deadline:date||today(),status:0};
 var ri=p.role,si=p.status;
 var items=(p.items&&p.items.length)?p.items.map(function(x){return Object.assign(blankItem(),x,{w:x.w||'',h:x.h||'',fit:x.fit||''})}):(id&&+p.price?[Object.assign(blankItem(),{name:p.name,price:p.price,qty:p.qty||1})]:[blankItem()]);
 sheet((id?'':tabs('p',date))+'<h3>'+(id?'Edit project':'Add project')+'</h3><label for="p-name">Project name</label><input id="p-name" value="'+esc(p.name)+'" placeholder="e.g. Café menu redesign"><label for="p-inv">Invoice number</label><input id="p-inv" value="'+esc(p.invoice||'')+'" placeholder="e.g. INV-2026-014" autocapitalize="characters"><label>Your part</label>'+sg('p-role',ROLES,ri)+'<label>Products</label><div id="p-items"></div><button type="button" class="btn g" id="p-add" style="width:100%;margin-top:10px">+ Add another product</button><div class="tot"><span>Total</span><span id="p-tot"></span></div><div class="tot" style="margin-top:6px"><span>Your '+(COMM*100)+'% commission</span><span id="p-com" style="color:var(--prod)"></span></div><label for="p-dl">Deadline</label><input id="p-dl" type="date" value="'+esc(p.deadline)+'"><label>Progress</label>'+sg('p-st',STEPS,si,['var(--proj)','var(--proj)','var(--proj)','var(--prod)'])+'<div class="acts">'+(id?'<button class="btn d" id="del">Delete</button>':'')+'<button class="btn g" id="x">Cancel</button><button class="btn" id="ok">Save</button></div>');
 wire('p-role',function(i){ri=i});wire('p-st',function(i){si=i});wireTabs(date);
 var box=document.getElementById('p-items');
 function upd(){var s=0;items.forEach(function(it,i){var v=itemTotal(it);s+=v;var el=box.querySelector('[data-t="'+i+'"]');if(el)el.innerHTML=money(v)+' <small>· 5% '+money(comm(v))+'</small>';var sh=box.querySelector('[data-s="'+i+'"]');if(sh)sh.textContent=(+it.fit>0)?'Sheets of A4 to print: '+sheets(it):'Enter how many fit on one A4'});document.getElementById('p-tot').textContent=money(s);document.getElementById('p-com').textContent=money(comm(s))}
 function draw(){
  box.innerHTML=items.map(function(it,i){var sm=isSmall(it),u=it.unit||'cm',af=autoFit(it);
   if(it.type==='sheet'&&!sm)it.type='fixed';
   var modes=[['fixed','Price each'],['dim','Per '+u+'²']].concat(sm?[['sheet','Per A4 sheet']]:[]);
   return '<div class="it" data-i="'+i+'" data-sm="'+(sm?1:0)+'"><div class="ith"><b class="pn">Product '+(i+1)+'</b>'+(items.length>1?'<button type="button" class="ib" data-rm="1" aria-label="Remove product">×</button>':'')+'</div>'+
   '<input data-k="name" placeholder="Name, e.g. Business card" value="'+esc(it.name)+'" aria-label="Product name" style="margin-top:8px">'+
   '<label>Size (width × height)</label><div class="three"><input data-k="w" type="number" inputmode="decimal" min="0" step="any" placeholder="Width" aria-label="Width" value="'+esc(it.w)+'"><input data-k="h" type="number" inputmode="decimal" min="0" step="any" placeholder="Height" aria-label="Height" value="'+esc(it.h)+'"><select data-k="unit" aria-label="Unit">'+['cm','mm','m','in'].map(function(x){return '<option'+(x===u?' selected':'')+'>'+x+'</option>'}).join('')+'</select></div>'+
   '<label>How many to print</label><input data-k="qty" type="number" inputmode="numeric" min="1" value="'+esc(it.qty)+'">'+
   (sm?'<div class="a4"><b>Smaller than A4</b><div class="two"><div><label>How many fit on one A4</label><input data-k="fit" type="number" inputmode="numeric" min="1" placeholder="e.g. 8" value="'+esc(it.fit)+'"></div><div><label>&nbsp;</label><button type="button" class="btn g" data-auto="'+af+'" style="width:100%">Use auto: '+af+'</button></div></div><small data-s="'+i+'"></small></div>':'')+
   '<label>Pricing</label><div class="sg">'+modes.map(function(m){return '<button type="button" data-ty="'+m[0]+'" class="'+(it.type===m[0]?'on':'')+'">'+m[1]+'</button>'}).join('')+'</div>'+
   '<label>'+(it.type==='dim'?'Price per '+u+'² ($)':it.type==='sheet'?'Price per A4 sheet ($)':'Price each ($)')+'</label><input data-k="price" type="number" inputmode="decimal" min="0" step="any" value="'+esc(it.price)+'">'+
   '<div class="itt"><span>Product total</span><b data-t="'+i+'"></b></div></div>'}).join('');
  box.querySelectorAll('.it').forEach(function(c){var i=+c.dataset.i;
   c.querySelectorAll('[data-k]').forEach(function(f){f.oninput=function(){
    var k=f.dataset.k;items[i][k]=f.value;
    if(k==='unit'||((k==='w'||k==='h')&&(isSmall(items[i])?1:0)!==+c.dataset.sm)){draw();var nf=box.querySelector('.it[data-i="'+i+'"] [data-k="'+k+'"]');if(nf&&k!=='unit'){nf.focus();try{nf.setSelectionRange(nf.value.length,nf.value.length)}catch(e){}}}
    else upd()}});
   c.querySelectorAll('[data-ty]').forEach(function(b){b.onclick=function(){items[i].type=b.dataset.ty;draw()}});
   c.querySelectorAll('[data-auto]').forEach(function(b){b.onclick=function(){items[i].fit=b.dataset.auto;draw()}});
   c.querySelectorAll('[data-rm]').forEach(function(b){b.onclick=function(){items.splice(i,1);draw()}});
  });upd();
 }
 draw();
 document.getElementById('p-add').onclick=function(){items.push(blankItem());draw();var f=box.querySelectorAll('.it');var last=f[f.length-1];last.scrollIntoView({block:'center'});last.querySelector('input').focus()};
 document.getElementById('x').onclick=close;
 if(id)document.getElementById('del').onclick=function(){S.projects=S.projects.filter(function(x){return x.id!=id});close();render();dbD('projects',id)};
 document.getElementById('ok').onclick=async function(){
  var n=document.getElementById('p-name').value.trim();if(!n){document.getElementById('p-name').focus();return}
  p.name=n;p.invoice=document.getElementById('p-inv').value.trim();p.role=ri;p.status=si;p.deadline=document.getElementById('p-dl').value;
  p.items=items.filter(function(it){return (it.name&&it.name.trim())||+it.price}).map(function(it){return{name:(it.name||'').trim(),type:it.type,price:+it.price||0,qty:Math.max(1,+it.qty||1),w:+it.w||0,h:+it.h||0,unit:it.unit||'cm',fit:+it.fit||0}});
  p.size=p.items.filter(function(it){return it.w&&it.h}).map(function(it){return it.w+'×'+it.h+' '+it.unit}).slice(0,2).join(', ');
  p.price=0;p.qty=1;
  close();if(!id){var r=await sb.from('projects').insert(rowP(p)).select().single();if(r.error){toast('Couldn’t save: '+r.error.message);return}p.id=r.data.id;if(!S.projects.find(function(x){return x.id==p.id}))S.projects.push(p)}else await dbU('projects',id,rowP(p));render();
 };
}
function askNotify(){
 try{if(!('Notification' in window)){alert('This browser doesn’t support alerts. Late items still show at the top of every page.');return}
 Notification.requestPermission().then(function(r){if(r==='granted')notifyLate(true);else alert('Alerts are off. Late items still show at the top of every page.')})}catch(e){}
}
function notifyLate(f){
 try{if(!('Notification' in window)||Notification.permission!=='granted')return;
 var l=lateItems();if(!l.length)return;var k='tempo-notified';if(!f&&localStorage.getItem(k)===today())return;localStorage.setItem(k,today());
 new Notification('Tempo: '+l.length+(l.length===1?' item is late':' items are late'),{body:l.slice(0,3).map(function(i){return title(i)}).join(', ')})}catch(e){}
}
boot();
