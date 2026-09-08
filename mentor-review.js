(function(){
  const cfg=window.REVIEW_CONFIG||{};
  const status=document.getElementById('reviewStatus');
  const list=document.getElementById('reviewList');
  const form=document.getElementById('reviewForm');
  const refreshBtn=document.getElementById('refreshReview');
  const supabaseReady=cfg.supabaseUrl && cfg.supabaseAnonKey && !String(cfg.supabaseUrl).includes('YOUR-PROJECT') && !String(cfg.supabaseAnonKey).includes('YOUR_PUBLIC');

  function setStatus(message){ if(status) status.textContent=message||''; }
  function empty(message){ if(list) list.innerHTML='<div class="review-empty">'+message+'</div>'; }
  function esc(v){ return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c])); }
  function fmt(date){ try{return new Intl.DateTimeFormat(undefined,{dateStyle:'medium',timeStyle:'short'}).format(new Date(date));}catch{return date;} }
  const labels={overall:'Overall impression',about:'About Me',projects:'Projects',experience:'Experience & Activities',credentials:'Credentials & learning',visual:'Visual Diary','my-take':'My Take',journal:'Journal',future:'Vision & next steps'};

  if(!supabaseReady){
    setStatus('Review mode is not configured yet. The site itself remains fully usable.');
    empty('To activate private comments, create `review-config.js` from the example and add your Supabase project URL and public anon key. The setup guide is in README.md.');
    return;
  }

  const script=document.createElement('script');
  script.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
  script.onload=init;
  script.onerror=()=>{setStatus('Could not load the review service.');};
  document.head.appendChild(script);

  function init(){
    const client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey);
    async function load(){
      setStatus('Loading notes…');
      const {data:{session}}=await client.auth.getSession();
      if(!session){
        empty('Reviewer access required. Use the sign-in link sent to your approved email address.');
        addAuthButton(client);
        setStatus('');
        return;
      }
      document.getElementById('reviewName').value=session.user.user_metadata?.full_name||session.user.email?.split('@')[0]||'';
      const {data,error}=await client.from('mentor_comments').select('*').order('created_at',{ascending:false});
      if(error){setStatus(error.message); return;}
      if(!data?.length){empty('No notes yet. This is where your mentor’s first comments will appear.');setStatus('');return;}
      list.innerHTML=data.map(row=>'<article class="review-comment"><div class="comment-meta"><span>'+esc(row.section_key?labels[row.section_key]||row.section_key:'Overall impression')+'</span><span>'+esc(fmt(row.created_at))+'</span></div><h3>'+esc(row.author_name||'Mentor')+'</h3><p>'+esc(row.content)+'</p></article>').join('');
      setStatus('');
    }
    function addAuthButton(){
      if(document.getElementById('reviewAuth')) return;
      const wrap=document.createElement('div'); wrap.id='reviewAuth'; wrap.className='review-actions';
      wrap.innerHTML='<button class="btn btn-dark" type="button">Sign in to review</button>';
      form?.prepend(wrap);
      wrap.querySelector('button').addEventListener('click', async()=>{
        const email=prompt('Enter your approved reviewer email address:'); if(!email) return;
        setStatus('Sending sign-in link…');
        const {error}=await client.auth.signInWithOtp({email,options:{emailRedirectTo:location.href}});
        setStatus(error?error.message:'Check your email for the sign-in link.');
      });
    }
    form?.addEventListener('submit',async e=>{
      e.preventDefault();
      const {data:{session}}=await client.auth.getSession();
      if(!session){setStatus('Please sign in before saving a note.');return;}
      const fd=new FormData(form);
      const payload={author_name:fd.get('name'),author_email:session.user.email,section_key:fd.get('section'),content:fd.get('content')};
      setStatus('Saving note…');
      const {error}=await client.from('mentor_comments').insert(payload);
      if(error){setStatus(error.message);return;}
      form.reset(); document.getElementById('reviewName').value=payload.author_name||''; setStatus('Note saved.'); await load();
    });
    refreshBtn?.addEventListener('click',load);
    load();
  }
})();
