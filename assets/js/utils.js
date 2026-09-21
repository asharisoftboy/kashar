/* KasHar — utilitas bersama: format Rupiah, tanggal, modal, toast, konfirmasi */
window.KH = window.KH || {};

KH.utils = (() => {
  const idr = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  });
  const num = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });
  const fmtIDR = (n) => idr.format(Math.round(Number(n) || 0));
  const fmtNum = (n) => num.format(Math.round(Number(n) || 0));
  const parseAmount = (str) =>
    Number(String(str || "").replace(/[^0-9]/g, "")) || 0;

  const esc = (s) =>
    String(s ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        }[c])
    );

  const uid = () =>
    Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const pad = (n) => String(n).padStart(2, "0");
  const toISO = (d) =>
    d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  const todayISO = () => toISO(new Date());
  const nowTime = () => {
    const d = new Date();
    return pad(d.getHours()) + ":" + pad(d.getMinutes());
  };
  const monthKey = (iso) => String(iso || "").slice(0, 7);
  const monthLabel = (mk) => {
    const [y, m] = mk.split("-").map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString("id-ID", {
      month: "long",
      year: "numeric",
    });
  };
  const fmtDate = (iso) => {
    if (!iso) return "-";
    const d = new Date(iso + "T00:00:00");
    if (isNaN(d)) return "-";
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };
  const fmtDateLong = (iso) => {
    if (!iso) return "-";
    const d = new Date(iso + "T00:00:00");
    if (isNaN(d)) return "-";
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };
  const daysUntil = (iso) => {
    if (!iso) return null;
    const a = new Date(todayISO() + "T00:00:00");
    const b = new Date(iso + "T00:00:00");
    return Math.round((b - a) / 86400000);
  };
  const debounce = (fn, ms) => {
    let t;
    return (...a) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...a), ms);
    };
  };

  /* ---------- Toast ---------- */
  function toast(msg, type) {
    type = type || "success";
    const root = document.getElementById("toast-root");
    const el = document.createElement("div");
    el.className = "toast toast-" + type;
    el.textContent = msg;
    root.appendChild(el);
    requestAnimationFrame(() => el.classList.add("show"));
    setTimeout(() => {
      el.classList.remove("show");
      setTimeout(() => el.remove(), 250);
    }, 2300);
  }

  /* ---------- Modal (bottom sheet di mobile) ---------- */
  function openModal(html, opts) {
    opts = opts || {};
    const root = document.getElementById("modal-root");
    root.innerHTML =
      '<div class="modal-backdrop">' +
      '<div class="modal ' +
      (opts.sheet ? "modal-sheet" : "") +
      '" role="dialog" aria-modal="true">' +
      html +
      "</div>" +
      "</div>";
    document.body.classList.add("modal-open");
    const bd = root.querySelector(".modal-backdrop");
    bd.addEventListener("click", (e) => {
      if (e.target === bd) closeModal();
    });
    requestAnimationFrame(() => bd.classList.add("show"));
    const first = root.querySelector(
      "input, select, textarea, button:not([data-close])"
    );
    if (first && !opts.sheet) setTimeout(() => first.focus(), 220);
  }

  function closeModal() {
    const root = document.getElementById("modal-root");
    const bd = root.querySelector(".modal-backdrop");
    if (!bd) return;
    bd.classList.remove("show");
    document.body.classList.remove("modal-open");
    // Hanya bersihkan jika backdrop ini masih modal aktif.
    // Jika modal baru sudah terbuka (innerHTML tertimpa), backdrop lama sudah terlepas
    // dari DOM sehingga timeout tidak akan menghapus modal baru. (Bug fix: form dari
    // sheet "+" langsung hilang karena timeout closeModal menghapus modal barunya.)
    setTimeout(() => {
      if (
        bd.parentNode === root &&
        root.querySelector(".modal-backdrop") === bd
      ) {
        root.innerHTML = "";
      }
    }, 180);
  }

  function sheetHead(title) {
    return (
      '<div class="sheet-head"><h3>' +
      esc(title) +
      "</h3>" +
      '<button type="button" class="icon-btn" data-close>&times;</button></div>'
    );
  }

  function wireClose(root) {
    (root || document).querySelectorAll("[data-close]").forEach((b) => {
      b.addEventListener("click", (e) => {
        e.preventDefault();
        closeModal();
      });
    });
  }

  /* ---------- Konfirmasi (Promise<boolean>) ---------- */
  function confirmDialog(opts) {
    return new Promise((resolve) => {
      openModal(
        '<div class="confirm-box">' +
          '<div class="confirm-icon ' +
          (opts.danger ? "danger" : "") +
          '">' +
          (opts.danger ? "🗑️" : "❓") +
          "</div>" +
          "<h3>" +
          esc(opts.title || "Konfirmasi") +
          "</h3>" +
          '<p class="muted">' +
          esc(opts.message || "") +
          "</p>" +
          '<div class="row-gap">' +
          '<button class="btn btn-ghost" id="cf-no">' +
          esc(opts.cancelText || "Batal") +
          "</button>" +
          '<button class="btn ' +
          (opts.danger ? "btn-danger" : "btn-primary") +
          '" id="cf-yes">' +
          esc(opts.confirmText || "Ya, lanjutkan") +
          "</button>" +
          "</div>" +
          "</div>"
      );
      document.getElementById("cf-no").onclick = () => {
        closeModal();
        resolve(false);
      };
      document.getElementById("cf-yes").onclick = () => {
        closeModal();
        resolve(true);
      };
    });
  }

  return {
    fmtIDR,
    fmtNum,
    parseAmount,
    esc,
    uid,
    pad,
    toISO,
    todayISO,
    nowTime,
    monthKey,
    monthLabel,
    fmtDate,
    fmtDateLong,
    daysUntil,
    debounce,
    toast,
    openModal,
    closeModal,
    sheetHead,
    wireClose,
    confirmDialog,
  };
})();