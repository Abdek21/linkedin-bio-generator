// Configuration
const CONFIG = {
    MAX_FREE_GENERATIONS: 3,
    PRO_PRICE: 5,
    ANALYTICS_ID: 'G-7GRH1XFH9W',
    STRIPE_PUBLIC_KEY: 'pk_test_votre_clé_publique_stripe',
    PRICE_ID: 'votre_price_id_stripe'
};

// Initialisez Stripe
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
    freeGenerations: localStorage.getItem('freeGenerations') || 0,
    isPro: localStorage.getItem('isPro') === 'true'
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
    
    // Simulation de génération - remplacez par votre appel API réel
    return new Promise((resolve) => {
        setTimeout(() => {
            const bios = [
                `**${job} spécialisé en ${skills}**\n\n` +
                "- Passionné par l'innovation et la création de solutions techniques\n" +
                "- Expérience dans le développement d'applications web et mobiles\n" +
                "- Expertise en architecture logicielle et bonnes pratiques de code",
                
                `🚀 ${job} | ${skills.split(',').join(' | ')}\n\n` +
                "🔹 Création d'applications performantes et évolutives\n" +
                "🔹 Collaboration avec des équipes pluridisciplinaires\n" +
                "🔹 Recherche constante d'amélioration et d'optimisation",
                
                `Technologies maîtrisées : ${skills}\n\n` +
                "- Conception et développement d'architectures logicielles\n" +
                "- Mise en place de bonnes pratiques et standards de codage\n" +
                "- Optimisation des performances et résolution de problèmes complexes"
            ];
            
            resolve(bios[Math.floor(Math.random() * bios.length)]);
        }, 1000);
    });
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
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>')
        .replace(/^- (.*?)$/gm, '<div class="flex items-start mb-2"><span class="text-blue-500 mr-2">•</span><span>$1</span></div>');
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
        
        // Utilisez textContent pour mieux préserver les sauts de ligne
        const text = DOM.bioContent.textContent || '';
        
        // Configurez la police pour supporter les caractères spéciaux
        doc.setFont("helvetica");
        doc.setFontSize(12);
        
        // Utilisez splitTextToSize pour gérer les sauts de ligne
        const lines = doc.splitTextToSize(text, 180);
        
        // Ajoutez le texte ligne par ligne
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
function checkProStatus() {
    // Dans une vraie application, vérifiez via une API
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

async function startCheckout() {
    try {
        showLoadingInModal();
        
        // En production, utilisez votre endpoint backend
        const session = await createCheckoutSession();
        
        // Redirigez vers Stripe
        const result = await stripe.redirectToCheckout({
            sessionId: session.id
        });
        
        if (result.error) {
            showErrorInModal(result.error.message);
        }
        
    } catch (error) {
        showErrorInModal("Erreur lors du paiement: " + error.message);
        trackEvent('checkout_error', { error: error.message });
    }
}

// Simulation de création de session - remplacez par un appel à votre backend
async function createCheckoutSession() {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({ id: 'simulated_session_id_' + Math.random().toString(36).substring(2) });
        }, 500);
    });
}

function showLoadingInModal() {
    DOM.checkoutBtn.innerHTML = `
        <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Traitement en cours...
    `;
    DOM.checkoutBtn.disabled = true;
}

function showErrorInModal(message) {
    const errorElement = document.createElement('div');
    errorElement.className = 'text-red-500 text-sm mt-2';
    errorElement.textContent = message;
    DOM.checkoutBtn.parentNode.appendChild(errorElement);
    
    setTimeout(() => {
        errorElement.remove();
        resetCheckoutButton();
    }, 5000);
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
    // Google Analytics
    if (window.gtag) {
        gtag('event', action, {
            ...params,
            free_uses: state.freeGenerations,
            is_pro: state.isPro
        });
    }
    
    // Vercel Analytics
    if (typeof window.va !== 'undefined' && typeof window.va.track === 'function') {
        window.va.track(action, params);
    }
    
    console.log('[Analytics]', action, params);
}