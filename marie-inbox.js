(function () {
  "use strict";

  const cfg = window.REVIEW_CONFIG || {};
  const ready = Boolean(window.supabase && cfg.supabaseUrl && cfg.supabaseAnonKey && !String(cfg.supabaseUrl).includes("YOUR-PROJECT") && !String(cfg.supabaseAnonKey).includes("YOUR_PUBLIC"));
  const gate = document.getElementById("gate");
  const dash = document.getElementById("dash");
  const list = document.getElementById("inboxList");
  const gateStatus = document.getElementById("gateStatus");
  const dashStatus = document.getElementById("dashStatus");
  const labels = { overall:"Overall impression", about:"About Me", projects:"Projects", experience:"Experience & Activities", credentials:"Credentials & learning", visual:"Visual Diary", "my-take":"My Take", journal:"Journal", future:"Vision & next steps" };
  const types = ["thought","suggestion","question"];
  let rows = [];
  let currentFilter = "all";

  function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));}
  function fmt(v){try{return new Intl.DateTimeFormat(undefined,{dateStyle:"medium",timeStyle:"short"}).format(new Date(v));}catch{return String(v||"");}}
  function normalizeType(v){const t=String(v||"thought").toLowerCase();return types.includes(t)?t:"thought";}
  function titleCase(v){const t=normalizeType(v);return t.charAt(0).toUpperCase()+t.slice(1);}

  if(!ready){gateStatus.textContent="Review access is not configured yet. Add your Supabase values to review-config.js.";return;}
  const client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey);

  async function load(){
    try{
      const {data:{session}}=await client.auth.getSession();
      const ownerEmail=String(cfg.ownerEmail||"").toLowerCase();
      if(!session||!ownerEmail||session.user.email?.toLowerCase()!==ownerEmail){dash.classList.add("hidden");gate.classList.remove("hidden");return;}
      gate.classList.add("hidden");dash.classList.remove("hidden");
      const me=document.getElementById("me");if(me)me.textContent=session.user.email||"";
      const {data,error}=await client.from("mentor_comments").select("*").order("created_at",{ascending:false});
      if(error)throw error;
      rows=data||[];
      document.getElementById("newCount").textContent=rows.filter(r=>(r.status||"new")==="new").length;
      document.getElementById("openCount").textContent=rows.filter(r=>["new","in progress"].includes(r.status||"new")).length;
      document.getElementById("doneCount").textContent=rows.filter(r=>(r.status||"new")==="addressed").length;
      render();
    }catch(error){dashStatus.textContent=error.message||"Unable to load the inbox.";}
  }

  function render(){
    const filtered=currentFilter==="all"?rows:rows.filter(r=>(r.status||"new")===currentFilter);
    if(!filtered.length){list.innerHTML='<div class="empty">No notes in this view.</div>';return;}
    list.innerHTML=filtered.map(r=>`<article class="note" data-id="${esc(r.id)}">
      <div class="note-meta"><span>${esc(labels[r.section_key]||r.section_key)} · ${esc(titleCase(r.feedback_type))}</span><span>${esc(fmt(r.created_at))}</span></div>
      <h3>${esc(r.author_name||"Mentor")}</h3>
      <p class="note-content">${esc(r.content)}</p>
      <span class="pill">${esc(r.status||"new")}</span>
      <div class="note-actions">
        <button class="filter edit-inbox" data-id="${esc(r.id)}" type="button">Edit</button>
        <button class="filter delete-inbox" data-id="${esc(r.id)}" type="button">Delete</button>
      </div>
      <div class="inbox-edit hidden" data-edit-area="${esc(r.id)}">
        <div class="inbox-edit-grid">
          <select data-edit-type="${esc(r.id)}">${types.map(t=>`<option value="${t}" ${normalizeType(r.feedback_type)===t?"selected":""}>${t.charAt(0).toUpperCase()+t.slice(1)}</option>`).join("")}</select>
          <textarea data-edit-content="${esc(r.id)}">${esc(r.content)}</textarea>
        </div>
        <div class="reply-row"><button class="btn btn-dark save-inbox" data-id="${esc(r.id)}" type="button">Save changes</button><button class="filter cancel-inbox" data-id="${esc(r.id)}" type="button">Cancel</button></div>
      </div>
      ${r.reply?`<div class="reply-box"><div class="k">MARIE'S REPLY</div><p style="margin-top:7px">${esc(r.reply)}</p></div>`:`<div class="reply-box"><div class="k">REPLY TO THIS NOTE</div><textarea data-reply="${esc(r.id)}" placeholder="Write a short response..."></textarea><div class="reply-row"><button class="btn btn-dark reply-btn" data-id="${esc(r.id)}" type="button">Save reply</button><button class="filter mark-btn" data-id="${esc(r.id)}" type="button">Mark as addressed</button></div></div>`}
    </article>`).join("");
  }

  document.getElementById("login")?.addEventListener("click",async()=>{const email=document.getElementById("email").value.trim();if(!email){gateStatus.textContent="Enter your email address.";return;}gateStatus.textContent="Sending your secure link...";const {error}=await client.auth.signInWithOtp({email,options:{emailRedirectTo:location.href}});gateStatus.textContent=error?error.message:"Check your inbox for your secure sign-in link.";});
  document.getElementById("logout")?.addEventListener("click",async()=>{await client.auth.signOut();await load();});
  document.querySelectorAll(".filter[data-filter]").forEach(btn=>btn.addEventListener("click",()=>{document.querySelectorAll(".filter[data-filter]").forEach(x=>x.classList.remove("active"));btn.classList.add("active");currentFilter=btn.dataset.filter;render();}));

  list?.addEventListener("click",async e=>{
    const editBtn=e.target.closest(".edit-inbox");
    const cancelBtn=e.target.closest(".cancel-inbox");
    const saveBtn=e.target.closest(".save-inbox");
    const deleteBtn=e.target.closest(".delete-inbox");
    const replyBtn=e.target.closest(".reply-btn");
    const markBtn=e.target.closest(".mark-btn");

    if(editBtn){list.querySelector(`[data-edit-area="${CSS.escape(editBtn.dataset.id)}"]`)?.classList.remove("hidden");return;}
    if(cancelBtn){list.querySelector(`[data-edit-area="${CSS.escape(cancelBtn.dataset.id)}"]`)?.classList.add("hidden");return;}
    if(saveBtn){
      const id=saveBtn.dataset.id;const typeEl=list.querySelector(`[data-edit-type="${CSS.escape(id)}"]`);const contentEl=list.querySelector(`[data-edit-content="${CSS.escape(id)}"]`);const content=contentEl?.value.trim()||"";if(!content){dashStatus.textContent="Write a note before saving.";return;}
      const {error}=await client.from("mentor_comments").update({feedback_type:normalizeType(typeEl?.value),content,updated_at:new Date().toISOString()}).eq("id",id);if(error){dashStatus.textContent=error.message;return;}dashStatus.textContent="Feedback updated.";await load();return;
    }
    if(deleteBtn){
      const id=deleteBtn.dataset.id;if(!window.confirm("Delete this feedback permanently?"))return;const {error}=await client.from("mentor_comments").delete().eq("id",id);if(error){dashStatus.textContent=error.message;return;}dashStatus.textContent="Feedback deleted.";await load();return;
    }
    if(replyBtn){const id=replyBtn.dataset.id;const area=list.querySelector(`textarea[data-reply="${CSS.escape(id)}"]`);const reply=(area?.value||"").trim();if(!reply)return;const {error}=await client.from("mentor_comments").update({reply,replied_at:new Date().toISOString(),status:"in progress"}).eq("id",id);if(error){dashStatus.textContent=error.message;return;}dashStatus.textContent="Reply saved.";await load();return;}
    if(markBtn){const id=markBtn.dataset.id;const {error}=await client.from("mentor_comments").update({status:"addressed"}).eq("id",id);if(error){dashStatus.textContent=error.message;return;}dashStatus.textContent="Marked as addressed.";await load();}
  });

  client.auth.onAuthStateChange(()=>load());
  load();
})();
