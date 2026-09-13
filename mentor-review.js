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

  const codeGate = document.getElementById("codeGate");
  const workspace = document.getElementById("workspace");
  const gateStatus = document.getElementById("gateStatus");
  const reviewStatus = document.getElementById("reviewStatus");
  const form = document.getElementById("reviewForm");
  const list = document.getElementById("reviewList");
  const filters = document.getElementById("noteFilters");
  const STORAGE_KEY = "mentorDeskAccessCode";
  const types = ["thought", "suggestion", "question"];
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

  let rows = [];
  let currentFilter = "all";

  function setStatus(el, msg) { if (el) el.textContent = msg || ""; }
  function show(el) { el?.classList.remove("review-hidden"); }
  function hide(el) { el?.classList.add("review-hidden"); }
  function esc(v) {
    return String(v ?? "").replace(/[&<>"']/g, c => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    }[c]));
  }
  function fmt(v) {
    try { return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(v)); }
    catch { return String(v || ""); }
  }
  function normalizeType(v) {
    const t = String(v || "thought").trim().toLowerCase();
    return types.includes(t) ? t : "thought";
  }
  function titleCase(v) { const t = normalizeType(v); return t.charAt(0).toUpperCase() + t.slice(1); }

  if (!ready) {
    setStatus(gateStatus, "Review access is not configured yet. Add your Supabase values to review-config.js.");
    return;
  }

  const client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);

  function isRlsError(error) {
    const msg = String(error?.message || "").toLowerCase();
    return error?.code === "42501" || msg.includes("row-level security") || msg.includes("row level security");
  }

  function lockedOut() {
    window.localStorage.removeItem(STORAGE_KEY);
    hide(workspace);
    show(codeGate);
  }

  function render() {
    if (!list) return;
    const filtered = currentFilter === "all" ? rows : rows.filter(r => normalizeType(r.feedback_type) === currentFilter);
    const countEl = document.querySelector(".review-notes-count");
    if (countEl) countEl.textContent = rows.length === 1 ? "1 note" : `${rows.length} notes`;

    if (!filtered.length) {
      list.innerHTML = '<div class="review-empty">Your notes will appear here once you send one.</div>';
      return;
    }

    list.innerHTML = filtered.map(r => {
      const canManage = (r.status || "new") === "new";
      return `
      <article class="review-comment" data-id="${esc(r.id)}">
        <div class="meta">
          <span class="note-badge">${esc(titleCase(r.feedback_type))}</span>
          <span class="note-date">${esc(fmt(r.created_at))}</span>
        </div>
        <span class="note-section">${esc(labels[r.section_key] || r.section_key || "Portfolio")}</span>
        <p class="comment-content">${esc(r.content)}</p>
        <span class="status">${esc(r.status || "new")}</span>
        ${r.reply ? `<div class="reply"><div class="reply-label">Marie's reply</div><p>${esc(r.reply)}</p></div>` : ""}
        ${canManage ? `
        <div class="comment-actions">
          <button type="button" class="edit-note" data-id="${esc(r.id)}">Edit</button>
          <button type="button" class="delete-note" data-id="${esc(r.id)}">Delete</button>
        </div>
        <div class="edit-area review-hidden" data-edit-area="${esc(r.id)}">
          <select data-edit-type="${esc(r.id)}">
            ${types.map(t => `<option value="${t}" ${normalizeType(r.feedback_type) === t ? "selected" : ""}>${t.charAt(0).toUpperCase() + t.slice(1)}</option>`).join("")}
          </select>
          <textarea data-edit-content="${esc(r.id)}">${esc(r.content)}</textarea>
          <div class="edit-actions">
            <button type="button" class="btn btn-dark save-edit" data-id="${esc(r.id)}">Save changes</button>
            <button type="button" class="text-link cancel-edit" data-id="${esc(r.id)}">Cancel</button>
          </div>
        </div>` : ""}
      </article>`;
    }).join("");
  }

  async function load() {
    try {
      const { data, error } = await client.from("mentor_comments").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      rows = data || [];
      render();
    } catch (error) {
      console.error(error);
      setStatus(reviewStatus, error.message || "Unable to load your notes.");
    }
  }

  function openWorkspace() {
    hide(codeGate);
    show(workspace);
    load();
  }

  // Skip the access word step if it is already remembered on this device.
  const savedCode = window.localStorage.getItem(STORAGE_KEY);
  if (savedCode) openWorkspace();

  document.getElementById("unlockForm")?.addEventListener("click", () => {
    const code = document.getElementById("accessCode")?.value.trim();
    if (!code) { setStatus(gateStatus, "Enter the access word Marie gave you."); return; }
    window.localStorage.setItem(STORAGE_KEY, code);
    openWorkspace();
  });

  filters?.addEventListener("click", e => {
    const btn = e.target.closest(".filter-chip");
    if (!btn) return;
    filters.querySelectorAll(".filter-chip").forEach(x => x.classList.remove("active"));
    btn.classList.add("active");
    currentFilter = btn.dataset.filter;
    render();
  });

  form?.addEventListener("submit", async e => {
    e.preventDefault();
    const authorName = document.getElementById("authorName")?.value.trim() || "";
    const content = document.getElementById("reviewContent")?.value.trim() || "";
    if (!authorName) { setStatus(reviewStatus, "Enter your name."); return; }
    if (!content) { setStatus(reviewStatus, "Write a note before sending."); return; }
    const feedbackType = normalizeType(document.querySelector('input[name="type"]:checked')?.value);
    const sectionKey = document.getElementById("reviewSection")?.value || "overall";
    const accessCode = window.localStorage.getItem(STORAGE_KEY) || "";

    setStatus(reviewStatus, "Sending your feedback...");
    const { error } = await client.from("mentor_comments").insert({
      author_name: authorName,
      section_key: sectionKey,
      feedback_type: feedbackType,
      content,
      status: "new",
      access_code: accessCode
    });

    if (error) {
      if (isRlsError(error)) {
        setStatus(reviewStatus, "That access word was not recognized. Check it with Marie and try again.");
        lockedOut();
        return;
      }
      setStatus(reviewStatus, error.message || "Unable to send your feedback.");
      return;
    }

    document.getElementById("reviewContent").value = "";
    document.getElementById("reviewSection").value = "overall";
    document.getElementById("thought").checked = true;
    setStatus(reviewStatus, "Thank you. Your feedback has been sent to Marie.");
    await load();
  });

  list?.addEventListener("click", async e => {
    const editBtn = e.target.closest(".edit-note");
    const cancelBtn = e.target.closest(".cancel-edit");
    const saveBtn = e.target.closest(".save-edit");
    const deleteBtn = e.target.closest(".delete-note");

    if (editBtn) {
      list.querySelector(`[data-edit-area="${CSS.escape(editBtn.dataset.id)}"]`)?.classList.remove("review-hidden");
      return;
    }
    if (cancelBtn) {
      list.querySelector(`[data-edit-area="${CSS.escape(cancelBtn.dataset.id)}"]`)?.classList.add("review-hidden");
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

      if (error) {
        if (isRlsError(error)) { setStatus(reviewStatus, "This note can no longer be edited, Marie may have already replied to it."); await load(); return; }
        setStatus(reviewStatus, error.message);
        return;
      }
      setStatus(reviewStatus, "Your note has been updated.");
      await load();
      return;
    }
    if (deleteBtn) {
      const id = deleteBtn.dataset.id;
      if (!window.confirm("Delete this feedback permanently?")) return;
      setStatus(reviewStatus, "Deleting feedback...");
      const { error } = await client.from("mentor_comments").delete().eq("id", id);
      if (error) {
        if (isRlsError(error)) { setStatus(reviewStatus, "This note can no longer be deleted, Marie may have already replied to it."); await load(); return; }
        setStatus(reviewStatus, error.message);
        return;
      }
      setStatus(reviewStatus, "Feedback deleted.");
      await load();
    }
  });
})();
