// Configuration avec vos clés Stripe
const CONFIG = {
    MAX_FREE_GENERATIONS: 3,
    PRO_PRICE: 5,
    ANALYTICS_ID: 'G-7GRH1XFH9W',
    STRIPE_PUBLIC_KEY: 'pk_test_51RBtzaR7rjIx88O1hAXt7EJla6Ri8fiODE467lE90STOFOEZuYPLSgJ8NY4lUg2NPBKBDfaRnojpTRezoGub7GGa00tqv7mUgk',
    STRIPE_PRICE_ID: 'price_1RBvioR7rjIx88O162hbGlvC'
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
    freeGenerations: parseInt(localStorage.getItem('freeGenerations')) || 0,
    isPro: localStorage.getItem('isPro') === 'true',
    stripe: null,
    adBlockDetected: false
};

// Initialisation
document.addEventListener('DOMContentLoaded', init);

async function init() {
    // Détection AdBlock avant toute initialisation
    state.adBlockDetected = await detectAdBlock();
    if (state.adBlockDetected) {
        showAdblockWarning();
        return;
    }

    try {
        // Initialisation Stripe
        state.stripe = Stripe(CONFIG.STRIPE_PUBLIC_KEY);
        
        setupEventListeners();
        
   
        
        // Gestion retour de paiement
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('payment_success') === 'true') {
            showToast("Paiement réussi ! Accès Pro activé.");
            state.isPro = true;
            localStorage.setItem('isPro', 'true');
            history.replaceState(null, '', window.location.pathname);
        }
    } catch (error) {
        console.error("Erreur initialisation:", error);
        showError("Erreur lors du chargement de l'application");
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

// Détection AdBlock améliorée
async function detectAdBlock() {
    try {
        const testUrl = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';
        const response = await fetch(testUrl, {
            method: 'HEAD',
            mode: 'no-cors',
            cache: 'no-store'
        });
        return false;
    } catch (e) {
        console.log("AdBlock détecté");
        return true;
    }
}

function showAdblockWarning() {
    const warning = document.createElement('div');
    warning.innerHTML = `
    <div class="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[9999] p-4">
        <div class="bg-white rounded-xl p-6 max-w-md w-full animate-bounce">
            <div class="text-center">
                <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                    <svg class="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                    </svg>
                </div>
                <h3 class="text-lg font-medium text-gray-900 mb-2">Blocage détecté</h3>
                <div class="text-sm text-gray-500 mb-6">
                    <p class="mb-3">Votre bloqueur de publicités empêche le système de paiement de fonctionner.</p>
                    <ol class="list-decimal list-inside space-y-1 text-left">
                        <li>Cliquez sur l'icône <span class="bg-gray-200 px-1 rounded">🛡️</span> dans votre navigateur</li>
                        <li>Sélectionnez "Désactiver pour ce site"</li>
                        <li>Actualisez la page (F5)</li>
                    </ol>
                </div>
                <div class="px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                    <button type="button" onclick="location.reload()" class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm">
                        J'ai désactivé le bloqueur
                    </button>
                </div>
            </div>
        </div>
    </div>`;
    document.body.appendChild(warning);
}

// Gestion de la génération de bio
async function handleBioGeneration() {
    if (state.adBlockDetected) {
        showAdblockWarning();
        return;
    }

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
        console.error("Erreur génération:", error);
        showError(error.message);
        trackEvent('generation_error', { error: error.message });
    }
}
async function generateBio(job, skills) {
    // Validation des entrées côté client
    if (!job?.trim() || !skills?.trim()) {
        throw new Error("Le métier et les compétences sont requis");
    }

    try {
        // Mise à jour du compteur de générations
        state.freeGenerations = (state.freeGenerations || 0) + 1;
        localStorage.setItem('freeGenerations', state.freeGenerations);

        // Configuration de la requête avec timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

        const requestBody = {
            job: job.trim(),
            skills: skills.trim(),
            tone: "professional",
            isPro: state.isPro
        };

        const response = await fetch("/api/generate", {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${localStorage.getItem('pro_token') || ''}`
            },
            body: JSON.stringify(requestBody),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        // Gestion des codes HTTP spécifiques
        if (response.status === 402) {
            trackEvent('pro_required');
            throw new Error("Passez à la version Pro pour plus de générations");
        }

        if (response.status === 429) {
            throw new Error("Trop de requêtes - Veuillez réessayer plus tard");
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            const errorMessage = errorData?.error || 
                               errorData?.message || 
                               `Erreur serveur (${response.status})`;
            throw new Error(errorMessage);
        }

        const data = await response.json();

        // Extraction flexible de la réponse
        const bio = data.bio || 
                   data.choices?.[0]?.message?.content || 
                   data.result?.text;

        if (!bio) {
            throw new Error("Réponse inattendue du serveur");
        }

        trackEvent('bio_generated_success');
        return bio;

    } catch (error) {
        console.error("Erreur de génération:", error);
        
        // Messages d'erreur plus clairs
        let userMessage = error.message;
        if (error.name === 'AbortError') {
            userMessage = "La requête a pris trop de temps - Réessayez";
        }

        trackEvent('generation_failed', {
            error: userMessage,
            jobLength: job?.length || 0,
            skillsCount: skills?.split(',').length || 0
        });

        throw new Error(userMessage);
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
    if (!state.stripe) {
        showErrorInModal("Le système de paiement n'est pas disponible");
        return;
    }
    DOM.proModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    trackEvent('pro_modal_opened');
}

function hideProModal() {
    DOM.proModal.classList.add('hidden');
    document.body.style.overflow = '';
}

async function startCheckout() {
    if (state.adBlockDetected) {
        showErrorInModal("Désactivez votre bloqueur de publicités pour procéder au paiement");
        return;
    }

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
        const result = await state.stripe.redirectToCheckout({ sessionId: id });

        if (result.error) throw result.error;
    } catch (error) {
        console.error("Checkout error:", error);
        showErrorInModal(error.message || "Erreur lors du paiement");
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

// Analytics simplifiés pour éviter les blocages
function trackEvent(action, params = {}) {
    if (window.gtag) {
        gtag('event', action, {
            ...params,
            free_uses: state.freeGenerations,
            is_pro: state.isPro
        });
    }
    console.log('[Analytics]', action, params);
}