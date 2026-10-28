import React, { useEffect, useRef, useState } from 'react';

/* Drop-in Mind Flow tab. Data is browser-local until connected to the app's Supabase layer.
   For the EXISTING nature-sound mixer, pass NatureSounds as a prop:
   <PelvicStudio NatureSounds={YourExistingNatureSoundComponent} />
*/
const STRUCTURE = {
  '앞뒤찢기':[], '좌우찢기':[], '좌우모으기':[], '골반저근':[], '척추유연':[], '이완':[]
};
const KEY = 'mindflow.pelvic-circulation.v1';
const getInitial = () => {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
};
const uid = () => (globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`);
const clamp = n => Math.max(1, Math.min(3600, Number(n) || 60));
const secs = n => `${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`;
const btn = {border:'1px solid #e0d1ed',background:'#f3ebf8',color:'#735989',borderRadius:12,padding:'10px 13px',fontSize:14,cursor:'pointer'};
const field = {border:'1px solid #decdea',borderRadius:12,padding:'12px',width:'100%',boxSizing:'border-box',fontSize:15,color:'#53415e',background:'#fff'};
const card = {background:'#fff',border:'1px solid #e1d4ec',borderRadius:20,padding:15};

export default function PelvicStudio({ NatureSounds = null }) {
  const [data,setData] = useState(getInitial);
  const exercises = data.exercises || [];
  const saved = data.saved || [];
  const folders = data.folders || {};
  const favorites = data.favorites || {};
  const [tab,setTab] = useState('library');
  const [major,setMajor] = useState('앞뒤찢기');
  const [search,setSearch] = useState('');
  const [activeTag,setActiveTag] = useState('전체');
  const [editing,setEditing] = useState(null);
  const [form,setForm] = useState({name:'',description:'',seconds:60,tags:'',image:''});
  const [draft,setDraft] = useState([]);
  const [sequenceName,setSequenceName] = useState('');
  const [loadedId,setLoadedId] = useState(null);
  const [folderPath,setFolderPath] = useState(null);
  const [playIndex,setPlayIndex] = useState(-1);
  const [remain,setRemain] = useState(0);
  const [paused,setPaused] = useState(false);
  const [voice,setVoice] = useState(true);
  const spoken = useRef(new Set());
  const remainingRef = useRef(0);
  const indexRef = useRef(-1);
  const draftRef = useRef([]);
  const pausedRef = useRef(false);
  const playRef = useRef(false);
  useEffect(()=>{try {localStorage.setItem(KEY,JSON.stringify(data));} catch(e){console.warn('Pelvic storage full',e);}},[data]);
  useEffect(()=>{draftRef.current=draft;},[draft]);
  useEffect(()=>{indexRef.current=playIndex;playRef.current=playIndex>=0;},[playIndex]);
  useEffect(()=>{pausedRef.current=paused;},[paused]);
  const update = patch => setData(d=>({...d,...(typeof patch==='function'?patch(d):patch)}));
  const voiceSay = (sentence) => {
    if(!voice || typeof speechSynthesis==='undefined') return;
    speechSynthesis.cancel();
    const s=new SpeechSynthesisUtterance(sentence);s.lang='ko-KR';s.rate=1.05;s.volume=1;
    const voices=speechSynthesis.getVoices();s.voice=voices.find(v=>v.lang?.toLowerCase().startsWith('ko'))||null;
    speechSynthesis.speak(s);
  };
  const stop=()=>{setPlayIndex(-1);indexRef.current=-1;playRef.current=false;setRemain(0);if(typeof speechSynthesis!=='undefined') speechSynthesis.cancel();spoken.current.clear();};
  const go=(i,items=draftRef.current)=>{
    if(i<0 || i>=items.length){stop();return;}
    const x=items[i];const n=clamp(x.seconds);
    setPlayIndex(i);indexRef.current=i;setRemain(n);remainingRef.current=n;setPaused(false);pausedRef.current=false;
    spoken.current.clear();voiceSay(`${x.name}, 시작합니다.`);
  };
  useEffect(()=>{
    if(playIndex<0) return;
    const id=setInterval(()=>{
      if(pausedRef.current || !playRef.current) return;
      const n=remainingRef.current-1;
      remainingRef.current=n;setRemain(Math.max(n,0));
      if(n===5 && !spoken.current.has('five')){
        spoken.current.add('five');
        // Browser TTS timing varies; each number is spoken in order.
        voiceSay('오, 사, 삼, 이, 일');
      }
      if(n<=0){
        const next=indexRef.current+1;
        if(next<draftRef.current.length) go(next);
        else{stop();voiceSay('운동이 완료되었습니다.');}
      }
    },1000);
    return ()=>clearInterval(id);
  // Timer interval is deliberately stable over pause and countdown updates.
  },[playIndex,voice]);
  const start=()=>{if(!draft.length)return;go(0,draft);};
  const addToSequence=x=>{
    setDraft(d=>[...d,{id:uid(),exerciseId:x.id,name:x.name,image:x.image||'',seconds:clamp(x.seconds)}]);
    setTab('sequence');
  };
  const clearEdit=()=>{setEditing(null);setForm({name:'',description:'',seconds:60,tags:'',image:''});};
  const saveExercise=()=>{
    if(!form.name.trim())return alert('운동명을 입력해줘.');
    const exercise={...form,id:editing&&editing!=='new'?editing:uid(),name:form.name.trim(),seconds:clamp(form.seconds),major:editing&&editing!=='new'?(exercises.find(x=>x.id===editing)?.major||major):major,tags:String(form.tags).split(',').map(x=>x.trim().replace(/^#/, '')).filter(Boolean)};
    update({exercises:editing&&editing!=='new'?exercises.map(x=>x.id===editing?exercise:x):[...exercises,exercise]});clearEdit();
  };
  const editExercise=x=>{setMajor(x.major);setEditing(x.id);setForm({...x,tags:x.tags.join(', ')});};
  const changePhoto=async(e)=>{
    const file=e.target.files?.[0]; if(!file)return;
    const url=URL.createObjectURL(file);
    const img=new Image();img.onload=()=>{
      const c=document.createElement('canvas'); const scale=Math.min(1,640/Math.max(img.width,img.height));
      c.width=Math.round(img.width*scale);c.height=Math.round(img.height*scale);
      c.getContext('2d').drawImage(img,0,0,c.width,c.height);
      setForm(f=>({...f,image:c.toDataURL('image/jpeg',0.68)}));URL.revokeObjectURL(url);
    };img.src=url;
  };
  const bookmark=x=>{
    const path=x.major;
    update({favorites:{...favorites,[x.id]:favorites[x.id]?undefined:path}});
  };
  const addFolder=path=>{
    const name=prompt('새 서브폴더 이름'); if(!name?.trim())return;
    const key=`${path}/${name.trim()}`;
    if(folders[key]!==undefined)return alert('이미 있는 폴더야.');
    update({folders:{...folders,[key]:true}});
  };
  const allPaths=[...Object.keys(STRUCTURE),...Object.keys(folders)];
  const moveSequence=(i,by)=>setDraft(d=>{const a=[...d];if(i+by<0||i+by>=a.length)return a;[a[i],a[i+by]]=[a[i+by],a[i]];return a;});
  const saveSequence=()=>{
    if(!draft.length)return alert('먼저 운동을 추가해줘.');
    if(!sequenceName.trim())return alert('시퀀스 이름을 입력해줘.');
    const obj={id:loadedId||uid(),name:sequenceName.trim(),items:draft.map(x=>({...x}))};
    update({saved:loadedId?saved.map(x=>x.id===loadedId?obj:x):[...saved,obj]});setLoadedId(obj.id);
  };
  const tagged=exercises.filter(x=>x.major===major);
  const tags=[...new Set(tagged.flatMap(x=>x.tags||[]))];
  const filtered=tagged.filter(x=>(activeTag==='전체'||x.tags?.includes(activeTag))&&`${x.name} ${x.description} ${(x.tags||[]).join(' ')}`.toLowerCase().includes(search.toLowerCase()));
  const current=playIndex>=0?draft[playIndex]:null;
  return <div style={{fontFamily:'-apple-system,BlinkMacSystemFont,"Noto Sans KR",sans-serif',color:'#52405f',background:'#fbf8fd',padding:'16px 12px 90px',maxWidth:740,margin:'auto',minHeight:480}}>
    <style>{`@keyframes pelvicFade {from{opacity:0}to{opacity:1}} .pelvic-card button:active{transform:scale(.96)} .pelvic-input:focus{outline:2px solid #c3a4df}`}</style>
    <h2 style={{margin:'4px 0 17px',fontSize:23}}>골반순환</h2>
    <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:18}}>{[['sequence','시퀀스'],['library','운동 라이브러리'],['bookmarks','북마크']].map(([key,name])=><button key={key} onClick={()=>setTab(key)} style={{...btn,background:tab===key?'#e7dcf1':'#fff',minHeight:62,fontWeight:600}}>{name}</button>)}</div>
    {tab==='library' && <>
      <div style={{display:'flex',gap:8,marginBottom:10}}><select style={field} value={major} onChange={e=>{setMajor(e.target.value);setActiveTag('전체');}}>{Object.keys(STRUCTURE).map(x=><option key={x}>{x}</option>)}</select></div>
      <input className="pelvic-input" value={search} onChange={e=>setSearch(e.target.value)} style={{...field,marginBottom:10}} placeholder="운동명 · 설명 · 태그 검색"/>
      <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:12}}>{['전체',...tags].map(t=><button key={t} style={{...btn,padding:'5px 9px',borderRadius:40,background:activeTag===t?'#e4d3f1':'#fff'}} onClick={()=>setActiveTag(t)}>{t==='전체'?t:`#${t}`}</button>)}</div>
      <button style={{...btn,marginBottom:12}} onClick={()=>editing?clearEdit():setEditing('new')}>＋ 새 동작 등록</button>
      {editing && <div style={{...card,marginBottom:14,display:'grid',gap:10}}><strong>{editing==='new'?`${major} 동작 등록`:'운동 수정'}</strong><input className="pelvic-input" style={field} placeholder="동작명" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/><textarea className="pelvic-input" style={{...field,minHeight:76}} placeholder="설명 / 주의사항 (선택)" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/><label>기본 시간 (초)<input className="pelvic-input" style={field} type="number" min="1" max="3600" value={form.seconds} onChange={e=>setForm({...form,seconds:e.target.value})}/></label><input className="pelvic-input" style={field} placeholder="태그: 초급, 힙업, 누워서" value={form.tags} onChange={e=>setForm({...form,tags:e.target.value})}/><label style={{...btn,textAlign:'center',display:'block'}}>＋ 사진 업로드<input type="file" accept="image/*" hidden onChange={changePhoto}/></label>{form.image&&<img alt="업로드 미리보기" src={form.image} style={{width:140,height:110,objectFit:'cover',borderRadius:10}}/>}<div><button style={btn} onClick={saveExercise}>저장</button> <button style={btn} onClick={clearEdit}>취소</button></div></div>}
      <div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:10}}>{filtered.map(x=><div key={x.id} style={card} className="pelvic-card"><div style={{aspectRatio:'4/3',background:'#f8f3fb',borderRadius:14,overflow:'hidden',display:'grid',placeItems:'center'}}>{x.image?<img src={x.image} alt={x.name} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<span style={{color:'#b5a3c2'}}>＋ 사진</span>}</div><strong style={{display:'block',margin:'10px 0 4px'}}>{x.name}</strong><small>{x.seconds}초 · {(x.tags||[]).map(t=>`#${t}`).join(' ')}</small><div style={{display:'flex',gap:4,marginTop:10,flexWrap:'wrap'}}><button title="시퀀스에 추가" style={btn} onClick={()=>addToSequence(x)}>＋</button><button title="북마크" style={btn} onClick={()=>bookmark(x)}>{favorites[x.id]?'★':'☆'}</button><button title="수정" style={btn} onClick={()=>editExercise(x)}>✎</button><button title="삭제" style={btn} onClick={()=>{if(confirm('운동을 삭제할까?'))update({exercises:exercises.filter(y=>y.id!==x.id)})}}>×</button></div></div>)}</div>
      {!filtered.length&&<p style={{color:'#9987a5',textAlign:'center',padding:25}}>등록된 운동이 없어. + 새 동작 등록을 눌러줘.</p>}
    </>}
    {tab==='sequence'&&<div style={card}><h3>나의 골반순환 시퀀스</h3><input className="pelvic-input" style={field} value={sequenceName} onChange={e=>setSequenceName(e.target.value)} placeholder="시퀀스 이름 직접 입력"/><p style={{fontSize:12,color:'#927ca0'}}>운동 라이브러리에서 ＋ 버튼을 누르면 자동으로 추가돼.</p>{draft.map((x,i)=><div key={x.id} style={{display:'flex',alignItems:'center',gap:7,borderBottom:'1px solid #e8ddf1',padding:'12px 0'}}><small>{i+1}</small><div style={{height:50,width:50,borderRadius:9,background:'#f6f1fa',flexShrink:0,overflow:'hidden'}}>{x.image&&<img alt="" src={x.image} style={{width:'100%',height:'100%',objectFit:'cover'}}/>}</div><div style={{flex:1,minWidth:0}}><strong style={{fontSize:13,display:'block'}}>{x.name}</strong><input aria-label="운동 시간 (초)" type="number" min="1" max="3600" value={x.seconds} onChange={e=>setDraft(d=>d.map(y=>y.id===x.id?{...y,seconds:e.target.value}:y))} style={{...field,width:77,padding:6,marginTop:3}}/> 초</div><button style={btn} onClick={()=>moveSequence(i,-1)}>↑</button><button style={btn} onClick={()=>moveSequence(i,1)}>↓</button><button style={btn} onClick={()=>setDraft(d=>d.filter(y=>y.id!==x.id))}>×</button></div>)}<div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:15}}><button style={btn} onClick={start}>▶ 시작</button><button style={btn} onClick={stop}>Ⅱ 정지</button><button style={btn} onClick={saveSequence}>▣ 시퀀스 저장</button><button style={btn} onClick={()=>{stop();setDraft([]);setLoadedId(null);setSequenceName('');}}>＋ 새 시퀀스</button></div><h3 style={{marginTop:25}}>저장된 시퀀스</h3>{saved.map(s=><div key={s.id} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 0',borderTop:'1px solid #e9dcf0'}}><div style={{flex:1}}><strong>{s.name}</strong><small style={{display:'block'}}>{s.items.length}개 동작</small></div><button style={btn} onClick={()=>{stop();setLoadedId(s.id);setSequenceName(s.name);setDraft(s.items.map(x=>({...x})));}}>불러오기</button><button style={btn} onClick={()=>{if(confirm('저장된 시퀀스를 삭제할까?'))update({saved:saved.filter(x=>x.id!==s.id)})}}>삭제</button></div>)}</div>}
    {tab==='bookmarks'&&<div style={card}><h3>북마크</h3><p style={{fontSize:12,color:'#927ca0'}}>기본 6개 분류 → 사용자 서브폴더</p>{folderPath!==null&&<button style={btn} onClick={()=>setFolderPath(folderPath.includes('/')?folderPath.slice(0,folderPath.lastIndexOf('/')):null)}>← 상위 폴더</button>}<div style={{display:'grid',gap:8,marginTop:12}}>{allPaths.filter(p=>folderPath===null?!p.includes('/'):p.startsWith(folderPath+'/')&&p.slice(folderPath.length+1).indexOf('/')===-1).map(p=><div key={p} style={{display:'flex',gap:8,alignItems:'center'}}><button style={{...btn,background:'#fff',flex:1,textAlign:'left'}} onClick={()=>setFolderPath(p)}>▣ {p.split('/').at(-1)} ({Object.values(favorites).filter(v=>v===p).length})</button>{folders[p]&&<button style={btn} onClick={()=>{if(confirm('이 폴더를 삭제할까?')){const f=Object.fromEntries(Object.entries(folders).filter(([k])=>k!==p&&!k.startsWith(p+'/')));update({folders:f});}}}>×</button>}</div>)}{folderPath&&<button style={btn} onClick={()=>addFolder(folderPath)}>＋ 서브폴더</button>}</div>{folderPath&&<div style={{marginTop:18}}><h4>이 폴더의 운동</h4>{exercises.filter(x=>favorites[x.id]===folderPath).map(x=><div key={x.id} style={{display:'flex',gap:8,alignItems:'center',marginBottom:8}}><span style={{flex:1}}>{x.name}</span><button style={btn} onClick={()=>addToSequence(x)}>＋ 시퀀스</button><select aria-label="북마크 폴더 이동" style={{...field,width:100,padding:6}} value={favorites[x.id]} onChange={e=>update({favorites:{...favorites,[x.id]:e.target.value}})}>{allPaths.map(p=><option key={p} value={p}>{p.split('/').at(-1)}</option>)}</select></div>)}</div>}</div>}
    {current&&<div role="dialog" aria-modal="true" aria-label="골반순환 시퀀스 재생" style={{position:'fixed',inset:0,zIndex:9999,background:'rgba(38,28,49,.65)',display:'flex',alignItems:'center',justifyContent:'center',padding:16,animation:'pelvicFade .2s'}}><div style={{...card,maxWidth:450,width:'100%',maxHeight:'95vh',overflowY:'auto',padding:20,borderRadius:25}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:15}}><b>골반순환 시퀀스 재생 · {playIndex+1}/{draft.length}</b><button onClick={stop} style={{...btn,background:'white'}}>✕</button></div><div style={{height:240,background:'#f8f4fb',borderRadius:15,overflow:'hidden',display:'grid',placeItems:'center'}}>{current.image?<img src={current.image} alt={current.name} style={{width:'100%',height:'100%',objectFit:'contain'}}/>:<span>등록한 운동 사진이 여기에 표시돼</span>}</div><h2 style={{textAlign:'center',margin:'16px 0 8px'}}>{current.name}</h2><div style={{fontSize:62,fontWeight:700,textAlign:'center',fontVariantNumeric:'tabular-nums'}}>{secs(remain)}</div><p style={{textAlign:'center',color:'#9687a0',fontSize:13}}>남은 시간 · 한국어 음성 안내</p><label style={{display:'flex',gap:6,justifyContent:'center',fontSize:13,marginBottom:12}}><input type="checkbox" checked={voice} onChange={e=>setVoice(e.target.checked)}/> 한국어 음성 안내</label><div style={{display:'flex',justifyContent:'center',gap:6,flexWrap:'wrap'}}><button style={btn} disabled={playIndex===0} onClick={()=>go(playIndex-1)}>◀ 이전</button><button style={btn} onClick={()=>{setPaused(v=>!v);if(typeof speechSynthesis!=='undefined') speechSynthesis.cancel();}}>{paused?'▶ 재개':'Ⅱ 일시정지'}</button><button style={btn} onClick={()=>go(playIndex+1)}>다음 ▶</button><button style={btn} onClick={stop}>종료</button></div><div style={{borderTop:'1px solid #e6dcee',marginTop:16,paddingTop:14}}><b>자연의 소리</b>{NatureSounds?<div style={{marginTop:8}}><NatureSounds/></div>:<p style={{fontSize:12,color:'#9d8aaa'}}>기존 Mind Flow 자연음 플레이어를 연결할 자리입니다. 기존 사운드를 유지하려면 NatureSounds 속성으로 전달하세요.</p>}</div></div></div>}
  </div>;
}
