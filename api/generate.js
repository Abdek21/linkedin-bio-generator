import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.setHeader('Allow', ['POST']).status(405).json({ 
            error: 'Method not allowed' 
        });
    }

    // Vérification des dépendances
    if (!process.env.OPENAI_KEY) {
        return res.status(500).json({ 
            error: "Configuration manquante",
            details: "Clé OpenAI non configurée"
        });
    }

    try {
        // Validation des entrées
        const { job, skills, tone = "professional" } = req.body;
        
        if (!job || !skills) {
            return res.status(400).json({ 
                error: "Paramètres requis manquants",
                details: "Les champs 'job' et 'skills' sont obligatoires"
            });
        }

        // Appel à OpenAI avec gestion d'erreur améliorée
        const prompt = `Génère une bio LinkedIn pour un ${job} avec comme compétences: ${skills}. Ton: ${tone}`;
        
        const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.OPENAI_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "gpt-3.5-turbo",
                messages: [{
                    role: "system",
                    content: "Tu es un assistant expert en création de profils LinkedIn."
                }, {
                    role: "user",
                    content: prompt
                }],
                temperature: 0.7,
                max_tokens: 500
            }),
            timeout: 10000 // 10 secondes
        });

        if (!openaiResponse.ok) {
            const errorData = await openaiResponse.json();
            console.error("Erreur OpenAI:", errorData);
            return res.status(502).json({ 
                error: "Erreur du service IA",
                details: errorData.error?.message || "Erreur inconnue de l'API OpenAI"
            });
        }

        const result = await openaiResponse.json();
        const bio = result.choices[0]?.message?.content;

        if (!bio) {
            return res.status(500).json({
                error: "Réponse vide de l'IA",
                details: "Aucun contenu généré"
            });
        }

        return res.status(200).json({ bio });

    } catch (error) {
        console.error("Erreur API generate:", error);
        return res.status(500).json({
            error: "Erreur interne du serveur",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}