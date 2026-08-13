// Constants for Cheeta Bike Taxi (Srinagar Garhwal)
const SRINAGAR_LAT = 30.2226;
const SRINAGAR_LNG = 78.7836;
const TARGET_PHONE = "9548407910";
const RATE_PER_KM = 10; // Fare rate: ₹10 per km

// Preset Dropoff Locations with random/approximate Lat/Lng coordinates
const DROPOFF_PRESETS = {
  "Gola Bazar, Srinagar": { lat: 30.2210, lng: 78.7810 },
  "Sirkot, Srinagar": { lat: 30.2350, lng: 78.7950 },
  "Petrol Pump, Srinagar": { lat: 30.2180, lng: 78.7760 },
  "HNBGU University Campus, Srinagar": { lat: 30.2280, lng: 78.7880 },
  "Base Hospital, Srikot": { lat: 30.2380, lng: 78.7980 },
  "NIT Uttarakhand Gate, Srinagar": { lat: 30.2250, lng: 78.7840 }
};

// App State Variables
let activeMode = 'pickup';
let pickupCoords = null;
let dropCoords = null;
let pickupMarker = null;
let dropMarker = null;
let selectedTip = 0;
let calculatedDistKm = 0;
let currentDestinationFare = 0;

// Initialize Map centered on Srinagar Garhwal
const map = L.map('map').setView([SRINAGAR_LAT, SRINAGAR_LNG], 14);

// Tile Layer (OpenStreetMap)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap'
}).addTo(map);

/* ==========================================
   Random Coordinate Fallback Generator
   ========================================== */

function getRandomCoordinates(baseLat = SRINAGAR_LAT, baseLng = SRINAGAR_LNG) {
  const radiusInDegrees = (Math.random() * 0.035) + 0.008;
  const angle = Math.random() * 2 * Math.PI;

  return {
    lat: parseFloat((baseLat + (radiusInDegrees * Math.sin(angle))).toFixed(6)),
    lng: parseFloat((baseLng + (radiusInDegrees * Math.cos(angle))).toFixed(6))
  };
}

/* ==========================================
   Dropdown Selection Handler
   ========================================== */

/* ==========================================
   Dropdown Selection Handler
   ========================================== */

function onDropoffSelectChange() {
  const dropSelect = document.getElementById('dropAddr');
  const selectedLocation = dropSelect ? dropSelect.value : '';

  // Immediately disable/enable pin buttons & show landmark panel
  updatePinButtonStates();

  // If user unselects back to default option, clear marker & recalculate
  if (!selectedLocation) {
    if (dropMarker) {
      map.removeLayer(dropMarker);
      dropMarker = null;
      dropCoords = null;
    }
    recalculateFare();
    return;
  }

  let coords = DROPOFF_PRESETS[selectedLocation];
  
  // Fallback to random coordinates if location isn't in pre-defined object
  if (!coords) {
    const baseLat = pickupCoords ? pickupCoords.lat : SRINAGAR_LAT;
    const baseLng = pickupCoords ? pickupCoords.lng : SRINAGAR_LNG;
    coords = getRandomCoordinates(baseLat, baseLng);
  }

  setDropMarker(coords.lat, coords.lng, true);
  recalculateFare();
}

/* ==========================================
   Sliding Panel & Pin Mode State Management
   ========================================== */

function toggleLandmarkPanels() {
  const pickupInput = document.getElementById('pickupAddr');
  const dropSelect = document.getElementById('dropAddr');
  
  const pickupPanel = document.getElementById('pickupLandmarkPanel');
  const dropPanel = document.getElementById('dropLandmarkPanel');

  const hasPickup = pickupInput && pickupInput.value.trim().length > 0;
  const hasDrop = dropSelect && dropSelect.value.trim().length > 0;

  if (pickupPanel) {
    if (hasPickup) {
      pickupPanel.classList.add('open');
    } else {
      pickupPanel.classList.remove('open');
      const pickupLandmarkInput = document.getElementById('pickupLandmark');
      if (pickupLandmarkInput) pickupLandmarkInput.value = '';
    }
  }

  if (dropPanel) {
    if (hasDrop) {
      dropPanel.classList.add('open');
    } else {
      dropPanel.classList.remove('open');
      const dropLandmarkInput = document.getElementById('dropLandmark');
      if (dropLandmarkInput) dropLandmarkInput.value = '';
    }
  }
}

