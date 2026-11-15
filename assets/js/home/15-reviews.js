// ============================================================
// Home page - 15-reviews.js
// Public ratings, comments, replies and moderation.
// Split from the original script.js during the 2026-11 refactor.
// Loaded in numeric order by the page HTML. Keep that order.
// ============================================================

// ===== Ratings & Comments =====
const REVIEWS_KEY = "siteReviews";
const reviewForm = document.getElementById("reviewForm");
const reviewList = document.getElementById("reviewList");
const starPicker = document.getElementById("starPicker");
const starValue = document.getElementById("starValue");
const reviewsAvgEl = document.getElementById("reviewsAvg");
const reviewsAvgStars = document.getElementById("reviewsAvgStars");
const reviewsCountEl = document.getElementById("reviewsCount");
const reviewsBars = document.getElementById("reviewsBars");
const revNameInput = document.getElementById("revName");
const revTextInput = document.getElementById("revText");
const revNameErr = document.getElementById("revNameErr");
const revRatingErr = document.getElementById("revRatingErr");

let pickedRating = 0;
let reviewCache = [];

const getReviews = () => reviewCache;

const loadReviews = async () => {
  if (!reviewList) return;
  if (!sb) {
    reviewCache = [];
    renderReviews();
    if (reviewsCountEl) reviewsCountEl.textContent = "Reviews require an internet connection.";
    return;
  }
  const { data, error } = await sb.from("site_reviews")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) {
    console.warn("Could not load public reviews:", error.message);
    reviewCache = [];
    renderReviews();
    if (reviewsCountEl) reviewsCountEl.textContent = "Reviews are temporarily unavailable.";
    return;
  }
  reviewCache = (data || []).map((review) => ({
    id: review.id,
    author_id: review.author_id,
    name: review.author_name,
    rating: review.rating,
    text: review.comment,
    at: review.created_at,
    reply: review.owner_reply || "",
    replyAt: review.owner_reply_at || null
  }));
  renderReviews();
};

const migrateLegacyReviews = async () => {
  if (!sb || !cloudUser || !ceoLoggedIn) return;
  let legacy;
  try {
    legacy = JSON.parse(localStorage.getItem(REVIEWS_KEY) || "[]");
  } catch (error) {
    console.warn("Could not read legacy local reviews:", error);
    return;
  }
  if (!Array.isArray(legacy) || !legacy.length) return;
  const rows = legacy.flatMap((review, index) => {
    const rating = Number(review.rating);
    const name = String(review.name || "").trim().slice(0, 60);
    if (!name || !Number.isInteger(rating) || rating < 1 || rating > 5) return [];
    return [{
      author_id: null,
      author_name: name,
      rating,
      comment: String(review.text || "").slice(0, 500),
      legacy_id: String(review.id || `${review.at || "legacy"}-${index}`).slice(0, 200),
      created_at: Number.isNaN(Date.parse(review.at)) ? new Date().toISOString() : new Date(review.at).toISOString()
    }];
  });
  if (!rows.length) return;
  const { error } = await sb.from("site_reviews").upsert(rows, { onConflict: "legacy_id", ignoreDuplicates: true });
  if (error) {
    console.warn("Could not migrate legacy reviews:", error.message);
    showToast(`Legacy reviews were not migrated: ${error.message}`, true);
    return;
  }
  try {
    localStorage.removeItem(REVIEWS_KEY);
  } catch (error) {
    console.warn("Legacy reviews were migrated but the local copy could not be removed:", error);
  }
};

const starString = (n) => "★".repeat(n) + "☆".repeat(5 - n);

const paintStars = (value) => {
  if (!starPicker) return;
  starPicker.querySelectorAll(".star").forEach((s) => {
    s.classList.toggle("on", Number(s.dataset.value) <= value);
  });
  if (starValue) {
    starValue.textContent = value ? `${value} of 5` : "Select stars";
    starValue.style.color = value ? "#f59e0b" : "";
  }
};

