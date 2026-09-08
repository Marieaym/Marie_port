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

  const allowedFeedbackTypes = [
    "thought",
    "suggestion",
    "question"
  ];

  function esc(value) {
    return String(value ?? "").replace(
      /[&<>"']/g,
      function (char) {
        return {
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#039;"
        }[char];
      }
    );
  }

  function setStatus(element, message) {
    if (element) {
      element.textContent = message || "";
    }
  }

  function fmt(value) {
    try {
      return new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short"
      }).format(new Date(value));
    } catch {
      return String(value || "");
    }
  }

  function show(element) {
    if (element) {
      element.classList.remove("review-hidden");
    }
  }

  function hide(element) {
    if (element) {
      element.classList.add("review-hidden");
    }
  }

  function normalizeFeedbackType(value) {
    const normalized = String(value || "")
      .trim()
      .toLowerCase();

    return allowedFeedbackTypes.includes(normalized)
      ? normalized
      : "thought";
  }

  function prettyFeedbackType(value) {
    const normalized = normalizeFeedbackType(value);

    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }

  function prettyStatus(value) {
    const normalized = String(value || "new")
      .trim()
      .toLowerCase();

    return normalized
      .split("_")
      .map(function (word) {
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(" ");
  }

  if (!ready) {
    setStatus(
      authStatus,
      "Review access is not configured yet. Add your Supabase values to review-config.js."
    );
    return;
  }

  const client = window.supabase.createClient(
    cfg.supabaseUrl,
    cfg.supabaseAnonKey
  );

  function render(rows) {
    if (!list) {
      return;
    }

    if (!rows || rows.length === 0) {
      list.innerHTML =
        '<div class="review-empty">No notes yet. Your feedback history will appear here.</div>';
      return;
    }

    list.innerHTML = rows
      .map(function (row) {
        const sectionName =
          labels[row.section_key] || row.section_key || "Portfolio";

        const typeName = prettyFeedbackType(row.feedback_type);

        const statusName = prettyStatus(row.status);

        return `
          <article class="review-comment">
            <div class="meta">
              <span>${esc(sectionName)}</span>
              <span>${esc(fmt(row.created_at))}</span>
            </div>

            <h4>${esc(row.author_name || "Reviewer")}</h4>

            <p>
              <strong>${esc(typeName)}</strong>
              <br>
              ${esc(row.content)}
            </p>

            <span class="status">
              ${esc(statusName)}
            </span>

            ${
              row.reply
                ? `
                  <div class="reply">
                    <div class="reply-label">Marie's reply</div>
                    <p>${esc(row.reply)}</p>
                    ${
                      row.replied_at
                        ? `
                          <small>${esc(fmt(row.replied_at))}</small>
                        `
                        : ""
                    }
                  </div>
                `
                : ""
            }
          </article>
        `;
      })
      .join("");
  }

  async function load() {
    try {
      const {
        data: { session },
        error: sessionError
      } = await client.auth.getSession();

      if (sessionError) {
        setStatus(reviewStatus, sessionError.message);
        return;
      }

      if (!session) {
        hide(workspace);
        show(authPanel);
        setStatus(reviewStatus, "");
        return;
      }

      hide(authPanel);
      show(workspace);

      const sessionEmail = (
        session.user.email || ""
      ).toLowerCase();

      const sessionEmailElement =
        document.getElementById("sessionEmail");

      if (sessionEmailElement) {
        sessionEmailElement.textContent =
          session.user.email || "";
      }

      const ownerEmail = String(
        cfg.ownerEmail || ""
      ).toLowerCase();

      const isOwner =
        Boolean(ownerEmail) &&
        sessionEmail === ownerEmail;

      document.body.dataset.owner = isOwner
        ? "true"
        : "false";

      let query = client
        .from("mentor_comments")
        .select("*")
        .order("created_at", {
          ascending: false
        });

      if (!isOwner) {
        query = query.eq(
          "author_email",
          session.user.email
        );
      }

      const { data, error } = await query;

      if (error) {
        setStatus(reviewStatus, error.message);
        return;
      }

      render(data || []);
    } catch (error) {
      console.error("Mentor Desk load error:", error);
      setStatus(
        reviewStatus,
        error?.message ||
          "Something went wrong while loading the review space."
      );
    }
  }

  document
    .getElementById("sendLink")
    ?.addEventListener("click", async function () {
      const emailInput =
        document.getElementById("authEmail");

      const email = emailInput
        ? emailInput.value.trim()
        : "";

      if (!email) {
        setStatus(
          authStatus,
          "Please enter your email address."
        );
        return;
      }

      setStatus(
        authStatus,
        "Sending your secure link..."
      );

      try {
        const { error } =
          await client.auth.signInWithOtp({
            email,
            options: {
              emailRedirectTo: window.location.href
            }
          });

        if (error) {
          setStatus(authStatus, error.message);
          return;
        }

        setStatus(
          authStatus,
          "Check your inbox for your secure sign-in link."
        );
      } catch (error) {
        console.error("Magic link error:", error);

        setStatus(
          authStatus,
          error?.message ||
            "Unable to send the sign-in link."
        );
      }
    });

  document
    .getElementById("signOut")
    ?.addEventListener("click", async function () {
      try {
        await client.auth.signOut();
        await load();
      } catch (error) {
        console.error("Sign out error:", error);
        setStatus(
          reviewStatus,
          error?.message ||
            "Unable to sign out."
        );
      }
    });

  form?.addEventListener("submit", async function (event) {
    event.preventDefault();

    try {
      const {
        data: { session },
        error: sessionError
      } = await client.auth.getSession();

      if (sessionError) {
        setStatus(
          reviewStatus,
          sessionError.message
        );
        return;
      }

      if (!session) {
        setStatus(
          reviewStatus,
          "Please sign in first."
        );
        return;
      }

      const contentElement =
        document.getElementById("reviewContent");

      const sectionElement =
        document.getElementById("reviewSection");

      const selectedTypeElement =
        document.querySelector(
          'input[name="type"]:checked'
        );

      const content = contentElement
        ? contentElement.value.trim()
        : "";

      if (!content) {
        setStatus(
          reviewStatus,
          "Write a note before sending."
        );
        return;
      }

      const sectionKey = sectionElement
        ? sectionElement.value
        : "overall";

      const rawType =
        selectedTypeElement?.value || "thought";

      const feedbackType =
        normalizeFeedbackType(rawType);

      const authorName =
        session.user.user_metadata?.full_name ||
        session.user.email?.split("@")[0] ||
        "Reviewer";

      const authorEmail =
        session.user.email || "";

      const payload = {
        author_name: authorName,
        author_email: authorEmail,
        section_key: sectionKey,
        feedback_type: feedbackType,
        content: content,
        status: "new"
      };

      setStatus(
        reviewStatus,
        "Saving your feedback..."
      );

      const { error } = await client
        .from("mentor_comments")
        .insert(payload);

      if (error) {
        console.error(
          "Supabase insert error:",
          error
        );

        setStatus(
          reviewStatus,
          error.message
        );

        return;
      }

      if (contentElement) {
        contentElement.value = "";
      }

      if (selectedTypeElement) {
        selectedTypeElement.checked = false;
      }

      setStatus(
        reviewStatus,
        "Thank you. Your feedback has been saved."
      );

      await load();
    } catch (error) {
      console.error(
        "Mentor Desk submit error:",
        error
      );

      setStatus(
        reviewStatus,
        error?.message ||
          "Unable to save your feedback."
      );
    }
  });

  client.auth.onAuthStateChange(function () {
    load();
  });

  load();
})();