function updatePinButtonStates() {
  const pickupInput = document.getElementById('pickupAddr');
  const dropSelect = document.getElementById('dropAddr');
  
  const btnPickup = document.getElementById('btnModePickup');
  const btnDrop = document.getElementById('btnModeDrop');

  const hasPickup = pickupInput && pickupInput.value.trim().length > 0;
  const hasDrop = dropSelect && dropSelect.value.trim().length > 0;

  if (btnPickup) {
    btnPickup.disabled = hasPickup;
    if (hasPickup && activeMode === 'pickup') {
      setMode('drop');
    }
  }

  if (btnDrop) {
    btnDrop.disabled = hasDrop;
    if (hasDrop && activeMode === 'drop' && !btnPickup?.disabled) {
      setMode('pickup');
    }
  }

  toggleLandmarkPanels();
}

function setMode(mode) {
  const btnPickup = document.getElementById('btnModePickup');
  const btnDrop = document.getElementById('btnModeDrop');

  if ((mode === 'pickup' && btnPickup?.disabled) || (mode === 'drop' && btnDrop?.disabled)) {
    return;
  }

  activeMode = mode;
  if (btnPickup) btnPickup.innerHTML = '📍 Set Pickup Pin';
  if (btnDrop) btnDrop.innerHTML = '🏁 Set Dropoff Pin';
  
  if (btnPickup) btnPickup.className = 'pin-btn ' + (mode === 'pickup' ? 'active-pickup' : '');
  if (btnDrop) btnDrop.className = 'pin-btn ' + (mode === 'drop' ? 'active-drop' : '');
}

/* ==========================================
   Map Click & Marker Operations
   ========================================== */

map.on('click', function(e) {
  const btnPickup = document.getElementById('btnModePickup');
  const btnDrop = document.getElementById('btnModeDrop');

  if (btnPickup?.disabled && btnDrop?.disabled) {
    return;
  }

  const { lat, lng } = e.latlng;
  
  if (activeMode === 'pickup' && !btnPickup?.disabled) {
    setPickupMarker(lat, lng);
  } else if (activeMode === 'drop' && !btnDrop?.disabled) {
    setDropMarker(lat, lng);
  }

  recalculateFare();
});

// Set Pickup Marker
function setPickupMarker(lat, lng, zoomMap = false) {
  pickupCoords = { lat, lng };
  if (pickupMarker) map.removeLayer(pickupMarker);
  
  pickupMarker = L.marker([lat, lng], { draggable: true })
    .addTo(map)
    .bindPopup('<b>Pickup Location ✅</b>')
    .openPopup();

  if (zoomMap) {
    map.setView([lat, lng], 16);
  }

  const pickupInput = document.getElementById('pickupAddr');
  if (pickupInput) {
    pickupInput.value = `Location Confirmed✅`;
    updatePinButtonStates();
  }

  pickupMarker.on('dragend', function(evt) {
    pickupCoords = evt.target.getLatLng();
    if (pickupInput) {
      pickupInput.value = `Pickup (${pickupCoords.lat.toFixed(4)}, ${pickupCoords.lng.toFixed(4)})`;
    }
    recalculateFare();
  });

  recalculateFare();
}

