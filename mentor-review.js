(function(){
  const cfg=window.REVIEW_CONFIG||{};
  const ready=Boolean(window.supabase && cfg.supabaseUrl && cfg.supabaseAnonKey && !String(cfg.supabaseUrl).includes('YOUR-PROJECT') && !String(cfg.supabaseAnonKey).includes('YOUR_PUBLIC'));
  const authPanel=document.getElementById('authPanel'), workspace=document.getElementById('workspace');
  const authStatus=document.getElementById('authStatus'), reviewStatus=document.getElementById('reviewStatus');
  const list=document.getElementById('reviewList'), form=document.getElementById('reviewForm');
  const labels={overall:'Overall impression',about:'About Me',projects:'Projects',experience:'Experience & Activities',credentials:'Credentials & learning',visual:'Visual Diary','my-take':'My Take',journal:'Journal',future:'Vision & next steps'};
  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}
  function setStatus(el,msg){if(el)el.textContent=msg||'';}
  function fmt(v){try{return new Intl.DateTimeFormat(undefined,{dateStyle:'medium',timeStyle:'short'}).format(new Date(v));}catch{return String(v||'');}}
  function show(panel){panel?.classList.remove('review-hidden');}
  function hide(panel){panel?.classList.add('review-hidden');}
  if(!ready){setStatus(authStatus,'Review access is not configured yet. Add your Supabase values to review-config.js.'); return;}
  const client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey);
  function render(rows){
    if(!rows?.length){list.innerHTML='<div class="review-empty">No notes yet. Your feedback history will appear here.</div>';return;}
    list.innerHTML=rows.map(r=>'<article class="review-comment"><div class="meta"><span>'+esc(labels[r.section_key]||r.section_key)+'</span><span>'+esc(fmt(r.created_at))+'</span></div><h4>'+esc(r.author_name||'Reviewer')+'</h4><p><strong>'+esc(r.feedback_type||'Thought')+'</strong><br>'+esc(r.content)+'</p><span class="status">'+esc(r.status||'new')+'</span>'+(r.reply?'<div class="reply"><div class="reply-label">Marie’s reply</div><p>'+esc(r.reply)+'</p></div>':'')+'</article>').join('');
  }
  async function load(){
    const {data:{session}}=await client.auth.getSession();
    if(!session){hide(workspace);show(authPanel);setStatus(reviewStatus,'');return;}
    hide(authPanel);show(workspace);document.getElementById('sessionEmail').textContent=session.user.email||'';
    const isOwner=cfg.ownerEmail && session.user.email?.toLowerCase()===cfg.ownerEmail.toLowerCase();
    document.body.dataset.owner=isOwner?'true':'false';
    const query=isOwner?client.from('mentor_comments').select('*').order('created_at',{ascending:false}):client.from('mentor_comments').select('*').eq('author_email',session.user.email).order('created_at',{ascending:false});
    const {data,error}=await query;
    if(error){setStatus(reviewStatus,error.message);return;} render(data||[]);
  }
  document.getElementById('sendLink')?.addEventListener('click',async()=>{
    const email=document.getElementById('authEmail').value.trim();
    if(!email){setStatus(authStatus,'Please enter your email address.');return;}
    setStatus(authStatus,'Sending your secure link…');
    const {error}=await client.auth.signInWithOtp({email,options:{emailRedirectTo:window.location.href}});
    setStatus(authStatus,error?error.message:'Check your inbox for your secure sign-in link.');
  });
  document.getElementById('signOut')?.addEventListener('click',async()=>{await client.auth.signOut();await load();});
  form?.addEventListener('submit',async(e)=>{
    e.preventDefault();
    const {data:{session}}=await client.auth.getSession();
    if(!session){setStatus(reviewStatus,'Please sign in first.');return;}
    const content=document.getElementById('reviewContent').value.trim();
    if(!content){setStatus(reviewStatus,'Write a note before sending.');return;}
    const payload={author_name:session.user.user_metadata?.full_name||session.user.email?.split('@')[0]||'Reviewer',author_email:session.user.email,section_key:document.getElementById('reviewSection').value,feedback_type:document.querySelector('input[name="type"]:checked')?.value||'Thought',content,status:'new'};
    setStatus(reviewStatus,'Saving your feedback…');
    const {error}=await client.from('mentor_comments').insert(payload);
    if(error){setStatus(reviewStatus,error.message);return;}
    document.getElementById('reviewContent').value='';setStatus(reviewStatus,'Thank you. Your feedback has been saved.');await load();
  });
  client.auth.onAuthStateChange(()=>load());
  load();
})();
