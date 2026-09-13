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
  const STORAGE_KEY = "mentorDeskAccessCode";
  const types = ["thought", "suggestion", "question"];

  function setStatus(el, msg) { if (el) el.textContent = msg || ""; }
  function show(el) { el?.classList.remove("review-hidden"); }
  function hide(el) { el?.classList.add("review-hidden"); }
  function normalizeType(v) {
    const t = String(v || "thought").trim().toLowerCase();
    return types.includes(t) ? t : "thought";
  }

  if (!ready) {
    setStatus(gateStatus, "Review access is not configured yet. Add your Supabase values to review-config.js.");
    return;
  }

  const client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);

  function openWorkspace() {
    hide(codeGate);
    show(workspace);
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

  form?.addEventListener("submit", async e => {
    e.preventDefault();
    const authorNameEl = document.getElementById("authorName");
    const authorName = authorNameEl?.value.trim() || "";
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
      const msg = String(error.message || "").toLowerCase();
      if (error.code === "42501" || msg.includes("row-level security") || msg.includes("row level security")) {
        setStatus(reviewStatus, "That access word was not recognized. Check it with Marie and try again.");
        window.localStorage.removeItem(STORAGE_KEY);
        hide(workspace);
        show(codeGate);
        return;
      }
      setStatus(reviewStatus, error.message || "Unable to send your feedback.");
      return;
    }

    document.getElementById("reviewContent").value = "";
    document.getElementById("reviewSection").value = "overall";
    document.getElementById("thought").checked = true;
    setStatus(reviewStatus, "Thank you. Your feedback has been sent to Marie.");
  });
})();