const renderReviews = () => {
  if (!reviewList) return;
  const list = getReviews();
  const total = list.length;
  const sum = list.reduce((n, r) => n + (Number(r.rating) || 0), 0);
  const avg = total ? sum / total : 0;

  if (reviewsAvgEl) reviewsAvgEl.textContent = avg.toFixed(1);
  if (reviewsAvgStars) reviewsAvgStars.textContent = starString(Math.round(avg));
  if (reviewsCountEl) reviewsCountEl.textContent = total ? `${total} review${total === 1 ? "" : "s"}` : "No reviews yet";

  // Distribution bars (5 → 1)
  if (reviewsBars) {
    reviewsBars.innerHTML = [5, 4, 3, 2, 1].map((n) => {
      const count = list.filter((r) => Number(r.rating) === n).length;
      const pct = total ? Math.round((count / total) * 100) : 0;
      return `<div class="rv-bar-row"><span class="rv-bar-lbl">${n} ★</span>` +
        `<span class="rv-bar-track"><span class="rv-bar-fill" style="width:${pct}%"></span></span>` +
        `<span class="rv-bar-val">${count}</span></div>`;
    }).join("");
  }
  if (revNameInput) {
    revNameInput.readOnly = false;
  }

  if (!total) {
    reviewList.innerHTML = "";
    return;
  }

  const isCEO = !!(ceoMode && ceoUser);

  const sorted = [...list].sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0));
  reviewList.innerHTML = sorted.map((r) => {
    const initial = escHtml(String(r.name || "?").trim().charAt(0).toUpperCase());
    const canDelete = isCEO || (r.author_id && r.author_id === accountAuthUser?.id);
    const reply = String(r.reply || "").trim();
    const replyBlock = reply
      ? `<div class="review-reply">` +
          `<div class="review-reply-head">` +
            `<span class="review-reply-badge">Owner reply</span>` +
            (r.replyAt ? `<span class="review-reply-date">${fmtReviewDate(r.replyAt)}</span>` : "") +
          `</div>` +
          `<p class="review-reply-text">${escHtml(reply)}</p>` +
        `</div>`
      : "";
    const ownerActions = isCEO
      ? `<div class="review-owner-actions">` +
          `<button type="button" class="review-reply-open" data-review-reply="${escHtml(r.id)}">` +
            (reply ? "Edit reply" : "Reply as owner") +
          `</button>` +
          (reply ? `<button type="button" class="review-reply-open is-danger" data-review-reply-remove="${escHtml(r.id)}">Remove reply</button>` : "") +
        `</div>`
      : "";
    return `<div class="review-item" data-review-id="${escHtml(r.id)}">` +
      `<div class="review-item-head">` +
      `<span class="review-avatar">${initial}</span>` +
      `<span class="review-name">${escHtml(r.name)}</span>` +
      `<span class="review-stars" title="${Number(r.rating) || 0} of 5">${starString(Number(r.rating) || 0)}</span>` +
      `<span class="review-date">${fmtReviewDate(r.at)}</span>` +
      `</div>` +
      (r.text ? `<p class="review-comment">${escHtml(r.text)}</p>` : "") +
      replyBlock +
      ownerActions +
      (canDelete ? `<button type="button" class="review-del" data-review-del="${escHtml(r.id)}" title="Delete review" aria-label="Delete review">&times;</button>` : "") +
      `</div>`;
  }).join("");
};

