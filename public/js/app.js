// LDDIGITALCO — Main App Logic

document.addEventListener('DOMContentLoaded', () => {
  console.log('LDDIGITALCO App Initialized');
});

// Booking Modal Controls
function openBookingModal(serviceName = 'Diagnóstico General') {
  const modal = document.getElementById('booking-modal');
  const serviceTitle = document.getElementById('modal-service-name');
  if (serviceTitle) serviceTitle.innerText = serviceName;
  if (modal) {
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }
}

function closeBookingModal() {
  const modal = document.getElementById('booking-modal');
  if (modal) {
    modal.classList.add('hidden');
    document.body.style.overflow = 'auto';
  }
}

function handleBookingSubmit(event) {
  event.preventDefault();
  const name = document.getElementById('booking-name')?.value || 'Usuario';
  const email = document.getElementById('booking-email')?.value || '';
  const date = document.getElementById('booking-date')?.value || '';
  
  closeBookingModal();
  showToast(`¡Gracias, ${name}! Hemos reservado tu sesión para el ${date}. Te llegará el enlace de Google Meet a ${email}.`);
}

// Simple Toast Notification
function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'fixed bottom-6 right-6 z-50 px-6 py-4 rounded-2xl bg-slate-900 border border-emerald-400 text-white shadow-2xl flex items-center gap-3 text-sm transition-all transform translate-y-4 opacity-0 font-medium';
  toast.innerHTML = `<span class="text-emerald-400 text-lg">✓</span> <span>${message}</span>`;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.remove('translate-y-4', 'opacity-0');
  }, 50);

  setTimeout(() => {
    toast.classList.add('translate-y-4', 'opacity-0');
    setTimeout(() => toast.remove(), 400);
  }, 4500);
}

// WhatsApp Quick Launcher
function openWhatsApp(customText = 'Hola LDDIGITALCO, quisiera solicitar información sobre sus servicios.') {
  const encoded = encodeURIComponent(customText);
  window.open(`https://wa.me/?text=${encoded}`, '_blank');
}
