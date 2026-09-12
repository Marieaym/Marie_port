(function () {
  "use strict";

  const cfg = window.REVIEW_CONFIG || {};
  const ready = Boolean(
    window.supabase &&
      cfg.supabaseUrl &&
      cfg.supabaseAnonKey &&
      !String(cfg.supabaseUrl).includes("YOUR-PROJECT") &&
      !String(cfg.supabaseAnonKey).includes("YOUR_PUBLIC")
  );

  const authPanel = document.getElementById("authPanel");
  const workspace = document.getElementById("workspace");
  const authStatus = document.getElementById("authStatus");
  const reviewStatus = document.getElementById("reviewStatus");
  const list = document.getElementById("reviewList");
  const form = document.getElementById("reviewForm");

  const labels = {
    overall: "Overall impression",
    about: "About Me",
    projects: "Projects",
    experience: "Experience & Activities",
    credentials: "Credentials & learning",
    visual: "Visual Diary",
    "my-take": "My Take",
    journal: "Journal",
    future: "Vision & next steps"
  };

  const types = ["thought", "suggestion", "question"];

  function esc(v) {
    return String(v ?? "").replace(/[&<>"']/g, c => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    }[c]));
  }

  function setStatus(el, msg) { if (el) el.textContent = msg || ""; }
  function fmt(v) {
    try { return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(v)); }
    catch { return String(v || ""); }
  }
  function show(el) { el?.classList.remove("review-hidden"); }
  function hide(el) { el?.classList.add("review-hidden"); }
  function normalizeType(v) {
    const t = String(v || "thought").trim().toLowerCase();
    return types.includes(t) ? t : "thought";
  }
  function titleCase(v) { const t = normalizeType(v); return t.charAt(0).toUpperCase() + t.slice(1); }

  if (!ready) {
    setStatus(authStatus, "Review access is not configured yet. Add your Supabase values to review-config.js.");
    return;
  }

  const client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "implicit"
    }
  });

  async function getSession() {
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    return data.session;
  }

  async function load() {
    try {
      const session = await getSession();
      if (!session) {
        hide(workspace); show(authPanel); setStatus(reviewStatus, ""); return;
      }

      hide(authPanel); show(workspace);
      const sessionEmail = (session.user.email || "").toLowerCase();
      const emailEl = document.getElementById("sessionEmail");
      if (emailEl) emailEl.textContent = session.user.email || "";

      const ownerEmail = String(cfg.ownerEmail || "").toLowerCase();
      const isOwner = Boolean(ownerEmail && sessionEmail === ownerEmail);
      document.body.dataset.owner = isOwner ? "true" : "false";

      let query = client.from("mentor_comments").select("*").order("created_at", { ascending: false });
      if (!isOwner) query = query.eq("author_email", session.user.email);

      const { data, error } = await query;
      if (error) throw error;
      render(data || [], isOwner);
    } catch (error) {
      console.error(error);
      setStatus(reviewStatus, error.message || "Unable to load the review space.");
    }
  }

  function render(rows, isOwner) {
    if (!list) return;
    if (!rows.length) {
      list.innerHTML = '<div class="review-empty">Your feedback history will appear here once you leave a note.</div>';
      return;
    }

    list.innerHTML = rows.map(r => `
      <article class="review-comment" data-id="${esc(r.id)}">
        <div class="meta">
          <span>${esc(labels[r.section_key] || r.section_key || "Portfolio")}</span>
          <span>${esc(fmt(r.created_at))}</span>
        </div>
        <h4>${esc(r.author_name || "Reviewer")}</h4>
        <p class="comment-content"><strong>${esc(titleCase(r.feedback_type))}</strong><br>${esc(r.content)}</p>
        <span class="status">${esc(r.status || "new")}</span>
        <div class="comment-actions">
          <button type="button" class="text-link edit-note" data-id="${esc(r.id)}">Edit</button>
          <button type="button" class="text-link delete-note" data-id="${esc(r.id)}">Delete</button>
        </div>
        <div class="edit-area review-hidden" data-edit-area="${esc(r.id)}">
          <select class="edit-type" data-edit-type="${esc(r.id)}">
            ${types.map(t => `<option value="${t}" ${normalizeType(r.feedback_type) === t ? "selected" : ""}>${t.charAt(0).toUpperCase() + t.slice(1)}</option>`).join("")}
          </select>
          <textarea data-edit-content="${esc(r.id)}">${esc(r.content)}</textarea>
          <div class="edit-actions">
            <button type="button" class="btn btn-dark save-edit" data-id="${esc(r.id)}">Save changes</button>
            <button type="button" class="text-link cancel-edit" data-id="${esc(r.id)}">Cancel</button>
          </div>
        </div>
        ${r.reply ? `<div class="reply"><div class="reply-label">Marie's reply</div><p>${esc(r.reply)}</p>${r.replied_at ? `<small>${esc(fmt(r.replied_at))}</small>` : ""}</div>` : ""}
      </article>
    `).join("");

    if (!isOwner) {
      // The UI still allows Samira to edit/delete her own notes; RLS enforces ownership server-side.
    }
  }

  document.getElementById("sendLink")?.addEventListener("click", async () => {
    const email = document.getElementById("authEmail")?.value.trim();
    if (!email) { setStatus(authStatus, "Please enter your email address."); return; }
    setStatus(authStatus, "Sending your secure link...");
    try {
      const redirectUrl = `${window.location.origin}/mentor-review.html`;
      const { error } = await client.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectUrl }
      });
      setStatus(authStatus, error ? error.message : "Check your inbox for your secure sign-in link.");
    } catch (error) { setStatus(authStatus, error.message || "Unable to send the sign-in link."); }
  });

  document.getElementById("signOut")?.addEventListener("click", async () => {
    await client.auth.signOut();
    await load();
  });

  form?.addEventListener("submit", async e => {
    e.preventDefault();
    try {
      const session = await getSession();
      if (!session) { setStatus(reviewStatus, "Please sign in first."); return; }
      const content = document.getElementById("reviewContent")?.value.trim() || "";
      if (!content) { setStatus(reviewStatus, "Write a note before sending."); return; }
      const feedbackType = normalizeType(document.querySelector('input[name="type"]:checked')?.value);
      const sectionKey = document.getElementById("reviewSection")?.value || "overall";

      const payload = {
        author_name: session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "Reviewer",
        author_email: session.user.email,
        section_key: sectionKey,
        feedback_type: feedbackType,
        content,
        status: "new"
      };

      setStatus(reviewStatus, "Saving your feedback...");
      const { error } = await client.from("mentor_comments").insert(payload);
      if (error) throw error;
      document.getElementById("reviewContent").value = "";
      setStatus(reviewStatus, "Thank you. Your feedback has been saved.");
      await load();
    } catch (error) { setStatus(reviewStatus, error.message || "Unable to save your feedback."); }
  });

  list?.addEventListener("click", async e => {
    const editBtn = e.target.closest(".edit-note");
    const cancelBtn = e.target.closest(".cancel-edit");
    const saveBtn = e.target.closest(".save-edit");
    const deleteBtn = e.target.closest(".delete-note");

    if (editBtn) {
      const area = list.querySelector(`[data-edit-area="${CSS.escape(editBtn.dataset.id)}"]`);
      area?.classList.remove("review-hidden");
      return;
    }

    if (cancelBtn) {
      const area = list.querySelector(`[data-edit-area="${CSS.escape(cancelBtn.dataset.id)}"]`);
      area?.classList.add("review-hidden");
      return;
    }

    if (saveBtn) {
      const id = saveBtn.dataset.id;
      const typeEl = list.querySelector(`[data-edit-type="${CSS.escape(id)}"]`);
      const contentEl = list.querySelector(`[data-edit-content="${CSS.escape(id)}"]`);
      const content = contentEl?.value.trim() || "";
      if (!content) { setStatus(reviewStatus, "Write a note before saving."); return; }

      setStatus(reviewStatus, "Saving changes...");
      const { error } = await client.from("mentor_comments").update({
        feedback_type: normalizeType(typeEl?.value),
        content,
        updated_at: new Date().toISOString()
      }).eq("id", id);
      if (error) { setStatus(reviewStatus, error.message); return; }
      setStatus(reviewStatus, "Your note has been updated.");
      await load();
      return;
    }

    if (deleteBtn) {
      const id = deleteBtn.dataset.id;
      if (!window.confirm("Delete this feedback permanently?")) return;
      setStatus(reviewStatus, "Deleting feedback...");
      const { error } = await client.from("mentor_comments").delete().eq("id", id);
      if (error) { setStatus(reviewStatus, error.message); return; }
      setStatus(reviewStatus, "Feedback deleted.");
      await load();
    }
  });

  let lastLoadedUserId = null;
  let loading = false;

  async function refreshFromSession(session) {
    if (loading) return;
    loading = true;
    try {
      if (!session) {
        lastLoadedUserId = null;
        hide(workspace);
        show(authPanel);
        setStatus(reviewStatus, "");
        return;
      }

      // Avoid duplicate reloads caused by INITIAL_SESSION + SIGNED_IN firing together.
      const userId = session.user?.id || null;
      if (userId && userId === lastLoadedUserId) return;
      lastLoadedUserId = userId;
      await load();
    } finally {
      loading = false;
    }
  }

  client.auth.onAuthStateChange((event, session) => {
    console.log("Mentor Desk auth event:", event);
    window.setTimeout(() => refreshFromSession(session), 0);
  });

  // Let Supabase consume a magic-link token from the URL before checking the session.
  window.setTimeout(async () => {
    try {
      const session = await getSession();
      await refreshFromSession(session);
    } catch (error) {
      console.error("Mentor Desk initialization error:", error);
      setStatus(authStatus, error.message || "Unable to initialize secure access.");
      hide(workspace);
      show(authPanel);
    }
  }, 300);
})();
