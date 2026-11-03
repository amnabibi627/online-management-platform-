"use strict";

const phoneForm = document.getElementById("phoneForm");
const authMessage = document.getElementById("authMessage");
const phoneNumber = document.getElementById("phoneNumber");
const countryCode = document.getElementById("countryCode");

function showAuthMessage(message) {
  authMessage.textContent = message;
  authMessage.classList.add("is-visible");
}

// Connect this handler to Firebase Phone Auth and the reCAPTCHA verifier.
function sendOTP() {
  const localNumber = phoneNumber.value.trim();
  const digitsOnly = localNumber.replace(/\D/g, "");

  if (digitsOnly.length < 6 || digitsOnly.length > 15) {
    showAuthMessage("Enter a valid phone number, including your area code if needed.");
    phoneNumber.focus();
    return false;
  }

  showAuthMessage("Phone verification is not connected yet. Configure Firebase Phone Auth and reCAPTCHA to send an OTP.");
  return false;
}

// Connect this handler to Firebase's confirmation result after adding an OTP field.
function verifyOTP() {
  showAuthMessage("OTP verification is not connected yet. Add the Firebase confirmation flow to verify a code.");
  return false;
}

window.sendOTP = sendOTP;
window.verifyOTP = verifyOTP;

phoneForm.addEventListener("submit", (event) => {
  event.preventDefault();
  sendOTP();
});

document.getElementById("googleSignIn").addEventListener("click", () => {
  showAuthMessage("Google sign-in is not connected yet. Configure Firebase Google Authentication to continue.");
});

phoneNumber.addEventListener("input", () => {
  if (authMessage.classList.contains("is-visible")) {
    authMessage.textContent = "";
    authMessage.classList.remove("is-visible");
  }
});

countryCode.addEventListener("change", () => {
  phoneNumber.setAttribute("autocomplete", "tel-national");
});

document.getElementById("currentYear").textContent = String(new Date().getFullYear());
