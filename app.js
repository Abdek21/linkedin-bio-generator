// Configuration
const LOADING_HTML = `
<div class="flex justify-center items-center py-8">
    <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
</div>
`;

// Génère la bio
async function generateBio() {
    const job = document.getElementById("job").value.trim();
    const skills = document.getElementById("skills").value.trim();

    if (!job || !skills) {
        showError("Veuillez remplir tous les champs");
        return;
    }

    try {
        // Afficher le loading
        document.getElementById("bio-content").innerHTML = LOADING_HTML;
        document.getElementById("result").classList.remove("hidden");

        const response = await fetch("/api/generate", {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ 
                job, 
                skills,
                tone: "professionnel" // Peut être modifié plus tard
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Erreur HTTP: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data?.choices?.[0]?.message?.content) {
            throw new Error("Format de réponse inattendu de l'API");
        }

        const bioContent = formatBio(data.choices[0].message.content);
        document.getElementById("bio-content").innerHTML = bioContent;

    } catch (error) {
        console.error("Erreur:", error);
        showError(error.message);
    }
}

// Formate la bio avec un meilleur rendu
function formatBio(bioText) {
    // Convertit les ** en strong et les retours à la ligne en <br>
    return bioText
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>')
        .replace(/- (.*?)(<br>|$)/g, '• $1$2');
}

// Export PDF
function exportToPDF() {
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        const bioText = document.getElementById("bio-content").innerText;
        
        // Style du PDF
        doc.setFont("helvetica");
        doc.setFontSize(12);
        doc.text(bioText, 15, 15, { maxWidth: 180 });
        
        // Ajout du footer
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text("Généré avec linkedinbio.site", 105, 285, { align: "center" });
        
        doc.save("ma-bio-linkedin.pdf");
    } catch (error) {
        console.error("Erreur PDF:", error);
        showError("Erreur lors de la génération du PDF");
    }
}

// Copie dans le presse-papier
function copyToClipboard() {
    const bioText = document.getElementById("bio-content").innerText;
    navigator.clipboard.writeText(bioText)
        .then(() => alert("Bio copiée dans le presse-papier !"))
        .catch(err => showError("Échec de la copie : " + err));
}

// Affiche les erreurs
function showError(message) {
    document.getElementById("bio-content").innerHTML = `
        <div class="bg-red-50 border-l-4 border-red-500 p-4">
            <div class="flex">
                <div class="flex-shrink-0">
                    <svg class="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                    </svg>
                </div>
                <div class="ml-3">
                    <p class="text-sm text-red-700">${message}</p>
                </div>
            </div>
        </div>
    `;
    document.getElementById("result").classList.remove("hidden");
}