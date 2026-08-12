var ADMIN_PASSWORD = "admin123";

function isAdmin() {
  return sessionStorage.getItem("phishaware-admin") === "true";
}

function updateAdminUI() {
  var isAuth = isAdmin();
  document.getElementById("uploadBtn").style.display = isAuth ? "" : "none";
  document.getElementById("adminLogin").style.display = isAuth ? "none" : "inline";
  document.getElementById("adminLogout").style.display = isAuth ? "inline" : "none";
  if (!isAuth) {
    document.getElementById("uploadPanel").classList.remove("open");
  }
}

function adminLogin() {
  var pw = prompt("Enter admin password:");
  if (pw === ADMIN_PASSWORD) {
    sessionStorage.setItem("phishaware-admin", "true");
    updateAdminUI();
  } else if (pw !== null) {
    alert("Incorrect password.");
  }
}

function adminLogout() {
  sessionStorage.removeItem("phishaware-admin");
  updateAdminUI();
}

var builtIn = [
  {
    id: "builtin-1",
    category: "credential-theft",
    title: '"Password Expiry" Scam',
    badge: "Credential Theft",
    severity: "critical",
    tags: ["Credential Harvesting", "Urgency"],
    link: "credential-phishing.html",
    preview: '<div class="mock-from">Microsoft Security Team &lt;no-reply@ms-verify.org&gt;</div><div class="mock-subject">ACTION REQUIRED: Your password expires in 24 hours</div><div class="mock-body">Your account has been compromised. Click below to verify your identity immediately...</div><div class="mock-btn">Verify Account</div>'
  },
  {
    id: "builtin-2",
    category: "invoice-fraud",
    title: '"Overdue Invoice" Scam',
    badge: "Invoice Fraud",
    severity: "critical",
    tags: ["Financial Fraud", "Attachment"],
    link: "invoice-scam.html",
    preview: '<div class="mock-from">Accounts Payable &lt;invoices@quickbooks-billing.com&gt;</div><div class="mock-subject">Overdue Invoice #8842 - Payment Required</div><div class="mock-body">Please find attached your outstanding invoice. Remit payment within 48 hours to avoid service interruption...</div><div class="mock-btn">View Invoice</div>'
  },
  {
    id: "builtin-3",
    category: "ceo-impersonation",
    title: '"CEO Wire Transfer" Scam',
    badge: "CEO Impersonation",
    severity: "high",
    tags: ["BEC Attack", "Social Engineering"],
    link: "ceo-fraud.html",
    preview: '<div class="mock-from">John Smith &lt;john.smith@company-mall.com&gt;</div><div class="mock-subject">Urgent wire transfer needed</div><div class="mock-body">I\'m in a meeting and can\'t talk. Need you to process a wire transfer to a vendor ASAP. Send me your mobile number...</div>'
  },
  {
    id: "builtin-4",
    category: "delivery-scam",
    title: '"Customs Fee" Scam',
    badge: "Delivery Scam",
    severity: "medium",
    tags: ["Shipping Fraud", "Payment Scam"],
    link: "package-delivery.html",
    preview: '<div class="mock-from">FedEx Delivery &lt;noreply@fedex-track.com&gt;</div><div class="mock-subject">Your package #FDX9281 is held at customs</div><div class="mock-body">Your shipment has been delayed. Pay the customs fee of $2.99 to release your package...</div><div class="mock-btn">Pay Customs Fee</div>'
  }
];

var categoryLabels = {
  "credential-theft": "Credential Theft",
  "invoice-fraud": "Invoice Fraud",
  "ceo-impersonation": "Impersonation",
  "delivery-scam": "Delivery Scam"
};

