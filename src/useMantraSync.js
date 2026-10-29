import {useEffect,useRef,useState} from 'react';
import {yogaSupabase as db} from './supabaseYoga.js';
import {mantraRows,mantraDelta,readMantraRows} from './mantraSyncData.mjs';
const TABLE='mindflow_mantra_entries';
export default function useMantraSync(local,saveLocal){
 const [state,setState]=useState(()=>({mantras:local.mantras||[],mantraFolders:local.mantraFolders||[]}));
 const [ready,setReady]=useState(false),[status,setStatus]=useState('북마크 연결 중…');
 const latest=useRef(state),saveRef=useRef(saveLocal),retry=useRef(()=>{}),pending=useRef(new Map()),user=useRef('');saveRef.current=saveLocal;
 const apply=value=>{latest.current=value;setState(value);saveRef.current(value)};
 const stash=()=>{if(user.current)localStorage.setItem('mind-flow-mantra-pending:'+user.current,JSON.stringify([...pending.current.values()]));};
 useEffect(()=>{
  let alive=true,working=false,initialized=false;let timer;
  async function sync(){
   if(working||!alive)return;working=true;
   try{
    if(!db)throw Error('Supabase 설정을 확인해 주세요.');
    if(!user.current){const {data,error}=await db.auth.getUser();if(error)throw error;if(!data.user)throw Error('로그인이 필요해요.');user.current=data.user.id;try{for(const x of JSON.parse(localStorage.getItem('mind-flow-mantra-pending:'+user.current)||'[]'))pending.current.set(x.id,x)}catch{}}
    const who=user.current;
    const read=async()=>{const {data,error}=await db.from(TABLE).select('id,kind,payload,deleted').eq('user_id',who).in('kind',['video','folder']);if(error)throw error;return data||[]};
    if(!initialized){
     const cloud=await read();const known=new Set(cloud.map(x=>x.id));
     // Import this device's previous bookmarks once. Tombstones count as known IDs.
     const marker='mind-flow-mantra-imported:'+who;
     if(!localStorage.getItem(marker)){
      for(const x of mantraRows(latest.current))if(!known.has(x.id)&&!pending.current.has(x.id))pending.current.set(x.id,x);
      stash();
     }
     initialized=true;
    }
    if(pending.current.size){
     setStatus('동기화 중…');const batch=[...pending.current.values()];
     const {error}=await db.from(TABLE).upsert(batch.map(x=>({...x,user_id:who,updated_at:new Date().toISOString()})),{onConflict:'user_id,id'});if(error)throw error;
     for(const x of batch)if(pending.current.get(x.id)===x)pending.current.delete(x.id);stash();
    }
    const cloud=await read();
    // A local edit made during the request wins until its next successful upload.
    const rows=new Map(cloud.map(x=>[x.id,x]));for(const x of pending.current.values())rows.set(x.id,x);
    if(alive){apply(readMantraRows([...rows.values()]));setReady(true);setStatus(pending.current.size?'동기화 중…':'동기화 완료');localStorage.setItem('mind-flow-mantra-imported:'+who,'1');}
   }catch(e){if(alive)setStatus('동기화 실패: '+e.message)}finally{working=false;}
  }
  retry.current=sync;sync();timer=setInterval(sync,5000);
  const focus=()=>sync();window.addEventListener('focus',focus);window.addEventListener('online',focus);document.addEventListener('visibilitychange',focus);
  return()=>{alive=false;clearInterval(timer);window.removeEventListener('focus',focus);window.removeEventListener('online',focus);document.removeEventListener('visibilitychange',focus)};
 },[]);
 function save(patch){if(!ready)return;const before=latest.current;const changes=typeof patch==='function'?patch(before):patch;const next={...before,...changes};for(const row of mantraDelta(before,next))pending.current.set(row.id,row);stash();apply(next);setStatus('동기화 중…');retry.current();}
 return {data:{...local,...state},save,ready,status,retry:()=>retry.current()};
}
