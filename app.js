// Configuration
const CONFIG = {
    MAX_FREE_GENERATIONS: 3,
    PRO_PRICE: 5,
    ANALYTICS_ID: 'G-7GRH1XFH9W'
};

// Éléments DOM
const DOM = {
    jobInput: document.getElementById('job'),
    skillsInput: document.getElementById('skills'),
    generateBtn: document.getElementById('generateBtn'),
    resultSection: document.getElementById('result'),
    bioContent: document.getElementById('bio-content'),
    charCount: document.getElementById('charCount'),
    pdfBtn: document.getElementById('pdfBtn'),
    copyBtn: document.getElementById('copyBtn'),
    proCta: document.getElementById('pro-cta'),
    proBtn: document.getElementById('proBtn'),
    proModal: document.getElementById('pro-modal'),
    checkoutBtn: document.getElementById('checkoutBtn'),
    closeModalBtn: document.getElementById('closeModalBtn')
};

// State
const state = {
    freeGenerations: localStorage.getItem('freeGenerations') || 0,
    isPro: false
};

// Initialisation
document.addEventListener('DOMContentLoaded', init);

function init() {
    setupEventListeners();
    checkProStatus();
}

function setupEventListeners() {
    // Génération de bio
    DOM.generateBtn.addEventListener('click', handleBioGeneration);
    
    // Actions sur le résultat
    DOM.pdfBtn.addEventListener('click', exportToPDF);
    DOM.copyBtn.addEventListener('click', copyToClipboard);
    
    // Version Pro
    DOM.proBtn.addEventListener('click', showProModal);
    DOM.checkoutBtn.addEventListener('click', startCheckout);
    DOM.closeModalBtn.addEventListener('click', hideProModal);
    
    // Compteur de caractères
    DOM.bioContent.addEventListener('input', updateCharCount);
}

// Gestion de la génération de bio
async function handleBioGeneration() {
    const job = DOM.jobInput.value.trim();
    const skills = DOM.skillsInput.value.trim();

    if (!job || !skills) {
        showError("Veuillez remplir tous les champs");
        return;
    }

    try {
        showLoading();
        
        const bio = await generateBio(job, skills);
        showResult(bio);
        
        trackEvent('bio_generated', { 
            job_type: job.toLowerCase(),
            skills_count: skills.split(',').length 
        });
        
        checkForProOffer();
        
    } catch (error) {
        showError(error.message);
        trackEvent('generation_error', { error: error.message });
    }
}

async function generateBio(job, skills) {
    state.freeGenerations++;
    localStorage.setItem('freeGenerations', state.freeGenerations);
    
    const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job, skills, tone: "professional" })
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erreur lors de la génération");
    }

    const data = await response.json();
    if (!data?.choices?.[0]?.message?.content) {
        throw new Error("Format de réponse inattendu");
    }

    return formatBio(data.choices[0].message.content);
}

function showLoading() {
    DOM.resultSection.classList.remove('hidden');
    DOM.bioContent.innerHTML = `
        <div class="flex flex-col items-center justify-center py-12">
            <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
            <p class="text-gray-600">Génération de votre bio LinkedIn...</p>
        </div>`;
}

function showResult(bio) {
    DOM.bioContent.innerHTML = bio;
    DOM.resultSection.classList.add('fade-in');
    updateCharCount();
}

function formatBio(text) {
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>')
        .replace(/^- (.*?)$/gm, '<div class="flex items-start mb-2"><span class="text-blue-500 mr-2">•</span><span>$1</span></div>');
}

function updateCharCount() {
    const text = DOM.bioContent.innerText || '';
    DOM.charCount.textContent = `${text.length} caractères`;
}

// Gestion PDF
function exportToPDF() {
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const text = DOM.bioContent.innerText;
        
        doc.setFont("helvetica");
        doc.setFontSize(12);
        doc.text(text, 15, 15, { maxWidth: 180 });
        
        if (!state.isPro) {
            addWatermark(doc);
        }
        
        doc.save(`bio-linkedin-${new Date().toISOString().slice(0, 10)}.pdf`);
        trackEvent('pdf_exported');
        
    } catch (error) {
        showError("Erreur lors de la génération du PDF");
        trackEvent('pdf_error', { error: error.message });
    }
}

function addWatermark(doc) {
    doc.setTextColor(150);
    doc.setFontSize(10);
    doc.text("Généré avec linkedinbio.site - Passez Pro pour supprimer ce watermark", 105, 285, { align: "center" });
}

// Gestion Copie
function copyToClipboard() {
    navigator.clipboard.writeText(DOM.bioContent.innerText)
        .then(() => {
            showToast("Bio copiée dans le presse-papiers !");
            trackEvent('content_copied');
        })
        .catch(err => {
            showError("Échec de la copie : " + err);
        });
}

// Version Pro
function checkProStatus() {
    // Ici vous devriez vérifier le statut Pro via une API
    state.isPro = localStorage.getItem('isPro') === 'true';
}

function checkForProOffer() {
    if (state.freeGenerations >= CONFIG.MAX_FREE_GENERATIONS && !state.isPro) {
        DOM.proCta.classList.remove('hidden');
        trackEvent('pro_offer_displayed');
    }
}

function showProModal() {
    DOM.proModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    trackEvent('pro_modal_opened');
}

function hideProModal() {
    DOM.proModal.classList.add('hidden');
    document.body.style.overflow = '';
}

function startCheckout() {
    // Ici vous devriez intégrer Stripe/Lemon Squeezy
    window.open(`https://checkout.stripe.com?prefilled_email=user@example.com&amount=${CONFIG.PRO_PRICE}00`, '_blank');
    trackEvent('checkout_started');
    hideProModal();
}

// Helpers
function showError(message) {
    DOM.bioContent.innerHTML = `
        <div class="bg-red-50 border-l-4 border-red-500 p-4 rounded">
            <div class="flex items-center">
                <svg class="w-6 h-6 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <div>
                    <p class="font-medium text-red-800">Erreur</p>
                    <p class="text-sm text-red-600">${message}</p>
                </div>
            </div>
        </div>`;
}

function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg animate__animated animate__fadeInUp';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('animate__fadeOutDown');
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

// Analytics
function trackEvent(action, params = {}) {
    // Google Analytics
    if (window.gtag) {
        gtag('event', action, {
            ...params,
            free_uses: state.freeGenerations,
            is_pro: state.isPro
        });
    }
    
    // Vercel Analytics - vérification plus robuste
    if (typeof window.va !== 'undefined' && typeof window.va.track === 'function') {
        window.va.track(action, params);
    }
    
    console.log('[Analytics]', action, params);
}