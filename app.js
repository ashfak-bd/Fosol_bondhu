/* =========================================================================
   ফসল বন্ধু — অ্যাপ লজিক
   ========================================================================= */

let INDEXED = [];
let dataSourceInfo = { source: "loading", count: 0 };

const els = {
  input: document.getElementById("searchInput"),
  mic: document.getElementById("micBtn"),
  capsule: document.getElementById("searchCapsule"),
  listeningHint: document.getElementById("listeningHint"),
  chips: document.querySelectorAll(".chip"),
  examples: document.querySelectorAll(".example-chip"),
  results: document.getElementById("results"),
  resultsMeta: document.getElementById("resultsMeta"),
  suggestBox: document.getElementById("suggestBox"),
  toast: document.getElementById("toast"),
  dataBadge: document.getElementById("dataBadge"),
  installBtn: document.getElementById("installBtn"),
};

let activeCategory = "all";

const CATEGORY_ICON = {
  insecticide: "🐛", fungicide: "🍄", herbicide: "🌾", acaricide: "🕷️",
};
const CATEGORY_CLASS = (catEn) => {
  const c = (catEn || "").toLowerCase();
  if (c.includes("insecticide")) return "insecticide";
  if (c.includes("fungicide")) return "fungicide";
  if (c.includes("herbicide")) return "herbicide";
  if (c.includes("acaricide")) return "acaricide";
  return "insecticide";
};

// ---------- রেন্ডার ----------
function renderEmpty() {
  els.suggestBox.innerHTML = "";
  els.resultsMeta.textContent = "";
  els.results.innerHTML = `
    <div class="empty-state">
      <div class="empty-emoji">🌱</div>
      <div class="empty-title">রোগ বা ওষুধের নাম লিখুন অথবা বলুন</div>
      <div class="empty-text">বাংলা, ইংরেজি অথবা ফোনেটিক — যেভাবে ইচ্ছা লিখুন বা মাইক্রোফোনে বলুন।<br>বানান একটু ভুল হলেও সমস্যা নেই, আমরা বুঝে নেব।</div>
    </div>`;
}

function renderNoResult(query) {
  els.suggestBox.innerHTML = "";
  els.resultsMeta.textContent = "";
  els.results.innerHTML = `
    <div class="no-result">
      <div class="empty-emoji">🔍</div>
      <div class="empty-title" style="font-size:15px;">"${escapeHtml(query)}" এর সাথে কিছু মেলেনি</div>
      <div class="empty-text">অন্য বানানে লিখে দেখুন, অথবা রোগের নাম/ওষুধের সক্রিয় উপাদান দিয়ে খুঁজুন।</div>
    </div>`;
}

function renderSuggestions(suggestions, query) {
  if (!suggestions.length) { els.suggestBox.innerHTML = ""; return; }
  els.suggestBox.innerHTML = `
    <div class="suggest-box">
      <div class="suggest-title">🤔 আপনি কি এটি খুঁজছেন?</div>
      <div class="suggest-chips">
        ${suggestions.map(s => `<button class="suggest-chip" data-term="${escapeHtml(s.label)}">${escapeHtml(s.label)}</button>`).join("")}
      </div>
    </div>`;
  els.suggestBox.querySelectorAll(".suggest-chip").forEach(btn => {
    btn.addEventListener("click", () => {
      els.input.value = btn.dataset.term;
      runSearch(btn.dataset.term);
    });
  });
  els.results.innerHTML = "";
  els.resultsMeta.textContent = "";
}

function renderResults(results, fallback) {
  els.suggestBox.innerHTML = "";
  els.resultsMeta.textContent = fallback
    ? "সরাসরি মিল পাওয়া যায়নি — কাছাকাছি কয়েকটি দেখানো হলো"
    : `${results.length}টি ওষুধ পাওয়া গেছে`;
  els.results.innerHTML = results.map(({ rec, score }) => {
    const cls = CATEGORY_CLASS(rec.categoryEn);
    const icon = CATEGORY_ICON[cls] || "🧪";
    return `
      <div class="card">
        <div class="card-bar ${cls}"></div>
        <div class="card-body">
          <div class="card-top">
            <div>
              <div class="card-label">ওষুধের নাম</div>
              <div class="card-brand">${icon} ${escapeHtml(rec.brand)}</div>
              <div class="card-company">${escapeHtml(rec.company)}</div>
            </div>
            <div class="match-badge">${score}% মিল</div>
          </div>
          <div class="card-tags">
            <span class="tag active-ing">${escapeHtml(rec.activeIngredient)}</span>
            <span class="tag">${escapeHtml(rec.categoryBn)}</span>
            <span class="tag">${escapeHtml(rec.formulation)}</span>
          </div>
          <div class="card-use-wrap">
            <div class="card-label">🎯 এই ওষুধ যা করে</div>
            <div class="card-use">${escapeHtml(rec.useCase)}</div>
          </div>
        </div>
      </div>`;
  }).join("");
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (m) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[m]));
}