const fmtReviewDate = (v) => {
  const d = v ? new Date(v) : null;
  if (!d || isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
};

if (starPicker) {
  starPicker.addEventListener("click", (e) => {
    const btn = e.target.closest(".star");
    if (!btn) return;
    pickedRating = Number(btn.dataset.value) || 0;
    paintStars(pickedRating);
    if (revRatingErr) revRatingErr.textContent = "";
  });
  starPicker.addEventListener("mouseover", (e) => {
    const btn = e.target.closest(".star");
    if (btn) paintStars(Number(btn.dataset.value) || 0);
  });
  starPicker.addEventListener("mouseleave", () => paintStars(pickedRating));
}

if (revNameInput) {
  revNameInput.addEventListener("input", () => {
    if (revNameErr) revNameErr.textContent = "";
    revNameInput.classList.remove("invalid");
  });
}

const populateReviewUser = () => {
  if (!revNameInput) return;
  const trial = typeof getBmsTrial === "function" ? getBmsTrial() : null;
  const trialAcc = typeof getOmsTrialAccount === "function" ? getOmsTrialAccount() : null;
  const name = (currentUser && currentUser.name) ||
               (owner && owner.name) ||
               (trial && trial.name) ||
               (trialAcc && trialAcc.name) ||
               (accountAuthUser && accountAuthUser.user_metadata?.name) || "";
  if (name && !revNameInput.value) {
    revNameInput.value = name;
  }
};
populateReviewUser();

if (reviewForm) {
  reviewForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Any signed up user (Customer, Owner, Trial, or Auth account) can rate & comment
    // No subscription plan purchase required!
    const trial = typeof getBmsTrial === "function" ? getBmsTrial() : null;
    const trialAcc = typeof getOmsTrialAccount === "function" ? getOmsTrialAccount() : null;
    const signedIn = !!(currentUser || owner || accountAuthUser || trial || trialAcc);

    if (!signedIn) {
      showToast("Please sign up or login first to post a review.", true);
      if (typeof openUserModal === "function") openUserModal("signup");
      return;
    }

    let name = String(revNameInput.value || "").trim();
    if (!name) {
      name = (currentUser && currentUser.name) ||
             (owner && owner.name) ||
             (trial && trial.name) ||
             (trialAcc && trialAcc.name) ||
             (accountAuthUser && accountAuthUser.user_metadata?.name) || "";
      if (name && revNameInput) revNameInput.value = name;
    }

    const text = String(revTextInput.value || "").trim();
    let ok = true;

    if (name.length < 2) {
      if (revNameErr) revNameErr.textContent = "Please enter your name (min 2 letters).";
      revNameInput.classList.add("invalid");
      ok = false;
    } else {
      if (revNameErr) revNameErr.textContent = "";
      revNameInput.classList.remove("invalid");
    }

    if (!pickedRating) {
      if (revRatingErr) revRatingErr.textContent = "Please tap a star to rate.";
      ok = false;
    } else if (revRatingErr) revRatingErr.textContent = "";

    if (!ok) {
      showToast("Please add your name and rating.", true);
      return;
    }

    const submit = reviewForm.querySelector('button[type="submit"]');
    if (submit) submit.disabled = true;

    try {
      let authorId = accountAuthUser ? accountAuthUser.id : (currentUser?.id || owner?.id || null);
      if (!authorId && sb && sb.auth) {
        try {
          const sess = await sb.auth.getSession();
          if (sess?.data?.session?.user) {
            authorId = sess.data.session.user.id;
          }
        } catch (_) {}
      }

      if (sb) {
        const { error } = await sb.from("site_reviews").insert({
          author_id: authorId,
          author_name: name,
          rating: pickedRating,
          comment: text
        });
        if (error) throw error;
      } else {
        const localReviews = JSON.parse(localStorage.getItem(REVIEWS_KEY) || "[]");
        localReviews.unshift({
          id: "local_" + Date.now(),
          author_id: authorId,
          name: name,
          rating: pickedRating,
          text: text,
          at: new Date().toISOString()
        });
        localStorage.setItem(REVIEWS_KEY, JSON.stringify(localReviews.slice(0, 100)));
      }

      reviewForm.reset();
      pickedRating = 0;
      paintStars(0);
      populateReviewUser();
      await loadReviews();
      showToast("Thanks! Your review has been posted! \u2B50");
    } catch (error) {
      console.warn("Review submission note:", error);
      try {
        const localReviews = JSON.parse(localStorage.getItem(REVIEWS_KEY) || "[]");
        localReviews.unshift({
          id: "local_" + Date.now(),
          author_id: accountAuthUser?.id || null,
          name: name,
          rating: pickedRating,
          text: text,
          at: new Date().toISOString()
        });
        localStorage.setItem(REVIEWS_KEY, JSON.stringify(localReviews.slice(0, 100)));
        reviewForm.reset();
        pickedRating = 0;
        paintStars(0);
        populateReviewUser();
        reviewCache.unshift({
          id: "local_" + Date.now(),
          author_id: accountAuthUser?.id || null,
          name: name,
          rating: pickedRating,
          text: text,
          at: new Date().toISOString(),
          reply: "",
          replyAt: null
        });
        renderReviews();
        showToast("Thanks! Your review has been posted! \u2B50");
      } catch (fallbackErr) {
        showToast(`Review could not be posted: ${error.message || "Cloud service error."}`, true);
      }
    } finally {
      if (submit) submit.disabled = false;
    }
  });

  reviewForm.addEventListener("input", (e) => {
    if (e.target === revNameInput) {
      revNameInput.classList.remove("invalid");
      if (revNameErr) revNameErr.textContent = "";
    }
  });
}

const findReviewItem = (id) =>
  Array.prototype.find.call(
    reviewList ? reviewList.querySelectorAll(".review-item") : [],
    (el) => el.dataset.reviewId === id
  );

