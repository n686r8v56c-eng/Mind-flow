import React,{createContext,useContext,useEffect,useRef,useState} from 'react';
const Context=createContext(null);
export const localDay=(d=new Date())=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const FOCUS='https://cntwtmaqyjwtnpybjare.supabase.co';
const FOCUS_KEY='sb_publishable_8tjs1LsNSb2Ro0Hlw7Ka0A_-a60Ak8U';
const box={background:'white',border:'1px solid #e7dfef',borderRadius:18,padding:16,margin:'16px 0',color:'#51425f'};
const button={border:'1px solid #ded3ea',background:'#f4eef9',borderRadius:10,padding:'10px 13px',color:'#765899',font:'inherit',cursor:'pointer'};
const field={width:'100%',padding:12,border:'1px solid #ded3ea',borderRadius:10,fontSize:16,boxSizing:'border-box',background:'white',color:'#51425f'};
export const useActivitySchedule=()=>useContext(Context);
export function ActivityProvider({client,source,children}){
 const [user,setUser]=useState(null),[plans,setPlans]=useState([]),[ready,setReady]=useState(false),[error,setError]=useState(''),[pending,setPending]=useState(null),[date,setDate]=useState(localDay()),[kind,setKind]=useState('new'),[busy,setBusy]=useState(false),[linked,setLinked]=useState(false),[share,setShare]=useState(false),[code,setCode]=useState(''),[message,setMessage]=useState('');
 const generation=useRef(0),lock=useRef(false),active=useRef(null);active.current=user?.id||null;
 async function bridge(action,extra={}){
  const {data,error}=await client.auth.getSession();if(error||!data.session)throw Error('먼저 앱 계정에 로그인해 주세요.');
  const projectUrl=String(import.meta.env.VITE_SUPABASE_URL||'').trim().replace(/\/+$/,'');
  const publicKey=String(import.meta.env.VITE_SUPABASE_ANON_KEY||import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY||'').trim();
  if(!projectUrl||!publicKey)throw Error('Supabase 주소와 공개 키 환경변수를 확인해 주세요.');
  const r=await fetch(FOCUS+'/functions/v1/activity-bridge',{method:'POST',headers:{'Content-Type':'application/json',apikey:FOCUS_KEY,Authorization:'Bearer '+data.session.access_token},body:JSON.stringify({source,action,project_url:projectUrl,public_key:publicKey,...extra}),signal:AbortSignal.timeout(15000)});
  const body=await r.json().catch(()=>({}));if(!r.ok)throw Error((body.error||'Focus Flow 연결 기능 설치와 네트워크를 확인해 주세요.')+(r.status===400?' (Supabase 주소: '+projectUrl+')':''));return body;
 }
 useEffect(()=>{
  if(!client)return;let live=true;
  client.auth.getSession().then(({data,error})=>{if(live){if(error)setError(error.message);setUser(data?.session?.user||null)}});
  const {data:{subscription}}=client.auth.onAuthStateChange((_e,s)=>{if(live)setUser(s?.user||null)});
  return()=>{live=false;subscription.unsubscribe()};
 },[client]);
 useEffect(()=>{
  const g=++generation.current;setPlans([]);setReady(false);setError('');setLinked(false);setPending(null);setShare(false);setBusy(false);lock.current=false;
  if(!user||!client)return;let polling=false;
  const check=async()=>{
   if(polling||lock.current||document.visibilityState==='hidden')return;polling=true;
   try{
    const [p,s]=await Promise.all([client.from('flow_activity_plans').select('*').eq('owner_id',user.id).in('kind',source==='study'?['new','review']:['breath','mantra']).order('date').order('created_at'),client.from('flow_activity_settings').select('share').eq('owner_id',user.id).eq('source',source).maybeSingle()]);
    if(p.error||s.error)throw p.error||s.error;if(g!==generation.current||lock.current)return;
    setPlans(p.data||[]);setShare(s.data?.share===true);setReady(true);setError('');
    try{const link=await bridge('status');if(g!==generation.current)return;setLinked(link.linked===true);if(link.linked){const result=await bridge('sync');if(g===generation.current)setMessage(result.applied===false?'다음 동기화에서 다시 확인할게요.':`Focus Flow 동기화 · ${result.count||0}개 일정`)}}catch(e){if(g===generation.current)setMessage(e.message)}
   }catch(e){if(g===generation.current){setReady(false);setError('일정을 불러오지 못했어요: '+e.message)}}finally{polling=false}
  };
  check();const timer=setInterval(check,12000);window.addEventListener('focus',check);document.addEventListener('visibilitychange',check);
  return()=>{generation.current++;clearInterval(timer);window.removeEventListener('focus',check);document.removeEventListener('visibilitychange',check)};
 },[client,user?.id]);
 async function mutate(fn){
  if(lock.current||!ready||!user)return false;const id=user.id,g=generation.current;lock.current=true;setBusy(true);setError('');
  try{await fn(id);if(g!==generation.current)return false;
   bridge('sync').then(r=>{if(g===generation.current){setLinked(r.linked===true);setMessage(r.linked?`Focus Flow 동기화 · ${r.count||0}개 일정`:'Focus Flow에서 연결 코드를 만들어 주세요.')}}).catch(e=>{if(g===generation.current)setMessage('일정은 저장됐어요. '+e.message)});
   return true}
  catch(e){if(g===generation.current)setError(e.message);return false}
  finally{if(g===generation.current){lock.current=false;setBusy(false)}}
 }
 async function add(e){e.preventDefault();const item=pending;if(!item)return;
  const saved=await mutate(async owner=>{
   const row={id:crypto.randomUUID(),owner_id:owner,date,kind:source==='study'?kind:item.kind,title:item.title,payload:item.payload||{},done:false};
   const r=await client.from('flow_activity_plans').insert(row).select().single();if(r.error)throw r.error;
   if(active.current===owner)setPlans(old=>[...old,r.data]);
  });if(saved)setPending(null);
 }
 async function toggle(row){await mutate(async owner=>{
  const r=await client.from('flow_activity_plans').update({done:!row.done,revision:row.revision+1}).eq('id',row.id).eq('owner_id',owner).eq('revision',row.revision).select().maybeSingle();
  if(r.error)throw r.error;if(!r.data)throw Error('다른 기기에서 일정이 변경됐어요. 잠시 후 다시 체크해 주세요.');
  if(active.current===owner)setPlans(old=>old.map(x=>x.id===row.id?r.data:x));
 })}
 async function toggleShare(value){await mutate(async owner=>{const r=await client.from('flow_activity_settings').upsert({owner_id:owner,source,share:value},{onConflict:'owner_id,source'});if(r.error)throw r.error;if(active.current===owner)setShare(value)})}
 async function connect(){if(busy)return;setBusy(true);try{const r=await bridge('claim',{code:code.trim()});setLinked(r.linked===true);setCode('');setMessage('연결됐어요. Focus Flow에 표시를 켜 주세요.')}catch(e){setMessage(e.message)}finally{setBusy(false)}}
 const open=(item)=>{setDate(localDay());setKind('new');setPending(item);setError('')};
 const context={plans,ready,busy,error,open,toggle,user,connection:{linked,share,code,setCode,connect,toggleShare,message,busy,ready,user,bridge,setLinked,setMessage}};
 return <Context.Provider value={context}>{children}
 {pending&&<div role="dialog" aria-modal="true" aria-label="일정 추가" style={{position:'fixed',inset:0,zIndex:15000,background:'#34273d88',display:'grid',placeItems:'center',padding:16}}><form onSubmit={add} style={{...box,width:'min(100%,480px)',maxHeight:'85dvh',overflowY:'auto',boxSizing:'border-box'}}><h2>일정 추가</h2><p>{pending.title}</p><label>일정 날짜<input type="date" required value={date} onChange={e=>setDate(e.target.value)} style={field}/></label>{source==='study'&&<label>공부 종류<select value={kind} onChange={e=>setKind(e.target.value)} style={field}><option value="new">신규 암기</option><option value="review">복습</option></select></label>}{error&&<p role="alert">{error}</p>}{!user&&<p>계정 메뉴에서 먼저 로그인해 주세요.</p>}<div style={{display:'flex',gap:8,marginTop:16}}><button type="submit" style={button} disabled={busy||!ready}>{busy?'저장 중…':'이 일정에 추가하기'}</button><button type="button" style={button} disabled={busy} onClick={()=>setPending(null)}>닫기</button></div></form></div>}
 </Context.Provider>;
}
export function ActivityConnection(){
 const {connection:c}=useActivitySchedule();
 const [open,setOpen]=useState(false);
 return <section style={box}><button type="button" style={{...button,width:'100%',textAlign:'left'}} onClick={()=>setOpen(v=>!v)}>Focus Flow 연결 · {c.linked?'연결됨':'설정'}</button>{open&&<div style={{marginTop:14}}>{c.linked?<><label style={{display:'flex',gap:8,alignItems:'center'}}><input type="checkbox" style={{width:22,height:22,flexShrink:0,accentColor:"#a38ac3"}} checked={c.share} disabled={!c.ready||c.busy} onChange={e=>c.toggleShare(e.target.checked)}/>Focus Flow에 표시</label><p style={{fontSize:12}}>켜면 일정 제목·날짜·종류·완료 상태를 보내요. 논점 본문·메모·수행 기록은 보내지 않아요.</p><button type="button" style={button} disabled={c.busy} onClick={async()=>{try{const r=await c.bridge('sync');c.setLinked(r.linked===true);c.setMessage(r.linked?`동기화했어요 · ${r.count||0}개 일정`:'연결이 해제됐어요.')}catch(e){c.setMessage(e.message)}}}>지금 동기화</button> <button type="button" style={button} onClick={async()=>{if(!window.confirm('Focus Flow 연결만 해제할까요? 일정과 기록은 보존돼요.'))return;try{await c.bridge('disconnect');c.setLinked(false);c.setMessage('연결을 해제했어요.')}catch(e){c.setMessage(e.message)}}}>연결 해제</button></>:<><p>Focus Flow의 연결 설정에서 만든 코드를 입력해 주세요.</p><input aria-label="Focus Flow 연결 코드" style={field} value={c.code} onChange={e=>c.setCode(e.target.value)} autoCapitalize="none" autoComplete="off"/><button type="button" style={{...button,marginTop:10}} disabled={!c.user||!c.code.trim()||c.busy} onClick={c.connect}>계정 연결하기</button></>}{c.message&&<p role="status" style={{fontSize:13}}>{c.message}</p>}</div>}</section>;
}
export function ScheduleButton({item}){const s=useActivitySchedule();return <button type="button" style={button} onClick={()=>s.open(item)}>＋ 일정 추가</button>}
export function ActivityList({date=localDay(),title='오늘 할 공부',onOpen}){
 const s=useActivitySchedule(),rows=s.plans.filter(x=>x.date===date);
 const label={new:'신규 암기',review:'복습',breath:'호흡',mantra:'만트라'};
 return <section style={box}><h2>{title}</h2>{!s.user?<p>계정 메뉴에서 로그인하면 날짜별 일정을 저장할 수 있어요.</p>:s.error?<p role="alert">{s.error}</p>:!s.ready?<p>일정 불러오는 중…</p>:rows.length===0?<p style={{color:'#9a8ca7'}}>등록된 일정이 없어요.</p>:<ul style={{listStyle:'none',padding:0,margin:0}}>{rows.map(row=><li key={row.id} style={{display:'flex',alignItems:'center',gap:8,padding:'12px 0',borderBottom:'1px solid #eee8f3',color:row.done?'#9d95a5':'#51425f'}}><button type="button" role="checkbox" aria-checked={row.done} aria-label={`${row.title} 완료`} style={{...button,minWidth:44,minHeight:44,padding:6}} disabled={s.busy} onClick={()=>s.toggle(row)}>{row.done?'✓':'○'}</button><button type="button" style={{flex:1,textAlign:'left',padding:8,border:0,background:'transparent',font:'inherit',color:'inherit'}} onClick={()=>onOpen(row)}><b style={{textDecoration:row.done?'line-through':'none',overflowWrap:'anywhere'}}>{row.title}</b><small style={{display:'block',marginTop:4}}>{label[row.kind]||row.kind} · 열기 →</small></button></li>)}</ul>}</section>;
}
export function ActivityCalendar({onOpen,title='공부 일정'}){
 const s=useActivitySchedule(),[date,setDate]=useState(localDay()),[month,setMonth]=useState(()=>localDay().slice(0,7));
 const [y,m]=month.split('-').map(Number),count=new Date(y,m,0).getDate(),offset=new Date(y,m-1,1).getDay();
 const move=n=>setMonth(localDay(new Date(y,m-1+n,1)).slice(0,7));
 return <><section style={box}><h1>{title}</h1><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}><button type="button" style={button} aria-label="이전 달" onClick={()=>move(-1)}>‹</button><b>{y}년 {m}월</b><button type="button" style={button} aria-label="다음 달" onClick={()=>move(1)}>›</button></div><div style={{display:'grid',gridTemplateColumns:'repeat(7,minmax(0,1fr))',gap:3,textAlign:'center'}}>{['일','월','화','수','목','금','토'].map(x=><small key={x}>{x}</small>)}{Array.from({length:offset},(_,i)=><span key={'pad'+i}/>)}{Array.from({length:count},(_,i)=>{const day=`${month}-${String(i+1).padStart(2,'0')}`,rows=s.plans.filter(p=>p.date===day);return <button type="button" key={day} onClick={()=>setDate(day)} aria-label={`${day} 일정 ${rows.length}개`} aria-pressed={date===day} style={{padding:'8px 0',minHeight:48,minWidth:0,border:date===day?'2px solid #a28ac3':'1px solid #eee8f3',background:date===day?'#eee5f8':'white',borderRadius:10,color:'#675276'}}>{i+1}<small style={{display:'block',fontSize:10,minHeight:13,color:rows.every(x=>x.done)?'#9e95a8':'#a174c1'}}>{rows.length?`${rows.length}개`:''}</small></button>})}</div></section><ActivityList date={date} title={`${date} 일정`} onOpen={onOpen}/></>;
}
export function ActivityDeepLink({onOpen}){
 const s=useActivitySchedule(),handled=useRef(false);
 useEffect(()=>{if(!s.ready||handled.current)return;const params=new URLSearchParams(window.location.search),id=params.get('flow_plan');if(!id)return;handled.current=true;const row=s.plans.find(p=>p.id===id);if(row)onOpen(row);else s.connection.setMessage('해당 일정을 찾지 못했어요. 로그인한 계정을 확인해 주세요.');params.delete('flow_plan');window.history.replaceState(null,'',window.location.pathname+(params.size?'?'+params.toString():'')+window.location.hash)},[s.ready,s.plans,onOpen]);return null;
}
