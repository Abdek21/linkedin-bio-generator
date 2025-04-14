const CONFIG = {
    MAX_FREE_GENERATIONS: 3,
    PRO_PRICE: 5,
    ANALYTICS_ID: 'G-7GRH1XFH9W',
    STRIPE_PUBLIC_KEY: 'pk_live_51RBtzaR7rjIx88O1hAXt7EJla6Ri8fiODE467lE90STOFOEZuYPLSgJ8NY4lUg2NPBKBDfaRnojpTRezoGub7GGa00tqv7mUgk',
    STRIPE_PRICE_ID: 'price_1RBvioR7rjIx88O162hbGlvC'
};

// DOM elements
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

document.addEventListener('DOMContentLoaded', init);

async function init() {
    // Initialisation de Stripe et vérification de l'état de l'utilisateur
    try {
        state.stripe = Stripe(CONFIG.STRIPE_PUBLIC_KEY);
        setupEventListeners();
        
        if (state.freeGenerations >= CONFIG.MAX_FREE_GENERATIONS && !state.isPro) {
            DOM.proCta.classList.remove('hidden');
        }

        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('payment_success') === 'true') {
            showToast("Paiement réussi ! Accès Pro activé.");
            state.isPro = true;
            localStorage.setItem('isPro', 'true');
            history.replaceState(null, '', window.location.pathname);
        }
    } catch (error) {
        showError("Erreur lors de l'initialisation de l'application : " + error.message);
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

async function handleBioGeneration() {
    const job = DOM.jobInput.value.trim();
    const skills = DOM.skillsInput.value.trim();

    if (!job || !skills) {
        showError("Veuillez remplir tous les champs.");
        return;
    }

    // Afficher le message de chargement
    showLoading();

    try {
        const bio = await generateBio(job, skills);
        showResult(bio);
        
        // Vérification pour l'offre Pro
        checkForProOffer();
    } catch (error) {
        showError(error.message);
    }
}

async function generateBio(job, skills) {
    try {
        // Configuration de la requête
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // Timeout de 15s

        const response = await fetch("/api/generate", {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${localStorage.getItem('pro_token') || ''}`
            },
            body: JSON.stringify({ job, skills, tone: "professional", isPro: state.isPro }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.status === 402) {
            throw new Error("Passez à la version Pro pour plus de générations.");
        }
        if (response.status === 429) {
            throw new Error("Trop de requêtes - Réessayez plus tard.");
        }
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData?.error || `Erreur serveur (${response.status})`);
        }

        const data = await response.json();
        const bio = data.bio || data.choices?.[0]?.message?.content || data.result?.text;

        if (!bio) throw new Error("Réponse inattendue du serveur.");
        return bio;
    } catch (error) {
        console.error("Erreur de génération:", error);
        throw new Error(error.message || "Erreur lors de la génération de la bio.");
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
    } catch (error) {
        showError("Erreur lors de la génération du PDF : " + error.message);
    }
}

function addWatermark(doc) {
    doc.setTextColor(150);
    doc.setFontSize(10);
    doc.text("Généré avec linkedinbio.site - Passez Pro pour supprimer ce watermark", 105, 285, { align: "center" });
}

// Fonction pour vérifier si l'utilisateur a atteint la limite d'utilisation gratuite et proposer la version Pro
function checkForProOffer() {
    if (state.freeGenerations >= CONFIG.MAX_FREE_GENERATIONS && !state.isPro) {
        DOM.proCta.classList.remove('hidden');
    }
}
