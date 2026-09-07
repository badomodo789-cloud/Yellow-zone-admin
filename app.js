const SUPABASE_URL='https://wmqjlbrgdjgfjwopekup.supabase.co';
const SUPABASE_KEY='sb_publishable_N3BSrFzEidi-nN8hYbWFg_WbjMMsDn';
const USERS={
  Eman:{password:'Yz!7Kp#42Lm@9Q',role:'full',label:'إيمان'},
  Alaa:{password:'Yz#9Hm@64Qw!2P',role:'pricing_ads',label:'آلاء (Ads)'}
};
const perms={full:['stats','bookings','offers','ads'],pricing_ads:['offers','ads']};
let current=null;

const $=id=>document.getElementById(id);
async function api(path,opts={}){
  const r=await fetch(SUPABASE_URL+'/rest/v1/'+path,{
    ...opts,headers:{apikey:SUPABASE_KEY,Authorization:'Bearer '+SUPABASE_KEY,'Content-Type':'application/json',Prefer:'return=representation',...(opts.headers||{})}
  });
  if(!r.ok) throw new Error(await r.text());
  return r.status===204?null:r.json();
}
function applyPermissions(){
  document.querySelectorAll('[data-perm]').forEach(el=>{
    const p=el.dataset.perm;
    el.classList.toggle('hidden',!perms[current.role].includes(p));
  });
}
function login(){
  const u=$('username').value.trim(),p=$('password').value;
  if(!USERS[u]||USERS[u].password!==p){$('loginMsg').textContent='اسم المستخدم أو كلمة المرور غير صحيحة';return}
  current={...USERS[u],username:u};
  sessionStorage.setItem('yz_admin',u);
  $('loginView').classList.add('hidden');$('app').classList.remove('hidden');
  $('userName').textContent=current.label;$('userRole').textContent=current.role==='full'?'أدمن كامل':'إدارة الأسعار والإعلانات';
  applyPermissions();loadAll();
}
function logout(){sessionStorage.removeItem('yz_admin');location.reload()}
function showPage(id){
  document.querySelectorAll('.page').forEach(x=>x.classList.add('hidden'));
  const el=$(id); if(!el||el.classList.contains('hidden')) return;
  el.classList.remove('hidden');
  $('pageTitle').textContent={dashboard:'الرئيسية',bookings:'الحجوزات',offers:'الأسعار والباقات',ads:'الإعلانات والفعاليات'}[id];
  if(id==='bookings')loadBookings(); if(id==='offers')loadOffers(); if(id==='ads')loadAds();
}
async function loadDashboard(){
  if(current.role!=='full') return;
  try{
    const b=await api('bookings?select=id,status,service_type,customer_name,booking_date,created_at&order=created_at.desc');
    $('totalBookings').textContent=b.length;
    $('newBookings').textContent=b.filter(x=>x.status==='new').length;
    $('confirmedBookings').textContent=b.filter(x=>x.status==='confirmed').length;
    $('birthdayBookings').textContent=b.filter(x=>(x.service_type||'').toLowerCase().includes('birthday')||(x.service_type||'').includes('عيد')).length;
    $('recentBookings').innerHTML=b.slice(0,8).map(x=>`<div class="row"><b>${esc(x.customer_name||'بدون اسم')}</b> · ${esc(x.booking_date||'')} <span class="tag">${esc(x.status||'new')}</span></div>`).join('')||'لا توجد حجوزات';
  }catch(e){$('recentBookings').textContent='تعذر تحميل البيانات'}
}
async function loadBookings(){
  try{
    const b=await api('bookings?select=id,booking_code,customer_name,customer_phone,booking_date,guests,status,service_type,notes,created_at&order=created_at.desc');
    $('bookingsList').innerHTML=b.map(x=>`<div class="row"><b>${esc(x.customer_name||'')}</b><br>الهاتف: ${esc(x.customer_phone||'')} · العدد: ${x.guests||0} · التاريخ: ${esc(x.booking_date||'')}<br>الخدمة: ${esc(x.service_type||'')} · الحالة: <select onchange="setStatus(${x.id},this.value)"><option ${x.status==='new'?'selected':''}>new</option><option ${x.status==='confirmed'?'selected':''}>confirmed</option><option ${x.status==='cancelled'?'selected':''}>cancelled</option></select><br>${esc(x.notes||'')}</div>`).join('')||'لا توجد حجوزات';
  }catch(e){$('bookingsList').textContent='تعذر تحميل الحجوزات'}
}
async function setStatus(id,status){try{await api('bookings?id=eq.'+id,{method:'PATCH',body:JSON.stringify({status})});loadBookings();loadDashboard()}catch(e){alert('تعذر تحديث الحالة')}}
async function loadOffers(){
  try{
    const o=await api('offers?select=id,name_ar,name_en,description_ar,description_en,price,active,category&order=sort_order.asc');
    $('offersList').innerHTML=o.map(x=>`<div class="row"><b>${esc(x.name_ar||x.name_en||x.title||'')}</b> · <strong>${x.price??0} ريال</strong><br><small>${esc(x.description_ar||'')} · ${x.active?'نشط':'مخفي'}</small></div>`).join('')||'لا توجد باقات';
  }catch(e){$('offersList').textContent='تعذر تحميل الأسعار'}
}
async function loadAds(){
  try{
    const a=await api('ads?select=id,title,text,image_url,active,created_at&order=sort_order.asc,created_at.desc');
    $('adsList').innerHTML=a.map(x=>`<div class="row"><b>${esc(x.title||'بدون عنوان')}</b> · ${x.active?'ظاهر':'مخفي'}<br>${esc(x.text||'')}<br><span class="edit" onclick="editAd(${x.id?`'${x.id}'`:0})">تعديل</span><span class="danger" onclick="deleteAd('${x.id}')">حذف</span></div>`).join('')||'لا توجد إعلانات';
  }catch(e){$('adsList').textContent='تعذر تحميل الإعلانات'}
}
function editAd(id){
  api('ads?id=eq.'+id).then(a=>{const x=a[0];$('adId').value=x.id;$('adTitle').value=x.title||'';$('adBody').value=x.text||'';$('adImage').value=x.image_url||'';$('adActive').checked=!!x.active;$('editorTitle').textContent='تعديل الإعلان';$('adEditor').classList.remove('hidden')});
}
async function deleteAd(id){if(!confirm('حذف الإعلان؟'))return;try{await api('ads?id=eq.'+id,{method:'DELETE'});loadAds()}catch(e){alert('تعذر الحذف')}}
async function saveAd(){
  const body={title:$('adTitle').value.trim(),text:$('adBody').value.trim(),image_url:$('adImage').value.trim()||null,active:$('adActive').checked};
  try{
    if($('adId').value) await api('ads?id=eq.'+encodeURIComponent($('adId').value),{method:'PATCH',body:JSON.stringify(body)});
    else await api('ads',{method:'POST',body:JSON.stringify(body)});
    $('adEditor').classList.add('hidden');loadAds();
  }catch(e){$('adMsg').textContent='تعذر الحفظ: '+e.message}
}
function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
async function loadAll(){loadDashboard();loadOffers();loadAds()}
$('loginForm').addEventListener('submit',e=>{e.preventDefault();login()});
$('logout').addEventListener('click',logout);
document.querySelectorAll('nav button').forEach(b=>b.addEventListener('click',()=>showPage(b.dataset.page)));
$('newAd').addEventListener('click',()=>{$('adId').value='';$('adTitle').value='';$('adBody').value='';$('adImage').value='';$('adActive').checked=true;$('editorTitle').textContent='إعلان جديد';$('adEditor').classList.remove('hidden')});
$('cancelAd').addEventListener('click',()=>$('adEditor').classList.add('hidden'));
$('saveAd').addEventListener('click',saveAd);
$('refreshOffers').addEventListener('click',loadOffers);
const remembered=sessionStorage.getItem('yz_admin'); if(remembered&&USERS[remembered]){current={...USERS[remembered],username:remembered};$('loginView').classList.add('hidden');$('app').classList.remove('hidden');$('userName').textContent=current.label;$('userRole').textContent=current.role==='full'?'أدمن كامل':'إدارة الأسعار والإعلانات';applyPermissions();loadAll()}