// Configuration
const CONFIG = {
    MAX_FREE_GENERATIONS: 3,
    PRO_PRICE: 5,
    ANALYTICS_ID: 'G-7GRH1XFH9W',
    STRIPE_PUBLIC_KEY: process.env.STRIPE_PUBLIC_KEY,
    STRIPE_PRICE_ID: process.env.STRIPE_PRICE_ID
};

// Initialisation Stripe
const stripe = Stripe(CONFIG.STRIPE_PUBLIC_KEY);

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
    freeGenerations: parseInt(localStorage.getItem('freeGenerations')) || 0,
    isPro: localStorage.getItem('isPro') === 'true',
    stripe: null
};

// Initialisation
document.addEventListener('DOMContentLoaded', init);

async function init() {
    try {
        state.stripe = Stripe(CONFIG.STRIPE_PUBLIC_KEY);
        setupEventListeners();
        await checkProStatus();
        
        // Vérifie si retour de paiement réussi
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('payment_success') === 'true') {
            showToast("Paiement réussi ! Vous avez maintenant accès à la version Pro.");
            state.isPro = true;
            localStorage.setItem('isPro', 'true');
            history.replaceState(null, '', window.location.pathname);
        }
    } catch (error) {
        console.error("Initialisation error:", error);
    }
}

function setupEventListeners() {
    DOM.generateBtn.addEventListener('click', handleBioGeneration);
    DOM.pdfBtn.addEventListener('click', exportToPDF);
    DOM.copyBtn.addEventListener('click', copyToClipboard);
    DOM.proBtn.addEventListener('click', showProModal);
    DOM.checkoutBtn.addEventListener('click', startCheckout);
    DOM.closeModalBtn.addEventListener('click', hideProModal);
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
    try {
        state.freeGenerations++;
        localStorage.setItem('freeGenerations', state.freeGenerations);
        
        const response = await fetch("/api/generate", {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${localStorage.getItem('pro_token') || ''}`
            },
            body: JSON.stringify({ 
                job, 
                skills, 
                tone: "professional",
                isPro: state.isPro
            })
        });

        if (response.status === 402) {
            throw new Error("Upgrade to Pro required");
        }

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Erreur lors de la génération");
        }

        const data = await response.json();
        return data.bio || data.choices?.[0]?.message?.content;
    } catch (error) {
        console.error("Generate error:", error);
        throw error;
    }
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
    DOM.bioContent.innerHTML = formatBio(bio);
    DOM.resultSection.classList.remove('hidden');
    DOM.resultSection.classList.add('fade-in');
    updateCharCount();
}

function formatBio(text) {
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-blue-600">$1</strong>')
        .replace(/\n/g, '<br>')
        .replace(/^- (.*?)$/gm, '<div class="flex items-start mb-3 pl-4"><span class="text-blue-500 mr-2">•</span><span>$1</span></div>')
        .replace(/## (.*?)\n/g, '<h3 class="text-xl font-bold mt-6 mb-3 text-gray-800">$1</h3>');
}

function updateCharCount() {
    const text = DOM.bioContent.textContent || '';
    DOM.charCount.textContent = `${text.length} caractères`;
}

// Gestion PDF
function exportToPDF() {
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const text = DOM.bioContent.textContent || '';
        
        doc.setFont("helvetica");
        doc.setFontSize(12);
        
        const lines = doc.splitTextToSize(text, 180);
        let y = 15;
        
        lines.forEach(line => {
            if (y > 280) {
                doc.addPage();
                y = 15;
            }
            doc.text(line, 15, y);
            y += 7;
        });
        
        if (!state.isPro) {
            addWatermark(doc);
        }
        
        doc.save(`bio-linkedin-${new Date().toISOString().slice(0, 10)}.pdf`);
        trackEvent('pdf_exported');
    } catch (error) {
        showError("Erreur lors de la génération du PDF: " + error.message);
    }
}

function addWatermark(doc) {
    doc.setTextColor(150);
    doc.setFontSize(10);
    doc.text("Généré avec linkedinbio.site - Passez Pro pour supprimer ce watermark", 105, 285, { align: "center" });
}

// Gestion Copie
function copyToClipboard() {
    navigator.clipboard.writeText(DOM.bioContent.textContent)
        .then(() => {
            showToast("Bio copiée dans le presse-papiers !");
            trackEvent('content_copied');
        })
        .catch(err => {
            showError("Échec de la copie : " + err);
        });
}

// Version Pro
async function checkProStatus() {
    try {
        const response = await fetch('/api/check-pro-status', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            state.isPro = data.isPro;
            localStorage.setItem('isPro', data.isPro ? 'true' : 'false');
        }
    } catch (error) {
        console.error("Pro status check failed:", error);
        state.isPro = localStorage.getItem('isPro') === 'true';
    }
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

async function startCheckout() {
    try {
        showLoadingInModal();
        
        const response = await fetch('/api/create-checkout-session', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                priceId: CONFIG.STRIPE_PRICE_ID,
                successUrl: `${window.location.origin}/?payment_success=true`,
                cancelUrl: window.location.origin,
                customerEmail: localStorage.getItem('user_email') || ''
            })
        });

        if (!response.ok) throw new Error(await response.text());

        const { id } = await response.json();
        const result = await stripe.redirectToCheckout({ sessionId: id });

        if (result.error) throw result.error;
    } catch (error) {
        showErrorInModal(error.message || "Erreur lors du paiement");
        console.error("Checkout error:", error);
    } finally {
        resetCheckoutButton();
    }
}

function showLoadingInModal() {
    DOM.checkoutBtn.innerHTML = `
        <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Traitement en cours...
    `;
    DOM.checkoutBtn.disabled = true;
}

function showErrorInModal(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'text-red-500 text-sm mt-2 text-center';
    errorDiv.textContent = message;
    DOM.checkoutBtn.parentNode.appendChild(errorDiv);
    
    setTimeout(() => errorDiv.remove(), 5000);
}

function resetCheckoutButton() {
    DOM.checkoutBtn.innerHTML = 'Commencer l\'essai gratuit (7 jours)';
    DOM.checkoutBtn.disabled = false;
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
    if (window.gtag) {
        gtag('event', action, {
            ...params,
            free_uses: state.freeGenerations,
            is_pro: state.isPro
        });
    }
    if (typeof window.va?.track === 'function') {
        window.va.track(action, params);
    }
    console.log('[Analytics]', action, params);
}