// Set Dropoff Marker
function setDropMarker(lat, lng, zoomMap = false) {
  dropCoords = { lat, lng };
  if (dropMarker) map.removeLayer(dropMarker);

  dropMarker = L.marker([lat, lng], { draggable: true })
    .addTo(map)
    .bindPopup(`<b>Dropoff Location 🏁</b><br><small>(${lat.toFixed(4)}, ${lng.toFixed(4)})</small>`)
    .openPopup();

  if (zoomMap) {
    map.setView([lat, lng], 15);
  }

  dropMarker.on('dragend', function(evt) {
    dropCoords = evt.target.getLatLng();
    recalculateFare();
  });

  recalculateFare();
}

/* ==========================================
   Distance & Fare Calculation (₹10 / KM)
   ========================================== */

function calculateFareAndDistance() {
  if (!pickupCoords || !dropCoords) {
    calculatedDistKm = 0;
    currentDestinationFare = 0;
    return;
  }

  const from = L.latLng(pickupCoords.lat, pickupCoords.lng);
  const to = L.latLng(dropCoords.lat, dropCoords.lng);
  
  // Real distance calculated via Leaflet in kilometers (multiplied by 1.2 road curve factor)
  calculatedDistKm = (from.distanceTo(to) / 1000) * 1.2;
  if (calculatedDistKm < 0.5) calculatedDistKm = 0.5; // Minimum 0.5 km threshold

  // Fare calculation: Distance * ₹10
  currentDestinationFare = Math.round(calculatedDistKm * RATE_PER_KM);
}

// GPS Geolocation Handler
function useCurrentLocation() {
  const locBtn = document.getElementById('btnCurrentLoc');

  if (!navigator.geolocation) {
    alert('Geolocation is not supported by your browser.');
    return;
  }

  if (locBtn) {
    locBtn.disabled = true;
    locBtn.innerHTML = '⏳ Locating...';
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;

      setPickupMarker(lat, lng, true);

      if (locBtn) {
        locBtn.disabled = false;
        locBtn.innerHTML = '🎯 Current';
      }
    },
    (error) => {
      let errMsg = 'Unable to fetch location.';
      if (error.code === error.PERMISSION_DENIED) errMsg = 'Location permission denied.';
      alert(errMsg);

      if (locBtn) {
        locBtn.disabled = false;
        locBtn.innerHTML = '🎯 Current';
      }
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  );
}

// Handle Tip Selection
function selectTip(amount, btnElement) {
  selectedTip = amount;
  document.querySelectorAll('.tip-btn').forEach(btn => btn.classList.remove('selected'));
  btnElement.classList.add('selected');
  recalculateFare();
}

// Recalculate Total Fare Summary
function recalculateFare() {
  calculateFareAndDistance();

  const rideFare = currentDestinationFare;
  const totalFare = rideFare + selectedTip;

  const txtDist = document.getElementById('txtDist');
  const txtFare = document.getElementById('txtFare');
  const txtTip = document.getElementById('txtTip');
  const txtTotal = document.getElementById('txtTotal');

  if (txtDist) txtDist.innerText = calculatedDistKm > 0 ? calculatedDistKm.toFixed(1) + ' km' : '0.0 km';
  if (txtFare) txtFare.innerText = '₹' + rideFare;
  if (txtTip) txtTip.innerText = '₹' + selectedTip;
  if (txtTotal) txtTotal.innerText = '₹' + totalFare;
}