function loadUploaded() {
  try {
    var raw = localStorage.getItem("phishaware-uploads");
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveUploaded(entries) {
  localStorage.setItem("phishaware-uploads", JSON.stringify(entries));
}

function getAllEntries() {
  return builtIn.concat(loadUploaded());
}

function getFilteredEntries() {
  var radios = document.getElementsByName("category");
  var selected = "all";
  for (var i = 0; i < radios.length; i++) {
    if (radios[i].checked) { selected = radios[i].value; break; }
  }
  var all = getAllEntries();
  if (selected === "all") return all;
  return all.filter(function(e) { return e.category === selected; });
}

function renderGallery() {
  var entries = getFilteredEntries();
  var html = "";
  for (var i = 0; i < entries.length; i++) {
    var e = entries[i];
    var isBuiltin = e.id.indexOf("builtin-") === 0;
    var cardClick = isBuiltin ? ('href="' + e.link + '"') : ('href="#" onclick="openUploadedModal(\'' + e.id + '\'); return false;"');
    var imageContent = "";
    if (!isBuiltin && e.image) {
      imageContent = '<img src="' + e.image + '" alt="' + e.title + '" class="uploaded-thumb">';
    } else if (isBuiltin) {
      imageContent = '<div class="mock-email-mini">' + e.preview + '</div>';
    }

    html += '<a ' + cardClick + ' class="card" data-category="' + e.category + '">';
    html += '<div class="card-badge ' + e.severity + '">' + e.badge + '</div>';
    html += '<div class="card-image email-preview">' + imageContent + '</div>';
    html += '<div class="card-info"><h3>' + e.title + '</h3>';
    for (var t = 0; t < e.tags.length; t++) {
      html += '<span class="tag">' + e.tags[t] + '</span>';
    }
    if (!isBuiltin) {
      html += '<span class="tag user-tag">User Upload</span>';
    }
    html += '</div></a>';
  }
  document.getElementById("gallery").innerHTML = html || '<p class="empty-msg">No examples found for this category.</p>';
}

function toggleUpload() {
  var panel = document.getElementById("uploadPanel");
  panel.classList.toggle("open");
}

function addEntry() {
  var cat = document.getElementById("uploadCat").value;
  var title = document.getElementById("uploadTitle").value.trim();
  var desc = document.getElementById("uploadDesc").value.trim();
  var flagsRaw = document.getElementById("uploadFlags").value.trim();
  var fileInput = document.getElementById("uploadImage");
  var file = fileInput.files[0];

  if (!title) { alert("Please enter a title."); return; }
  if (!file) { alert("Please select an image to upload."); return; }

  var reader = new FileReader();
  reader.onload = function() {
    var flags = flagsRaw ? flagsRaw.split("\n").map(function(f) { return f.trim(); }).filter(Boolean) : [];
    var entries = loadUploaded();
    var newEntry = {
      id: "upload-" + Date.now(),
      category: cat,
      title: title,
      badge: categoryLabels[cat] || cat,
      severity: cat === "credential-theft" || cat === "invoice-fraud" ? "critical" : cat === "ceo-impersonation" ? "high" : "medium",
      tags: flags.length ? flags : ["User Submitted"],
      image: reader.result,
      description: desc,
      flags: flags
    };
    entries.push(newEntry);
    saveUploaded(entries);

    document.getElementById("uploadTitle").value = "";
    document.getElementById("uploadDesc").value = "";
    document.getElementById("uploadFlags").value = "";
    fileInput.value = "";
    document.getElementById("imagePreview").innerHTML = "";
    document.getElementById("uploadPanel").classList.remove("open");

updateAdminUI();
renderGallery();
  };
  reader.readAsDataURL(file);
}

function previewImage(input) {
  var preview = document.getElementById("imagePreview");
  preview.innerHTML = "";
  if (input.files && input.files[0]) {
    var reader = new FileReader();
    reader.onload = function(e) {
      preview.innerHTML = '<img src="' + e.target.result + '" alt="Preview">';
    };
    reader.readAsDataURL(input.files[0]);
  }
}

document.getElementById("uploadImage").addEventListener("change", function() {
  previewImage(this);
});

function openUploadedModal(id) {
  var entries = loadUploaded();
  var entry = null;
  for (var i = 0; i < entries.length; i++) {
    if (entries[i].id === id) { entry = entries[i]; break; }
  }
  if (!entry) return;

  var flagsHtml = "";
  if (entry.flags && entry.flags.length) {
    var icons = ["&#x1F4E7;", "&#x23F0;", "&#x26A0;", "&#x1F517;", "&#x1F4DD;"];
    for (var f = 0; f < entry.flags.length; f++) {
      flagsHtml += '<div class="flag"><span class="flag-icon">' + (icons[f] || "&#x274C;") + '</span><div class="flag-content"><p>' + entry.flags[f] + '</p></div></div>';
    }
  }

  var sevClass = entry.severity;
  var sevLabel = entry.severity.charAt(0).toUpperCase() + entry.severity.slice(1);

  var html = '<h1>' + entry.title + '</h1>';
  html += '<span class="severity ' + sevClass + '">' + sevLabel + ' Severity</span>';
  html += '<div class="email-sim"><div class="email-body" style="padding:0;">';
  html += '<img src="' + entry.image + '" alt="' + entry.title + '" style="width:100%;display:block;border-radius:8px;">';
  html += '</div></div>';
  if (entry.description) {
    html += '<p style="color:var(--text-muted);margin-bottom:20px;">' + entry.description + '</p>';
  }
  if (flagsHtml) {
    html += '<div class="red-flags"><h2>Red Flags to Look For</h2>' + flagsHtml + '</div>';
  }
  if (isAdmin()) {
    html += '<button class="delete-btn" onclick="deleteEntry(\'' + entry.id + '\')">Delete This Entry</button>';
  }

  document.getElementById("modalContent").innerHTML = html;
  document.getElementById("modal").classList.add("open");
}

function deleteEntry(id) {
  if (!confirm("Delete this uploaded example?")) return;
  var entries = loadUploaded();
  entries = entries.filter(function(e) { return e.id !== id; });
  saveUploaded(entries);
  document.getElementById("modal").classList.remove("open");
  renderGallery();
}

function closeModal(e) {
  if (e.target === document.getElementById("modal")) {
    document.getElementById("modal").classList.remove("open");
  }
}

document.addEventListener("keydown", function(e) {
  if (e.key === "Escape") {
    document.getElementById("modal").classList.remove("open");
  }
});

renderGallery();
