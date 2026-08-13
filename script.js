// Constants for Cheeta Bike Taxi (Srinagar Garhwal)
const SRINAGAR_LAT = 30.2226;
const SRINAGAR_LNG = 78.7836;
const RATE_PER_KM = 10;
const TARGET_PHONE = "9548407910";

// App State Variables
let activeMode = 'pickup';
let pickupCoords = null;
let dropCoords = null;
let pickupMarker = null;
let dropMarker = null;
let selectedTip = 0;
let calculatedDistKm = 0;

// Initialize Map centered on Srinagar Garhwal
const map = L.map('map').setView([SRINAGAR_LAT, SRINAGAR_LNG], 14);

// Tile Layer (OpenStreetMap)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap'
}).addTo(map);

// Set Map Mode (Pickup vs Dropoff)
function setMode(mode) {
  activeMode = mode;
  document.getElementById('btnModePickup').innerHTML = '\u{1F4CD} Set Pickup Pin';
  document.getElementById('btnModeDrop').innerHTML = '\u{1F3C1} Set Dropoff Pin';
  
  document.getElementById('btnModePickup').className = 'pin-btn ' + (mode === 'pickup' ? 'active-pickup' : '');
  document.getElementById('btnModeDrop').className = 'pin-btn ' + (mode === 'drop' ? 'active-drop' : '');
}

// Handle Map Clicks for Pin Dropping
map.on('click', function(e) {
  const { lat, lng } = e.latlng;
  
  if (activeMode === 'pickup') {
    pickupCoords = { lat, lng };
    if (pickupMarker) map.removeLayer(pickupMarker);
    
    pickupMarker = L.marker([lat, lng], { draggable: true })
      .addTo(map)
      .bindPopup('<b>Cheeta Pickup</b>')
      .openPopup();

    pickupMarker.on('dragend', function(evt) {
      pickupCoords = evt.target.getLatLng();
      recalculateFare();
    });
  } else {
    dropCoords = { lat, lng };
    if (dropMarker) map.removeLayer(dropMarker);

    dropMarker = L.marker([lat, lng], { draggable: true })
      .addTo(map)
      .bindPopup('<b>Cheeta Dropoff</b>')
      .openPopup();

    dropMarker.on('dragend', function(evt) {
      dropCoords = evt.target.getLatLng();
      recalculateFare();
    });
  }

  recalculateFare();
});

// Handle Tip Selection
function selectTip(amount, btnElement) {
  selectedTip = amount;
  document.querySelectorAll('.tip-btn').forEach(btn => btn.classList.remove('selected'));
  btnElement.classList.add('selected');
  recalculateFare();
}

// Calculate Distance and Fare Breakdown
function recalculateFare() {
  if (pickupCoords && dropCoords) {
    const from = L.latLng(pickupCoords.lat, pickupCoords.lng);
    const to = L.latLng(dropCoords.lat, dropCoords.lng);
    
    // Straight-line distance multiplied by 1.25 for mountain road geometry
    calculatedDistKm = ((from.distanceTo(to) / 1000) * 1.25);
    
    // Minimum 1 km distance base charge
    if (calculatedDistKm < 1) calculatedDistKm = 1;
  } else {
    calculatedDistKm = 0;
  }

  const rideFare = Math.round(calculatedDistKm * RATE_PER_KM);
  const totalFare = rideFare + selectedTip;

  document.getElementById('txtDist').innerText = calculatedDistKm.toFixed(1) + ' km';
  document.getElementById('txtFare').innerText = '₹' + rideFare;
  document.getElementById('txtTip').innerText = '₹' + selectedTip;
  document.getElementById('txtTotal').innerText = '₹' + totalFare;
}

// Dispatch Booking Message to WhatsApp
function sendWhatsApp() {
  const name = document.getElementById('passengerName').value.trim() || 'Passenger';
  const pickupAddr = document.getElementById('pickupAddr').value.trim() || 'Pinned on map';
  const dropAddr = document.getElementById('dropAddr').value.trim() || 'Pinned on map';

  const rideFare = Math.round(calculatedDistKm * RATE_PER_KM);
  const totalFare = rideFare + selectedTip;

  const pickupMapLink = pickupCoords 
    ? `https://www.google.com/maps?q=${pickupCoords.lat.toFixed(6)},${pickupCoords.lng.toFixed(6)}` 
    : 'Not pinned';
    
  const dropMapLink = dropCoords 
    ? `https://www.google.com/maps?q=${dropCoords.lat.toFixed(6)},${dropCoords.lng.toFixed(6)}` 
    : 'Not pinned';

  // Construct message with direct emojis
  let msg = `🐆 *CHEETA SERVICE*\n`;
  msg += `─────────────────────\n`;
  msg += `👤 *Name:* ${name}\n\n`;
  msg += `📍 *Pickup Location:* ${pickupAddr}\n🔗 *Map:* ${pickupMapLink}\n\n`;
  msg += `🏁 *Drop Location:* ${dropAddr}\n🔗 *Map:* ${dropMapLink}\n\n`;
  msg += `📏 *Est. Distance:* ${calculatedDistKm.toFixed(1)} km\n`;
  msg += `💵 *Ride Fare (₹10/km):* ₹${rideFare}\n`;
  msg += `🎁 *Tip:* ₹${selectedTip}\n`;
  msg += `💰 *TOTAL FARE:* ₹${totalFare}\n`;
  msg += `─────────────────────\n`;
  msg += `Please assign a Cheeta rider for my pickup!`;

  // Use api.whatsapp.com endpoint instead of wa.me to prevent emoji corruption
  const whatsappUrl = `https://api.whatsapp.com/send?phone=${TARGET_PHONE}&text=${encodeURIComponent(msg)}`;
  window.open(whatsappUrl, '_blank');
}

/* ==========================================
   Progressive Web App (PWA) Installation Logic
   ========================================== */

// Register Service Worker for PWA compliance
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(err => console.log('SW registration error:', err));
}

let deferredPrompt = null;

// Catch the native PWA install prompt event
window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent immediate automatic browser prompt banner
  e.preventDefault();
  deferredPrompt = e;

  // Display custom install popup exactly 3 seconds after page load
  setTimeout(() => {
    const banner = document.getElementById('pwaBanner');
    if (banner) {
      banner.style.display = 'block';
    }
  }, 3000);
});

// Bind PWA Popup Actions on DOM Load
document.addEventListener('DOMContentLoaded', () => {
  // Trigger system install dialog on user click
  document.getElementById('btnPwaInstall')?.addEventListener('click', async () => {
    const banner = document.getElementById('pwaBanner');
    if (banner) banner.style.display = 'none';

    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      deferredPrompt = null;
    }
  });

  // Dismiss PWA notification popup
  document.getElementById('btnPwaClose')?.addEventListener('click', () => {
    const banner = document.getElementById('pwaBanner');
    if (banner) banner.style.display = 'none';
  });
});