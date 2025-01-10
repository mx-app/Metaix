function showPage(pageId) {
  document.querySelectorAll(".page").forEach(page => page.classList.remove("active"));
  document.getElementById(pageId).classList.add("active");
}

function selectPackage(packageType) {
  const selectedPackage = document.querySelector(`.package[data-price="${packageType === 'small' ? 100 : packageType === 'medium' ? 300 : 500}"]`);
  const price = selectedPackage.dataset.price;
  localStorage.setItem("selectedPrice", price);
  showPage("enterDetails");
}

document.getElementById("adDetailsForm").addEventListener("input", function() {
  const appName = document.getElementById("appName").value;
  const appLink = document.getElementById("appLink").value;
  const adDescription = document.getElementById("adDescription").value;
  const continueButton = document.getElementById("continueButton");
  continueButton.disabled = !(appName && appLink && adDescription);
});

function showPreview() {
  event.preventDefault();
  document.getElementById("previewAppName").textContent = document.getElementById("appName").value;
  document.getElementById("previewAppLink").textContent = document.getElementById("appLink").value;
  document.getElementById("previewAdDescription").textContent = document.getElementById("adDescription").value;
  showPage("previewTask");
}

function showPayment() {
  const price = localStorage.getItem("selectedPrice");
  document.getElementById("price").textContent = price;
  showPage("paymentPage");
}

function goBack(pageId) {
  showPage(pageId);
}

function processPayment() {
  alert("الدفع جارٍ المعالجة...");
  // هنا تضيف مكتبة Ton Connect
}