// ---------- সার্চ চালানো ----------
function runSearch(rawQuery) {
  const query = rawQuery.trim();
  if (!query) { renderEmpty(); return; }
  if (!INDEXED.length) { els.results.innerHTML = `<div class="no-result">ডেটা লোড হচ্ছে, একটু অপেক্ষা করুন...</div>`; return; }

  const { results, suggestions, bestScore, fallback } = search(INDEXED, query, activeCategory);

  if (results.length) {
    renderResults(results, fallback);
  } else if (suggestions.length) {
    renderSuggestions(suggestions, query);
  } else {
    renderNoResult(query);
  }
}

// ---------- ইনপুট ইভেন্ট ----------
let debounceTimer;
els.input.addEventListener("input", () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => runSearch(els.input.value), 180);
});

// ---------- ক্যাটাগরি চিপ ----------
els.chips.forEach(chip => {
  chip.addEventListener("click", () => {
    els.chips.forEach(c => c.classList.remove("active"));
    chip.classList.add("active");
    activeCategory = chip.dataset.cat;
    if (els.input.value.trim()) runSearch(els.input.value);
  });
});

// ---------- উদাহরণ চিপ ----------
els.examples.forEach(ex => {
  ex.addEventListener("click", () => {
    els.input.value = ex.dataset.term;
    runSearch(ex.dataset.term);
  });
});

// ---------- ভয়েস সার্চ (Web Speech API) ----------
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let isListening = false;

if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.lang = "bn-BD";
  recognition.interimResults = true;
  recognition.continuous = false;
  recognition.maxAlternatives = 3;

  recognition.onstart = () => {
    isListening = true;
    els.mic.classList.add("on");
    els.capsule.classList.add("listening");
    els.listeningHint.classList.add("show");
  };

  recognition.onresult = (event) => {
    let transcript = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript;
    }
    els.input.value = transcript;
    if (event.results[event.results.length - 1].isFinal) {
      runSearch(transcript);
    }
  };

  recognition.onerror = (e) => {
    showToast(
      e.error === "not-allowed"
        ? "মাইক্রোফোন অনুমতি দিন"
        : "ভয়েস শনাক্ত করা যায়নি, আবার চেষ্টা করুন"
    );
    stopListening();
  };

  recognition.onend = () => stopListening();
} else {
  els.mic.style.display = "none";
}

function stopListening() {
  isListening = false;
  els.mic.classList.remove("on");
  els.capsule.classList.remove("listening");
  els.listeningHint.classList.remove("show");
}

els.mic.addEventListener("click", () => {
  if (!recognition) return;
  if (isListening) {
    recognition.stop();
  } else {
    els.input.value = "";
    try { recognition.start(); } catch (e) { /* already started guard */ }
  }
});

// ---------- বটম ন্যাভ (হোম বাদে বাকিগুলো "শীঘ্রই আসছে") ----------
document.querySelectorAll(".nav-item").forEach(item => {
  item.addEventListener("click", () => {
    if (item.dataset.nav === "home") return;
    showToast("এই ফিচারটি শীঘ্রই আসছে 🚀");
  });
});

// ---------- টোস্ট ----------
let toastTimer;
function showToast(msg) {
  els.toast.textContent = msg;
  els.toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.remove("show"), 2200);
}

// ---------- প্রাথমিক অবস্থা / ডেটা লোড ----------
async function init() {
  els.results.innerHTML = `<div class="no-result">🌾 ডেটা লোড হচ্ছে...</div>`;
  const { data, source, count } = await loadPesticideData();
  INDEXED = buildIndex(data);
  dataSourceInfo = { source, count };

  if (els.dataBadge) {
    els.dataBadge.textContent = source === "live"
      ? `🟢 লাইভ শীট থেকে ${count}টি ওষুধ`
      : `🟡 অফলাইন ডেটা ব্যবহার হচ্ছে (${count}টি নমুনা)`;
    els.dataBadge.classList.toggle("offline", source !== "live");
  }

  renderEmpty();
}

// ---------- PWA ইনস্টল প্রম্পট ----------
let deferredInstallPrompt = null;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  if (els.installBtn) els.installBtn.classList.add("show");
});

if (els.installBtn) {
  els.installBtn.addEventListener("click", async () => {
    if (!deferredInstallPrompt) {
      showToast("এই ব্রাউজারে সরাসরি ইনস্টল সাপোর্ট নেই — মেনু থেকে 'Add to Home screen' বেছে নিন");
      return;
    }
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    els.installBtn.classList.remove("show");
  });
}

window.addEventListener("appinstalled", () => {
  showToast("✅ ফসল বন্ধু ইনস্টল হয়েছে!");
  if (els.installBtn) els.installBtn.classList.remove("show");
});

// ---------- সার্ভিস ওয়ার্কার রেজিস্ট্রেশন (অফলাইন সাপোর্ট) ----------
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch((err) => {
      console.warn("সার্ভিস ওয়ার্কার রেজিস্টার করা যায়নি:", err.message);
    });
  });
}

init();
