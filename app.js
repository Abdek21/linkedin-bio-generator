async function generateBio() {
    const job = document.getElementById("job").value;
    const skills = document.getElementById("skills").value;

    if (!job || !skills) {
        alert("Veuillez remplir tous les champs !");
        return;
    }

    try {
        const response = await fetch("/api/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ job, skills })
        });

        if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status}`);
        }

        const data = await response.json();
        
        // Debug: Affiche la réponse complète
        console.log("Réponse API:", data);

        // Vérification approfondie de la structure
        if (!data?.choices?.[0]?.message?.content) {
            throw new Error("Format de réponse inattendu de l'API");
        }

        const bioContent = data.choices[0].message.content;
        document.getElementById("bio-content").innerHTML = bioContent.replace(/\n/g, "<br>");
        document.getElementById("result").classList.remove("hidden");

    } catch (error) {
        console.error("Erreur:", error);
        document.getElementById("bio-content").innerHTML = `
            <div class="text-red-500">
                Erreur: ${error.message}<br>
                Veuillez réessayer ou contacter le support.
            </div>
        `;
        document.getElementById("result").classList.remove("hidden");
    }
}

// Export PDF (version Pro)
function exportToPDF() {
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        const bioText = document.getElementById("bio-content").innerText;
        doc.text(bioText, 10, 10);
        doc.save("ma-bio-linkedin.pdf");
    } catch (error) {
        console.error("Erreur PDF:", error);
        alert("Erreur lors de la génération du PDF");
    }
}