// Config
const MAX_FREE_GENERATIONS = 3;
let freeGenerations = localStorage.getItem('freeGenerations') || 0;
import { Analytics } from "@vercel/analytics/react"
// Track events
function trackEvent(action, params = {}) {
    gtag('event', action, {
        ...params,
        free_uses: freeGenerations,
        page_location: window.location.href
    });
}

// Generate Bio
async function generateBio() {
    const job = document.getElementById("job").value.trim();
    const skills = document.getElementById("skills").value.trim();

    if (!job || !skills) {
        showError("Veuillez remplir tous les champs");
        return;
    }

    try {
        // Show loading
        document.getElementById("bio-content").innerHTML = `
            <div class="flex justify-center items-center py-8">
                <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>`;
        document.getElementById("result").classList.remove("hidden");

        // Track generation
        freeGenerations++;
        localStorage.setItem('freeGenerations', freeGenerations);
        trackEvent('generate_bio', { job_type: job.toLowerCase() });

        const response = await fetch("/api/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ job, skills })
        });

        if (!response.ok) throw new Error(`Erreur HTTP: ${response.status}`);
        
        const data = await response.json();
        if (!data?.choices?.[0]?.message?.content) throw new Error("Réponse API invalide");

        document.getElementById("bio-content").innerHTML = formatBio(data.choices[0].message.content);
        
        // Show Pro CTA after 3 uses
        if (freeGenerations >= MAX_FREE_GENERATIONS) {
            document.getElementById('pro-cta').classList.remove('hidden');
            trackEvent('show_pro_offer');
        }

    } catch (error) {
        console.error("Erreur:", error);
        showError(error.message);
        trackEvent('error', { error: error.message });
    }
}

// PDF Export with watermark
function exportToPDF() {
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const text = document.getElementById("bio-content").innerText;
        
        doc.setFont("helvetica");
        doc.text(text, 15, 15, { maxWidth: 180 });
        
        // Add watermark for free version
        if (freeGenerations >= MAX_FREE_GENERATIONS) {
            doc.setTextColor(150);
            doc.setFontSize(10);
            doc.text("Généré avec linkedinbio.site - Version Pro disponible", 105, 285, { align: "center" });
        }
        
        doc.save("bio-linkedin.pdf");
        trackEvent('download_pdf');

    } catch (error) {
        showError("Erreur lors de la génération du PDF");
        trackEvent('pdf_error', { error: error.message });
    }
}

// Pro Version Functions
function showProModal() {
    document.getElementById('pro-modal').classList.remove('hidden');
    trackEvent('view_pro_modal');
}

function hideProModal() {
    document.getElementById('pro-modal').classList.add('hidden');
}

function startCheckout() {
    window.open('https://checkout.stripe.com/...', '_blank');
    trackEvent('begin_checkout');
}

// Helper functions
function formatBio(text) {
    return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
              .replace(/\n/g, '<br>')
              .replace(/^- (.*?)$/gm, '• $1');
}

function copyToClipboard() {
    navigator.clipboard.writeText(document.getElementById("bio-content").innerText)
        .then(() => {
            alert("Bio copiée !");
            trackEvent('copy_to_clipboard');
        })
        .catch(err => showError("Erreur de copie : " + err));
}

function showError(message) {
    document.getElementById("bio-content").innerHTML = `
        <div class="bg-red-50 border-l-4 border-red-500 p-4">
            <div class="flex">
                <div class="flex-shrink-0 text-red-500">⚠️</div>
                <div class="ml-3">
                    <p class="text-sm text-red-700">${message}</p>
                </div>
            </div>
        </div>`;
}