// Dispatch Booking Message to WhatsApp
function sendWhatsApp() {
  const nameInput = document.getElementById('passengerName');
  const pickupInput = document.getElementById('pickupAddr');
  const dropSelect = document.getElementById('dropAddr');
  
  const pickupLandmarkInput = document.getElementById('pickupLandmark');
  const dropLandmarkInput = document.getElementById('dropLandmark');

  const name = nameInput ? nameInput.value.trim() : '';
  const pickupAddr = pickupInput ? pickupInput.value.trim() : '';
  const dropAddr = dropSelect ? dropSelect.value.trim() : '';
  
  const pickupLandmark = pickupLandmarkInput ? pickupLandmarkInput.value.trim() : '';
  const dropLandmark = dropLandmarkInput ? dropLandmarkInput.value.trim() : '';

  const missingFields = [];

  if (!name) missingFields.push('Passenger Name');
  if (!pickupAddr && !pickupCoords) missingFields.push('Pickup Pin / Location');
  if (!dropAddr && !dropCoords) missingFields.push('Dropoff Location');

  if (missingFields.length > 0) {
    showValidationModal(missingFields);
    return;
  }

  const rideFare = currentDestinationFare;
  const totalFare = rideFare + selectedTip;

  const pickupMapLink = pickupCoords ? `https://www.google.com/maps?q=${pickupCoords.lat.toFixed(6)},${pickupCoords.lng.toFixed(6)}` : 'N/A';
  const dropMapLink = dropCoords ? `https://www.google.com/maps?q=${dropCoords.lat.toFixed(6)},${dropCoords.lng.toFixed(6)}` : 'N/A';

  let msg = `🐆 *CHEETA SERVICE*\n`;
  msg += `─────────────────────\n`;
  msg += `👤 *Name:* ${name}\n\n`;
  
  msg += `📍 *Pickup:* ${pickupAddr}\n`;
  if (pickupLandmark) msg += `🏠 *Pickup Landmark:* ${pickupLandmark}\n`;
  msg += `🔗 *Pickup Map:* ${pickupMapLink}\n\n`;

  msg += `🏁 *Dropoff:* ${dropAddr}\n`;
  if (dropLandmark) msg += `🏢 *Drop Landmark:* ${dropLandmark}\n`;
  msg += `🔗 *Drop Map:* ${dropMapLink}\n\n`;

  msg += `📏 *Est. Distance:* ${calculatedDistKm > 0 ? calculatedDistKm.toFixed(1) + ' km' : 'N/A'}\n`;
  msg += `💵 *Fare (@ ₹10/km):* ₹${rideFare}\n`;
  msg += `🎁 *Tip:* ₹${selectedTip}\n`;
  msg += `💰 *TOTAL FARE:* ₹${totalFare}\n`;
  msg += `─────────────────────\n`;
  msg += `Please assign a Cheeta rider for my pickup!`;

  const whatsappUrl = `https://api.whatsapp.com/send?phone=${TARGET_PHONE}&text=${encodeURIComponent(msg)}`;
  window.open(whatsappUrl, '_blank');
}

/* Modal Helpers */
function showValidationModal(missingList) {
  const modal = document.getElementById('validationModal');
  const listContainer = document.getElementById('missingFieldsList');

  if (modal && listContainer) {
    listContainer.innerHTML = missingList.map(item => `<li>${item}</li>`).join('');
    modal.style.display = 'flex';
  }
}

function closeValidationModal() {
  const modal = document.getElementById('validationModal');
  if (modal) {
    modal.style.display = 'none';
  }
}

/* Attach Listeners on DOM Ready */
document.addEventListener('DOMContentLoaded', () => {
  const nameInput = document.getElementById('passengerName');

  // Restrict passenger name input strictly to letters, spaces, dots, and hyphens
  if (nameInput) {
    nameInput.addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/[^a-zA-Z\s.-]/g, '');
    });
  }

  updatePinButtonStates();

  /* PWA Event Listeners */
  document.getElementById('btnPwaInstall')?.addEventListener('click', async () => {
    const banner = document.getElementById('pwaBanner');
    if (banner) banner.style.display = 'none';

    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      deferredPrompt = null;
    }
  });

  document.getElementById('btnPwaClose')?.addEventListener('click', () => {
    const banner = document.getElementById('pwaBanner');
    if (banner) banner.style.display = 'none';
  });
});

/* Service Worker Registration */
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(err => console.log('SW registration error:', err));
}

let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;

  setTimeout(() => {
    const banner = document.getElementById('pwaBanner');
    if (banner) {
      banner.style.display = 'block';
    }
  }, 3000);
});