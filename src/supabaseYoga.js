import {createClient} from '@supabase/supabase-js';
const url=import.meta.env.VITE_SUPABASE_URL;
const key=import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const yogaSupabase=(url&&key)?createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true}}):null;
export const YOGA_BUCKET='mindflow-yoga';
export const photoPath=(userId,poseId)=>`${userId}/${poseId}/${crypto.randomUUID()}.jpg`;
export async function signedYogaPhotos(supabase,userId){
  const {data,error}=await supabase.from('mindflow_yoga_photos').select('pose_id,storage_path').eq('user_id',userId);
  if(error)throw error;
  const result={}; const paths={};
  await Promise.all((data||[]).map(async row=>{
    paths[row.pose_id]=row.storage_path;
    const {data:signed,error:err}=await supabase.storage.from(YOGA_BUCKET).createSignedUrl(row.storage_path,3600);
    if(err)throw err;
    result[row.pose_id]=signed.signedUrl;
  }));
  return {urls:result,paths};
}