const openOwnerReplyEditor = (id) => {
  const item = findReviewItem(id);
  if (!item) return;
  Array.prototype.forEach.call(
    reviewList.querySelectorAll(".review-reply-form"),
    (form) => { if (form.dataset.reviewReplyForm !== id) form.remove(); }
  );
  const existing = item.querySelector(".review-reply-form");
  if (existing) {
    const area = existing.querySelector("textarea");
    if (area) area.focus();
    return;
  }
  const review = getReviews().find((r) => r.id === id);
  const form = document.createElement("form");
  form.className = "review-reply-form";
  form.dataset.reviewReplyForm = id;
  form.innerHTML =
    `<label class="review-reply-label">Owner reply</label>` +
    `<textarea rows="3" maxlength="500" aria-label="Owner reply" placeholder="Write a reply as the site owner…"></textarea>` +
    `<div class="review-reply-actions">` +
      `<button type="button" class="review-reply-cancel" data-review-reply-cancel="1">Cancel</button>` +
      `<button type="submit" class="review-reply-save">Save reply</button>` +
    `</div>`;
  form.querySelector("textarea").value = (review && review.reply) || "";
  item.appendChild(form);
  form.querySelector("textarea").focus();
};

if (reviewList) {
  reviewList.addEventListener("click", async (e) => {
    const cancel = e.target.closest("[data-review-reply-cancel]");
    if (cancel) {
      const form = cancel.closest(".review-reply-form");
      if (form) form.remove();
      return;
    }

    const openReply = e.target.closest("[data-review-reply]");
    if (openReply) {
      if (!(ceoMode && ceoUser)) {
        showToast("Only the site owner can reply to reviews.", true);
        return;
      }
      openOwnerReplyEditor(openReply.getAttribute("data-review-reply"));
      return;
    }

    const removeReply = e.target.closest("[data-review-reply-remove]");
    if (removeReply) {
      if (!(ceoMode && ceoUser)) {
        showToast("Only the site owner can remove replies.", true);
        return;
      }
      const replyId = removeReply.getAttribute("data-review-reply-remove");
      if (!confirm("Remove the owner reply from this review?")) return;
      removeReply.disabled = true;
      try {
        const { error } = await sb.from("site_reviews")
          .update({ owner_reply: null, owner_reply_at: null })
          .eq("id", replyId);
        if (error) throw error;
        await loadReviews();
        showToast("Owner reply removed.");
      } catch (error) {
        showToast(`Reply could not be removed: ${error.message || "Cloud service error."}`, true);
        removeReply.disabled = false;
      }
      return;
    }

    const btn = e.target.closest("[data-review-del]");
    if (!btn) return;
    const id = btn.getAttribute("data-review-del");
    const item = getReviews().find((r) => r.id === id);
    if (!item) return;
    const isCEO = !!(ceoMode && ceoUser);
    const isAuthor = item.author_id && item.author_id === accountAuthUser?.id;
    if (!isCEO && !isAuthor) {
      showToast("You can only delete your own review.", true);
      return;
    }
    if (!confirm(`Delete review by "${item.name}"?`)) return;
    btn.disabled = true;
    try {
      const { error } = await sb.from("site_reviews").delete().eq("id", id);
      if (error) throw error;
      await loadReviews();
      showToast("Review deleted.");
    } catch (error) {
      showToast(`Review could not be deleted: ${error.message || "Cloud service error."}`, true);
      btn.disabled = false;
    }
  });

  reviewList.addEventListener("submit", async (e) => {
    const form = e.target.closest("[data-review-reply-form]");
    if (!form) return;
    e.preventDefault();
    if (!(ceoMode && ceoUser)) {
      showToast("Only the site owner can reply to reviews.", true);
      return;
    }
    const replyId = form.dataset.reviewReplyForm;
    const area = form.querySelector("textarea");
    const text = String(area ? area.value : "").trim();
    if (!text) {
      showToast("Write a reply before saving.", true);
      if (area) area.focus();
      return;
    }
    const save = form.querySelector('button[type="submit"]');
    if (save) save.disabled = true;
    try {
      const { error } = await sb.from("site_reviews")
        .update({ owner_reply: text, owner_reply_at: new Date().toISOString() })
        .eq("id", replyId);
      if (error) throw error;
      await loadReviews();
      showToast("Owner reply saved.");
    } catch (error) {
      showToast(`Reply could not be saved: ${error.message || "Cloud service error."}`, true);
      if (save) save.disabled = false;
    }
  });
}

renderReviews();
