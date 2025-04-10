
// Génère la bio
async function generateBio() {
    const job = document.getElementById("job").value;
    const skills = document.getElementById("skills").value;

    const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job, skills })
    });
    
    const data = await response.json();
    document.getElementById("bio-content").innerHTML = data.choices[0].message.content.replace(/\n/g, "<br>");
    document.getElementById("result").classList.remove("hidden");
}
// Export PDF (version Pro)
function exportToPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    const bioText = document.getElementById("bio-content").innerText;
    doc.text(bioText, 10, 10);
    doc.save("ma-bio-linkedin.pdf");
}