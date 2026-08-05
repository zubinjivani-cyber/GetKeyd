// getkeyd-hosted handler for Firebase email action links (verify email, email
// change, password reset). Set the custom action URL in the Firebase console
// to https://getkeyd.app/auth-action.html so the email link points here, not
// to the default *.firebaseapp.com handler.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth, applyActionCode, checkActionCode,
  verifyPasswordResetCode, confirmPasswordReset
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBQoisy2OO5pPzTUP4iI5G41m8aDtwxEzY",
  authDomain: "getkeyd-c259c.firebaseapp.com",
  projectId: "getkeyd-c259c",
  storageBucket: "getkeyd-c259c.firebasestorage.app",
  messagingSenderId: "55589195554",
  appId: "1:55589195554:web:d51217bf0b4b647a155f7b",
  measurementId: "G-VQENRRWMTH"
};
const auth = getAuth(initializeApp(firebaseConfig));

const params = new URLSearchParams(location.search);
const mode = params.get("mode");
const oobCode = params.get("oobCode");
const rawContinue = params.get("continueUrl") || "";
// Only trust an on-site continue URL; otherwise fall back to login.
let cont = "login.html";
try {
  const u = new URL(rawContinue, location.href);
  if (u.origin === location.origin) cont = u.href;
} catch (_) {}

const icon = document.getElementById("aa-icon");
const title = document.getElementById("aa-title");
const msg = document.getElementById("aa-msg");
const errorEl = document.getElementById("aa-error");
const formEl = document.getElementById("aa-form");
const actions = document.getElementById("aa-actions");

const codeMessage = {
  "auth/expired-action-code": "This link has expired. Please request a new one from getkeyd.",
  "auth/invalid-action-code": "This link is invalid or has already been used. Please request a new one.",
  "auth/user-disabled": "This account has been disabled.",
  "auth/user-not-found": "We couldn't find an account for this link.",
  "auth/weak-password": "Password should be at least 6 characters.",
};
const messageFor = (code) => codeMessage[code] || "Something went wrong. Please try again.";

const showError = (text) => { errorEl.textContent = text; errorEl.classList.remove("hidden"); };
const succeed = (t, m) => {
  icon.textContent = "✅";
  title.textContent = t;
  msg.textContent = m;
  formEl.innerHTML = "";
  actions.innerHTML = `<a class="btn primary" href="${cont}">Continue to getkeyd</a>`;
};
const fail = (text) => {
  icon.textContent = "⚠️";
  title.textContent = "Something went wrong";
  msg.textContent = text;
  formEl.innerHTML = "";
  actions.innerHTML = `<a class="btn primary" href="login.html">Back to login</a>`;
};

function showLoading(text) {
  icon.textContent = "⏳";
  title.textContent = "One moment…";
  msg.textContent = text;
  formEl.innerHTML = "<p style=\"text-align:center;color:var(--muted);padding:12px 0\">⏳ " + text + "</p>";
  actions.innerHTML = "";
}

async function run() {
  if (!mode || !oobCode) {
    fail("This link is missing information. Please use the most recent email we sent.");
    return;
  }
  try {
    if (mode === "verifyEmail" || mode === "verifyAndChangeEmail") {
      await applyActionCode(auth, oobCode);
      succeed("You're all set 🎉", "Your email address has been verified. You can log in now.");
    } else if (mode === "recoverEmail") {
      await applyActionCode(auth, oobCode);
      succeed("Email change reversed", "Your account's email address has been restored.");
    } else if (mode === "resetPassword") {
      showLoading("Verifying your reset link…");
      const email = await verifyPasswordResetCode(auth, oobCode);
      showResetForm(email);
    } else {
      fail("This link isn't something getkeyd recognizes.");
    }
  } catch (e) {
    fail(messageFor(e.code));
  }
}

function showResetForm(email) {
  icon.textContent = "🔑";
  title.textContent = "Choose a new password";
  msg.textContent = `Set a new password for ${email}.`;
  formEl.innerHTML = `
    <label>New password
      <input type="password" id="aa-pw" placeholder="At least 6 characters" autocomplete="new-password" minlength="6" />
    </label>
    <button class="btn primary" id="aa-save" type="button">Save password</button>`;
  const pw = formEl.querySelector("#aa-pw");
  const save = formEl.querySelector("#aa-save");
  save.onclick = async () => {
    errorEl.classList.add("hidden");
    if (!pw.value || pw.value.length < 6) { showError("Password should be at least 6 characters."); return; }
    save.disabled = true;
    try {
      await confirmPasswordReset(auth, oobCode, pw.value);
      succeed("Password updated 🎉", "You can log in with your new password now.");
    } catch (e) {
      save.disabled = false;
      showError(messageFor(e.code));
    }
  };
}

run();
