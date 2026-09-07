#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
const readline = require('readline/promises');
const { stdin: input, stdout: output } = require('process');

const URL='https://wmqjlbrgdjgfjwopekup.supabase.co';
const KEY='sb_publishable_N3BSrFzEidi-nN8hYbWFg_WbjMMsDn';
const rl=readline.createInterface({input,output});
const ask=q=>rl.question(q);

(async()=>{
  console.log('\nYellow Zone Admin - إنشاء حسابات الإدارة الحقيقية\n');
  const accounts=[
    {username:'Eman',name:'إيمان',role:'full_admin',email:'eman@yellowzone.local'},
    {username:'Alaa',name:'آلاء',role:'pricing_ads',email:'alaa@yellowzone.local'}
  ];
  const sb=createClient(URL,KEY);
  for(const a of accounts){
    console.log(`\nالحساب: ${a.username} (${a.role})`);
    const password=await ask('كلمة المرور: ');
    if(password.length<8){console.log('كلمة المرور يجب أن تكون 8 أحرف على الأقل.');continue;}
    const {data,error}=await sb.auth.signUp({email:a.email,password});
    if(error && !/already registered/i.test(error.message)){
      console.log('فشل إنشاء الحساب:',error.message); continue;
    }
    if(!data?.user){
      const sign=await sb.auth.signInWithPassword({email:a.email,password});
      if(sign.error){console.log('الحساب موجود لكن تعذر تسجيل الدخول:',sign.error.message);continue;}
    }
    const {data:ud}=await sb.auth.getUser();
    if(ud?.user){
      const {error:e}=await sb.from('admin_users').upsert({user_id:ud.user.id,display_name:a.name,role:a.role},{onConflict:'user_id'});
      if(e) console.log('تعذر حفظ الصلاحية:',e.message); else console.log('تم تجهيز الحساب والصلاحية.');
    }
    await sb.auth.signOut();
  }
  rl.close();
  console.log('\nانتهى الإعداد. استخدم Eman أو Alaa في شاشة الدخول.');
})().catch(e=>{console.error(e);rl.close()});
