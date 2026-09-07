const SUPABASE_URL='https://wmqjlbrgdjgfjwopekup.supabase.co';
const SUPABASE_KEY='sb_publishable_N3BSrFZfEidi-nN8hYbWFg_WbjMMsDn';

const USERS={
  Eman:{password:'Yz!7Kp#42Lm@9Q',role:'full',label:'إيمان'},
  Alaa:{password:'Yz#9Hm@64Qw!2P',role:'pricing_ads',label:'آلاء (Ads)'}
};
const perms={full:['stats','bookings','offers','ads'],pricing_ads:['offers','ads']};
let current=null;

const $=id=>document.getElementById(id);
async function api(path,opts={}){
  const r=await fetch(SUPABASE_URL+'/rest/v1/'+path,{
    ...opts,
    headers:{
      apikey:SUPABASE_KEY,
      Authorization:'Bearer '+SUPABASE_KEY,
      'Content-Type':'application/json',
      Prefer:'return=representation',
      ...(opts.headers||{})
    }
  });
  if(!r.ok) throw new Error(await r.text());
  return r.status===204?null:r.json();
}
function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}

function applyPermissions(){
  document.querySelectorAll('[data-perm]').forEach(el=>{
    const p=el.dataset.perm;
    el.classList.toggle('hidden',!perms[current.role].includes(p));
  });
}

function login(){
  const u=$('username').value.trim(), p=$('password').value;
  if(!USERS[u] || USERS[u].password!==p){
    $('loginMsg').textContent='اسم المستخدم أو كلمة المرور غير صحيحة';
    return;
  }
  current={...USERS[u],username:u};
  sessionStorage.setItem('yz_admin',u);
  $('loginView').classList.add('hidden');
  $('app').classList.remove('hidden');
  $('userName').textContent=current.label;
  $('welcomeName').textContent=current.label;
  $('userRole').textContent=current.role==='full'?'أدمن كامل':'إدارة الأسعار والإعلانات';
  applyPermissions();
  showPage('dashboard');
  loadAll();
}

function logout(){sessionStorage.removeItem('yz_admin');location.reload()}

function showPage(id){
  const el=$(id);
  if(!el) return;
  if(el.dataset.perm && !perms[current.role].includes(el.dataset.perm)) return;
  document.querySelectorAll('.page').forEach(x=>x.classList.add('hidden'));
  el.classList.remove('hidden');
  $('pageTitle').textContent={dashboard:'الرئيسية',bookings:'الحجوزات',offers:'الأسعار والباقات',ads:'الإعلانات والفعاليات'}[id]||'Yellow Zone';
  if(id==='bookings')loadBookings();
  if(id==='offers')loadOffers();
  if(id==='ads')loadAds();
}

async function loadDashboard(){
  if(current.role!=='full') return;
  try{
    const b=await api('bookings?select=id,status,service_type,customer_name,booking_date,created_at,guests&order=created_at.desc');
    $('totalBookings').textContent=b.length;
    $('newBookings').textContent=b.filter(x=>x.status==='new').length;
    $('confirmedBookings').textContent=b.filter(x=>x.status==='confirmed').length;
    $('birthdayBookings').textContent=b.filter(x=>(x.service_type||'').toLowerCase().includes('birthday')||(x.service_type||'').includes('عيد')).length;
    $('recentBookings').innerHTML=b.slice(0,8).map(x=>`<div class="row"><div><b>${esc(x.customer_name||'بدون اسم')}</b><small>${esc(x.booking_date||'')} · ${x.guests||0} أشخاص</small></div><span class="tag">${esc(x.status||'new')}</span></div>`).join('')||'<div class="empty">لا توجد حجوزات حتى الآن</div>';
  }catch(e){
    $('recentBookings').innerHTML='<div class="error">تعذر تحميل الحجوزات</div>';
  }
}

async function loadBookings(){
  try{
    const b=await api('bookings?select=id,booking_code,customer_name,customer_phone,booking_date,guests,status,service_type,notes,created_at&order=created_at.desc');
    $('bookingsList').innerHTML=b.map(x=>`<div class="booking">
      <div class="booking-top"><div><b>${esc(x.customer_name||'بدون اسم')}</b><small>${esc(x.booking_code||'')}</small></div><select onchange="setStatus(${x.id},this.value)">
      <option value="new" ${x.status==='new'?'selected':''}>جديد</option><option value="confirmed" ${x.status==='confirmed'?'selected':''}>مؤكد</option><option value="cancelled" ${x.status==='cancelled'?'selected':''}>ملغي</option></select></div>
      <div class="booking-grid"><span>الهاتف<br><b>${esc(x.customer_phone||'-')}</b></span><span>التاريخ<br><b>${esc(x.booking_date||'-')}</b></span><span>العدد<br><b>${x.guests||0}</b></span><span>الخدمة<br><b>${esc(x.service_type||'-')}</b></span></div>
      ${x.notes?`<div class="notes">${esc(x.notes)}</div>`:''}
    </div>`).join('')||'<div class="empty">لا توجد حجوزات</div>';
  }catch(e){$('bookingsList').innerHTML='<div class="error">تعذر تحميل الحجوزات</div>'}
}
async function setStatus(id,status){
  try{await api('bookings?id=eq.'+id,{method:'PATCH',body:JSON.stringify({status})});loadBookings();loadDashboard()}
  catch(e){alert('تعذر تحديث حالة الحجز')}
}

