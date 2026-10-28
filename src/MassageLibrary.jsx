import React,{useEffect,useRef,useState} from 'react';
import sequences from './data/massageSequences.json';
import triggerMuscles from './data/triggerMuscles.json';
import {yogaSupabase,YOGA_BUCKET} from './supabaseYoga';
import MassageBookmarks from './MassageBookmarks';

const COLORS={ink:'#594a64',sub:'#9788a3',edge:'#e8ddf0',pale:'#f5eff9'};
const POINT_DETAILS={
 'BL2':['찬죽','눈썹 안쪽 끝의 오목한 부위','눈·안구를 직접 누르지 않기'], 'LI20':['영향','콧방울 가쪽, 코입술고랑 부근','코 주변의 피부를 세게 누르지 않기'], 'ST4':['지창','입꼬리 가쪽 부근','입술·점막 직접 압박 피하기'], 'ST6':['협거','아래턱각 앞위쪽, 깨물근 부근','턱관절 통증 시 자극하지 않기'], 'ST7':['하관','광대활 아래 턱관절 부근','턱관절에 깊은 압박 금지'], 'EX-HN5':['태양','관자놀이 부근의 경외기혈','측두부 강한 압박 금지'],
 'CV17':['전중','흉골 앞면, 양쪽 유두 사이 높이의 정중부 부근','흉골·가슴 강압 금지'], 'LU1':['중부','상부 가슴 바깥쪽의 폐경 혈위','가슴·겨드랑이 깊은 압박 금지'], 'ST12':['결분','쇄골 위 오목한 부위','혈관·신경이 있어 압박 금지'], 'GB21':['견정','목과 어깨 끝 사이 윗등 근육 부위','임신 중 자극 회피, 강압 금지'],
 'GV20':['백회','머리 정중선의 정수리 부근','과도한 압박 금지'], 'GV24':['신정','앞쪽 머리 정중선, 앞머리선 위쪽','두피 염증 시 피하기'], 'GB20':['풍지','뒤통수뼈 아래, 목 뒤 가쪽의 오목한 부위','목 깊은 압박 금지'], 'BL10':['천주','뒤통수 아래 목 뒤 근육 가쪽','목 강압 금지'], 'EX-HN1':['사신총','백회 주변 네 방향에 위치하는 경외기혈','가벼운 접촉만'],
 'GV14':['대추','목과 등 경계의 등쪽 정중선 부근','척추뼈 직접 압박 금지'], 'SI11':['천종','견갑골 뒤면의 오목한 부위','뼈 위 강압 금지'], 'BL13':['폐수','등 위쪽 흉추 양옆의 방광경 혈위','가슴우리 강압 금지'], 'BL18':['간수','등 중간 흉추 양옆의 방광경 혈위','척추·늑골 강압 금지'], 'BL20':['비수','등 아래 흉추 양옆의 방광경 혈위','강한 깊은 압박 금지'], 'BL23':['신수','허리 위쪽 요추 양옆의 방광경 혈위','신장 주변 강압 금지'],
 'GV4':['명문','허리 정중선, 요추 부근','척추 직접 압박 금지'], 'BL25':['대장수','허리 요추 양옆의 방광경 혈위','허리 강압 금지'], 'BL32':['차료','천골의 둘째 뒤천골구멍 부근','천골 구멍 깊은 압박 금지'], 'GB30':['환도','엉덩이 뒤가쪽 깊은 근육 부근','좌골신경 주변 깊은 압박 금지'],
 'CV12':['중완','명치와 배꼽 사이 복부 정중선','깊은 복부 압박 금지'], 'ST25':['천추','배꼽 좌우의 위경 혈위','복통·임신 가능성 시 압박 피하기'], 'CV6':['기해','배꼽 아래 복부 정중선','깊은 압박 금지'], 'CV4':['관원','배꼽 아래 복부 정중선','임신 가능성·복통 시 압박 금지'],
 'BL54':['질변','엉덩이의 천골 바깥쪽 부근','신경 경로 깊은 압박 피하기'], 'GB29':['거료','고관절 바깥쪽 골반 부근','뼈·신경 강압 금지'],
 'ST36':['족삼리','무릎 아래 정강이뼈 바깥쪽 부근','통증 유발 압박 금지'], 'SP6':['삼음교','안쪽 복사뼈 위, 정강이뼈 안쪽 뒤편','임신 중 자극 주의'], 'GB34':['양릉천','무릎 바깥 아래 종아리뼈 머리 앞아래','신경 주행 부위 강압 금지'], 'SP9':['음릉천','무릎 안쪽 아래 정강이뼈 내측 부근','강한 압박 금지'], 'BL40':['위중','무릎 뒤 오금 중앙','혈관·신경 있으므로 강압 금지'], 'BL57':['승산','종아리 뒤쪽 근육 하부 부근','종아리 붓기·열감·통증 시 마사지 금지'], 'KI3':['태계','안쪽 복사뼈와 아킬레스건 사이','혈관·건 직접 강압 금지']
};
const CSS={panel:{border:`1px solid ${COLORS.edge}`,borderRadius:18,padding:15,background:'white',marginBottom:12},button:{border:`1px solid ${COLORS.edge}`,borderRadius:12,padding:'10px 13px',background:COLORS.pale,color:'#755990',fontWeight:700,fontFamily:'inherit',cursor:'pointer'},small:{fontSize:12,color:COLORS.sub}};
const timeText=s=>`${String(Math.floor(Math.max(0,s)/60)).padStart(2,'0')}:${String(Math.max(0,s)%60).padStart(2,'0')}`;
function announce(t){try{if(!('speechSynthesis'in window))return;window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(t);u.lang='ko-KR';u.rate=.88;u.volume=.8;window.speechSynthesis.speak(u)}catch{}}
export default function MassageLibrary(){
 const [region,setRegion]=useState(null),[tab,setTab]=useState('sequence'),[muscleSearch,setMuscleSearch]=useState(''),[index,setIndex]=useState(0),[remaining,setRemaining]=useState(0),[running,setRunning]=useState(false),[finished,setFinished]=useState(false);
 const timer=useRef(null),deadline=useRef(0),stepRef=useRef(0),seqRef=useRef(null);
 const [triggerUser,setTriggerUser]=useState(null),[triggerPhotos,setTriggerPhotos]=useState({}),[uploading,setUploading]=useState(''),[triggerError,setTriggerError]=useState('');
 const triggerInput=useRef(null),selectedMuscle=useRef(null);
 const [pointPhotos,setPointPhotos]=useState({}),[pointUploading,setPointUploading]=useState(''),[pointError,setPointError]=useState('');
 const pointInput=useRef(null),selectedPointCode=useRef(null);
 const openPointPhoto=(code)=>{if(pointUploading||!code)return;selectedPointCode.current=code;pointInput.current?.click()};
 const savePointPhoto=async(e)=>{
   const file=e.target.files?.[0],code=selectedPointCode.current;e.target.value='';if(!file||!code)return;
   if(!triggerUser||!yogaSupabase){setPointError('로그인 후 사진을 등록해 주세요.');return;}
   setPointError('');setPointUploading(code);
   try{
     if(file.size>15*1024*1024)throw new Error('사진은 15MB 이하만 등록할 수 있어요.');
     const blob=await new Promise((resolve,reject)=>{
       const obj=URL.createObjectURL(file),img=new Image();
       img.onload=()=>{URL.revokeObjectURL(obj);const scale=Math.min(1,1600/Math.max(img.width,img.height));const c=document.createElement('canvas');c.width=Math.max(1,Math.round(img.width*scale));c.height=Math.max(1,Math.round(img.height*scale));c.getContext('2d').drawImage(img,0,0,c.width,c.height);c.toBlob(b=>b?resolve(b):reject(new Error('이미지 변환 실패')),'image/jpeg',.86)};
       img.onerror=()=>{URL.revokeObjectURL(obj);reject(new Error('이미지를 열지 못했어요.'))};img.src=obj;
     });
     const path=`${triggerUser}/massage-acupoints/${code}.jpg`;
     const {error:upErr}=await yogaSupabase.storage.from(YOGA_BUCKET).upload(path,blob,{contentType:'image/jpeg',upsert:true,cacheControl:'0'});
     if(upErr)throw upErr;
     const {data,error:signErr}=await yogaSupabase.storage.from(YOGA_BUCKET).createSignedUrl(path,3600);
     if(signErr)throw signErr;
     setPointPhotos(current=>({...current,[code]:data.signedUrl}));
   }catch(error){setPointError('경혈 사진 저장 실패: '+error.message)}finally{setPointUploading('')}
 };

 useEffect(()=>{let active=true;if(!yogaSupabase){setTriggerError('사진 저장 연결을 확인해 주세요.');return;}
   (async()=>{const {data:{user},error}=await yogaSupabase.auth.getUser();if(!active)return;if(error||!user){setTriggerError('사진을 등록하려면 로그인이 필요해요.');return;}setTriggerUser(user.id);
     const prefix=`${user.id}/trigger-point-muscles`;
     const {data:files,error:listError}=await yogaSupabase.storage.from(YOGA_BUCKET).list(prefix,{limit:1000});
     if(!active)return;
     if(listError){setTriggerError('사진 목록을 불러오지 못했어요: '+listError.message);return;}
     const valid=(files||[]).filter(f=>f.name.endsWith('.jpg'));
     const results=await Promise.all(valid.map(async f=>{const path=`${prefix}/${f.name}`;const {data,error:signError}=await yogaSupabase.storage.from(YOGA_BUCKET).createSignedUrl(path,3600);return signError?null:[f.name.replace(/\.jpg$/,''),data.signedUrl];}));
     if(active)setTriggerPhotos(Object.fromEntries(results.filter(Boolean)));
     const pointPrefix=`${user.id}/massage-acupoints`;
     const {data:pointFiles,error:pointListError}=await yogaSupabase.storage.from(YOGA_BUCKET).list(pointPrefix,{limit:1000});
     if(pointListError){if(active)setPointError('경혈 사진 목록을 불러오지 못했어요: '+pointListError.message)}
     else{
       const points=await Promise.all((pointFiles||[]).filter(f=>f.name.endsWith('.jpg')).map(async f=>{
         const {data,error:signErr}=await yogaSupabase.storage.from(YOGA_BUCKET).createSignedUrl(`${pointPrefix}/${f.name}`,3600);
         return signErr?null:[f.name.replace(/\.jpg$/,''),data.signedUrl];
       }));
       if(active)setPointPhotos(Object.fromEntries(points.filter(Boolean)));
     }

   })().catch(e=>{if(active)setTriggerError(e.message)});
   return()=>{active=false};
 },[]);
 const openTriggerPhoto=(muscle)=>{if(uploading)return;selectedMuscle.current=muscle;triggerInput.current?.click()};
 const saveTriggerPhoto=async(e)=>{const file=e.target.files?.[0];const muscle=selectedMuscle.current;e.target.value='';if(!file||!muscle)return;
   if(!triggerUser||!yogaSupabase){setTriggerError('로그인 후 사진을 등록해 주세요.');return;}
   setTriggerError('');setUploading(muscle.id);
   try{if(file.size>15*1024*1024)throw new Error('사진은 15MB 이하만 등록할 수 있어요.');
     const blob=await new Promise((resolve,reject)=>{const obj=URL.createObjectURL(file);const img=new Image();img.onload=()=>{URL.revokeObjectURL(obj);const scale=Math.min(1,1600/Math.max(img.width,img.height));const canvas=document.createElement('canvas');canvas.width=Math.round(img.width*scale);canvas.height=Math.round(img.height*scale);canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);canvas.toBlob(b=>b?resolve(b):reject(new Error('사진을 변환하지 못했어요.')),'image/jpeg',.86)};img.onerror=()=>{URL.revokeObjectURL(obj);reject(new Error('사진을 열지 못했어요.'))};img.src=obj});
     const path=`${triggerUser}/trigger-point-muscles/${muscle.id}.jpg`;
     const {error:uploadError}=await yogaSupabase.storage.from(YOGA_BUCKET).upload(path,blob,{contentType:'image/jpeg',upsert:true,cacheControl:'0'});
     if(uploadError)throw uploadError;
     const {data,error:signError}=await yogaSupabase.storage.from(YOGA_BUCKET).createSignedUrl(path,3600);
     if(signError)throw signError;
     setTriggerPhotos(current=>({...current,[muscle.id]:data.signedUrl}));
   }catch(error){setTriggerError('사진 저장 실패: '+error.message)}finally{setUploading('')}
 };

 const seq=sequences.find(s=>s.region===region);
 useEffect(()=>{seqRef.current=seq},[seq]);
 const stop=()=>{clearInterval(timer.current);timer.current=null;setRunning(false);window.speechSynthesis?.cancel?.()};
 useEffect(()=>()=>{clearInterval(timer.current);window.speechSynthesis?.cancel?.()},[]);
 const switchStep=(next,play)=>{const s=seqRef.current;if(!s)return;clearInterval(timer.current);timer.current=null;if(next>=s.steps.length){stepRef.current=0;setRunning(false);setFinished(true);setRemaining(0);announce(`${s.region} 마사지가 끝났습니다. 수고하셨어요.`);return}const n=Math.max(0,next);stepRef.current=n;setIndex(n);setFinished(false);setRemaining(s.steps[n].seconds);setRunning(Boolean(play));if(play){deadline.current=Date.now()+s.steps[n].seconds*1000;announce(`${s.steps[n].title} 시작`);timer.current=setInterval(()=>{const left=Math.max(0,Math.ceil((deadline.current-Date.now())/1000));setRemaining(left);if(left===0){clearInterval(timer.current);timer.current=null;switchStep(stepRef.current+1,true)}},250)}};
 const begin=()=>{if(!seq)return;if(finished||remaining<=0){switchStep(0,true);return}setRunning(true);deadline.current=Date.now()+remaining*1000;announce(`${seq.steps[stepRef.current].title} 시작`);clearInterval(timer.current);timer.current=setInterval(()=>{const left=Math.max(0,Math.ceil((deadline.current-Date.now())/1000));setRemaining(left);if(left===0){clearInterval(timer.current);timer.current=null;switchStep(stepRef.current+1,true)}},250)};
 const pause=()=>{if(!running)return;clearInterval(timer.current);timer.current=null;setRemaining(Math.max(0,Math.ceil((deadline.current-Date.now())/1000)));setRunning(false);window.speechSynthesis?.cancel?.()};
 const enter=r=>{stop();setRegion(r);setTab('sequence');setIndex(0);stepRef.current=0;setRemaining(sequences.find(s=>s.region===r)?.steps[0]?.seconds||0);setFinished(false)};
 return <section style={{color:COLORS.ink,padding:'4px 2px 25px'}}>
 {!region?<><h2 style={{fontSize:24}}>마사지</h2><p style={CSS.small}>부위를 선택하면 기본 시퀀스와 경혈을 볼 수 있어요.</p><div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:11}}>{sequences.map(s=><button key={s.region} onClick={()=>enter(s.region)} style={{...CSS.button,minHeight:106,textAlign:'left',background:'#fbf8fd'}}><strong style={{display:'block',fontSize:19,marginBottom:6}}>{s.region}</strong><span style={CSS.small}>{s.steps.length}개 동작 · {s.minutes}분</span></button>)}</div><p style={{...CSS.small,marginTop:14}}>학습용 저강도 시퀀스 · 통증이나 불편감이 있으면 즉시 중단해 주세요.</p></>:
 <><button style={{...CSS.button,background:'white',marginBottom:16}} onClick={()=>{stop();setRegion(null)}}>‹ 마사지 부위</button><h2 style={{margin:'4px 0 12px'}}>{region} 마사지</h2><div style={{display:'flex',gap:8,marginBottom:14}}>{[['sequence','시퀀스'],['points','경혈'],['trigger','트리거\n포인트'],['bookmarks','북마크']].map(([key,name])=><button key={key} style={{...CSS.button,flex:'1 1 0',minWidth:0,padding:'10px 3px',fontSize:13,whiteSpace:'pre-line',lineHeight:1.45,overflowWrap:'anywhere',background:tab===key?'#e8def2':'white'}} onClick={()=>{if(key==='points')pause();setTab(key)}}>{name}</button>)}</div>
 {tab==='sequence'?<><section style={CSS.panel}><b>{seq.title}</b><div style={{...CSS.small,margin:'5px 0 12px'}}>{seq.steps.length}동작 · {seq.minutes}분 · 약한 압력 중심</div>{seq.steps.map((s,i)=><button key={s.order} onClick={()=>switchStep(i,false)} style={{textAlign:'left',display:'block',width:'100%',background:i===index?'#f2eaf8':'#fff',border:`1px solid ${i===index?'#cbb6de':'#ece5f0'}`,borderRadius:13,padding:12,margin:'8px 0',fontFamily:'inherit',color:COLORS.ink}}><div style={{display:'flex',justifyContent:'space-between',gap:10}}><strong>{String(i+1).padStart(2,'0')}. {s.title}</strong><span style={CSS.small}>{Math.round(s.seconds/60*10)/10}분</span></div><div style={{fontSize:13,marginTop:6}}>{s.start} → {s.end}</div><div style={{...CSS.small,marginTop:5}}>수법: {s.technique}</div>{s.caution&&<div style={{...CSS.small,color:'#a55c71',marginTop:4}}>주의: {s.caution}</div>}</button>)}</section><section style={CSS.panel}><b>시퀀스 타이머</b><div style={{textAlign:'center',padding:'15px 0'}}><div style={{fontSize:40,fontWeight:750,fontVariantNumeric:'tabular-nums'}}>{finished?'완료':timeText(remaining)}</div><div style={{fontSize:15,fontWeight:700,margin:'7px 0'}}>{finished?'마사지 종료':seq.steps[index]?.title}</div><div style={CSS.small}>{finished?'':`${index+1} / ${seq.steps.length} · ${seq.steps[index]?.start} → ${seq.steps[index]?.end}`}</div></div><div style={{display:'flex',justifyContent:'space-between',gap:8,flexWrap:'wrap'}}><button style={CSS.button} disabled={index===0} onClick={()=>switchStep(index-1,running)}>‹ 이전</button><button style={{...CSS.button,background:'#e8def2'}} onClick={running?pause:begin}>{running?'⏸ 일시정지':finished?'↺ 다시 시작':'▶ 시작 / 재개'}</button><button style={CSS.button} onClick={()=>switchStep(index+1,running)}>다음 ›</button></div><p style={{...CSS.small,margin:'12px 0 0'}}>시작·동작 변경·종료 시 음성 안내 · 기기를 잠그면 브라우저 타이머가 일시 중단될 수 있어요.</p></section></>:
 tab==='bookmarks'?<MassageBookmarks region={region} /> :
 tab==='points'?<section style={CSS.panel}><b>{region} 주요 경혈</b><p style={CSS.small}>경혈 그림을 눌러 사진을 추가하거나 교체할 수 있어. 같은 경혈은 다른 부위에서도 같은 사진이 보여. 위치 설명과 그림은 학습용이며 강한 압박 지시가 아니야.</p><input ref={pointInput} type="file" accept="image/*" onChange={savePointPhoto} style={{display:'none'}} aria-label="경혈 사진 선택"/>{pointError&&<p role="alert" style={{color:'#aa4264',fontSize:12}}>{pointError}</p>}{seq.points.map(p=>{const code=p.match(/(?:EX-HN|[A-Z]{2,3})\d+/)?.[0];const d=POINT_DETAILS[code]||[];return <div key={p} style={{padding:'12px 2px',borderBottom:`1px solid ${COLORS.edge}`}}><strong>{d[0]||p} · {code||''}</strong><p style={{margin:'6px 0',fontSize:13}}>{d[1]||'해부학적 위치 추후 검수 필요'}</p><p style={{...CSS.small,margin:'0 0 10px'}}>주의: {d[2]||'강한 압박 피하기'}</p><button type="button" disabled={Boolean(pointUploading)||!code} onClick={()=>openPointPhoto(code)} aria-label={`${d[0]||p} 사진 ${pointPhotos[code]?'교체':'추가'}`} style={{width:'100%',border:`1px solid ${COLORS.edge}`,borderRadius:12,background:'#f7f3fa',padding:0,overflow:'hidden',minHeight:110,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',cursor:'pointer',color:'#9276a3',font:'inherit'}}>{pointPhotos[code]?<img src={pointPhotos[code]} alt={`${d[0]||p} 경혈 학습 그림`} style={{width:'100%',maxHeight:340,objectFit:'contain'}}/>:<><span style={{fontSize:27}}>▧</span><span style={{fontSize:13,marginTop:4}}>사진 눌러 추가</span></>}{pointUploading===code&&<span style={{fontSize:12,padding:8}}>사진 저장 중…</span>}</button></div>})}</section> :
 <section style={CSS.panel}><b>{region} · 근육별 트리거포인트</b><p style={CSS.small}>책의 근육 목록이야. 사진 칸을 누르면 해당 근육 그림을 등록하거나 교체할 수 있어. 같은 근육은 다른 마사지 부위에서도 같은 사진이 보여.</p><input ref={triggerInput} type="file" accept="image/*" onChange={saveTriggerPhoto} style={{display:'none'}} aria-label="근육 사진 선택"/>{triggerError&&<p role="alert" style={{color:'#aa4264',fontSize:12}}>{triggerError}</p>}<input value={muscleSearch} onChange={e=>setMuscleSearch(e.target.value)} placeholder="근육명 한글·영어 검색" aria-label="근육 검색" style={{boxSizing:'border-box',width:'100%',padding:'11px 12px',margin:'8px 0 12px',border:`1px solid ${COLORS.edge}`,borderRadius:10,font:'inherit',color:COLORS.ink}}/>{triggerMuscles.filter(m=>m.regions.includes(region)&&`${m.nameKo} ${m.nameEn} ${m.category}`.toLocaleLowerCase().includes(muscleSearch.trim().toLocaleLowerCase())).map(m=><div key={m.id} style={{padding:'12px 0',borderBottom:`1px solid ${COLORS.edge}`}}><div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'center'}}><strong style={{fontSize:17}}>{m.nameKo}</strong><span style={CSS.small}>p. {m.page}</span></div><div style={{...CSS.small,margin:'3px 0 9px'}}>{m.nameEn}</div><button type="button" disabled={Boolean(uploading)} onClick={()=>openTriggerPhoto(m)} aria-label={`${m.nameKo} 사진 ${triggerPhotos[m.id]?'교체':'추가'}`} style={{width:'100%',border:`1px solid ${COLORS.edge}`,borderRadius:12,background:'#f7f3fa',padding:0,overflow:'hidden',minHeight:120,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',cursor:'pointer',color:'#9276a3',font:'inherit'}}>{triggerPhotos[m.id]?<img src={triggerPhotos[m.id]} alt={`${m.nameKo} 트리거포인트 학습 그림`} style={{width:'100%',height:'auto',maxHeight:360,objectFit:'contain'}}/>:<><span style={{fontSize:27}}>▧</span><span style={{fontSize:13,marginTop:4}}>사진 눌러 추가</span></>}{uploading===m.id&&<span style={{fontSize:12,padding:8}}>사진 저장 중…</span>}</button></div>)}{!triggerMuscles.some(m=>m.regions.includes(region)&&`${m.nameKo} ${m.nameEn} ${m.category}`.toLocaleLowerCase().includes(muscleSearch.trim().toLocaleLowerCase()))&&<p style={CSS.small}>해당 부위에 일치하는 근육이 없어요.</p>}<p style={{...CSS.small,marginTop:12}}>그림의 점은 학습 자료이며 직접 강하게 눌러야 하는 위치라는 뜻이 아니야. 특히 목 앞·옆은 혈관과 신경이 있어 깊은 압박을 피해야 해.</p></section>}
 </>}
 </section>
}