async function loadOffers(){
  try{
    const o=await api('offers?select=id,name_ar,name_en,description_ar,description_en,price,active,category,sort_order&order=sort_order.asc,id.asc');
    $('offersList').innerHTML=o.map(x=>`<div class="offer-row">
      <div><b>${esc(x.name_ar||x.name_en||'بدون اسم')}</b><small>${esc(x.description_ar||'')}</small></div>
      <div class="offer-right"><strong>${x.price??0} ريال</strong><span class="${x.active?'active':'inactive'}">${x.active?'ظاهر':'مخفي'}</span><button onclick="editOffer(${x.id})">تعديل</button></div>
    </div>`).join('')||'<div class="empty">لا توجد باقات</div>';
  }catch(e){$('offersList').innerHTML='<div class="error">تعذر تحميل الأسعار</div>'}
}
async function editOffer(id){
  try{
    const a=await api('offers?id=eq.'+id);
    const x=a[0]; if(!x)return;
    $('offerId').value=x.id;$('offerNameAr').value=x.name_ar||'';$('offerNameEn').value=x.name_en||'';
    $('offerDescAr').value=x.description_ar||'';$('offerPrice').value=x.price??0;$('offerActive').checked=!!x.active;
    $('offerEditor').classList.remove('hidden');$('offerMsg').textContent='';
  }catch(e){alert('تعذر فتح الباقة')}
}
async function saveOffer(){
  const id=$('offerId').value;
  const body={name_ar:$('offerNameAr').value.trim(),name_en:$('offerNameEn').value.trim(),description_ar:$('offerDescAr').value.trim(),price:Number($('offerPrice').value)||0,active:$('offerActive').checked};
  try{await api('offers?id=eq.'+id,{method:'PATCH',body:JSON.stringify(body)});$('offerEditor').classList.add('hidden');loadOffers()}
  catch(e){$('offerMsg').textContent='تعذر الحفظ: '+e.message}
}

async function loadAds(){
  try{
    const a=await api('ads?select=id,title,text,image_url,active,created_at&order=sort_order.asc,created_at.desc');
    $('adsList').innerHTML=a.map(x=>`<div class="ad-row">
      <div class="ad-info">${x.image_url?`<img src="${esc(x.image_url)}" alt="">`:''}<div><b>${esc(x.title||'بدون عنوان')}</b><small>${esc(x.text||'')}</small></div></div>
      <div class="ad-actions"><span class="${x.active?'active':'inactive'}">${x.active?'ظاهر للعملاء':'مخفي'}</span><button onclick="editAd('${x.id}')">تعديل</button><button class="danger" onclick="deleteAd('${x.id}')">حذف</button></div>
    </div>`).join('')||'<div class="empty">لا توجد إعلانات</div>';
  }catch(e){$('adsList').innerHTML='<div class="error">تعذر تحميل الإعلانات</div>'}
}
async function editAd(id){
  try{
    const a=await api('ads?id=eq.'+encodeURIComponent(id));const x=a[0];if(!x)return;
    $('adId').value=x.id;$('adTitle').value=x.title||'';$('adBody').value=x.text||'';$('adImage').value=x.image_url||'';$('adActive').checked=!!x.active;
    $('editorTitle').textContent='تعديل الإعلان';$('adEditor').classList.remove('hidden');$('adMsg').textContent='';
  }catch(e){alert('تعذر فتح الإعلان')}
}
async function deleteAd(id){
  if(!confirm('حذف الإعلان نهائيًا؟'))return;
  try{await api('ads?id=eq.'+encodeURIComponent(id),{method:'DELETE'});loadAds()}
  catch(e){alert('تعذر حذف الإعلان')}
}
async function saveAd(){
  const body={title:$('adTitle').value.trim(),text:$('adBody').value.trim(),image_url:$('adImage').value.trim()||null,active:$('adActive').checked};
  if(!body.title){$('adMsg').textContent='اكتب عنوان الإعلان';return}
  try{
    if($('adId').value) await api('ads?id=eq.'+encodeURIComponent($('adId').value),{method:'PATCH',body:JSON.stringify(body)});
    else await api('ads',{method:'POST',body:JSON.stringify(body)});
    $('adEditor').classList.add('hidden');loadAds();
  }catch(e){$('adMsg').textContent='تعذر الحفظ: '+e.message}
}

function loadAll(){loadDashboard();loadOffers();loadAds()}

$('loginForm').addEventListener('submit',e=>{e.preventDefault();login()});
$('logout').addEventListener('click',logout);
document.querySelectorAll('nav button').forEach(b=>b.addEventListener('click',()=>showPage(b.dataset.page)));
$('refreshAll').addEventListener('click',loadAll);
$('refreshBookings').addEventListener('click',loadBookings);
$('refreshOffers').addEventListener('click',loadOffers);
$('newAd').addEventListener('click',()=>{
  $('adId').value='';$('adTitle').value='';$('adBody').value='';$('adImage').value='';$('adActive').checked=true;
  $('editorTitle').textContent='إعلان جديد';$('adEditor').classList.remove('hidden');$('adMsg').textContent='';
});
$('cancelAd').addEventListener('click',()=>$('adEditor').classList.add('hidden'));
$('saveAd').addEventListener('click',saveAd);
$('saveOffer').addEventListener('click',saveOffer);
$('cancelOffer').addEventListener('click',()=>$('offerEditor').classList.add('hidden'));

const remembered=sessionStorage.getItem('yz_admin');
if(remembered&&USERS[remembered]){
  current={...USERS[remembered],username:remembered};
  $('loginView').classList.add('hidden');$('app').classList.remove('hidden');
  $('userName').textContent=current.label;$('welcomeName').textContent=current.label;
  $('userRole').textContent=current.role==='full'?'أدمن كامل':'إدارة الأسعار والإعلانات';
  applyPermissions();showPage('dashboard');loadAll();
}