import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
    console.log("Requête reçue:", req.body); // Log des données reçues
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { job, skills } = req.body;
        
        // Validation renforcée
        if (!job || typeof job !== 'string' || job.length > 100) {
            return res.status(400).json({ 
                error: "Job invalide",
                details: "Doit être une chaîne de 1-100 caractères"
            });
        }

        if (!skills || typeof skills !== 'string' || skills.length > 500) {
            return res.status(400).json({ 
                error: "Compétences invalides",
                details: "Doivent être une chaîne de 1-500 caractères"
            });
        }

        // Vérification cruciale de la clé OpenAI
        if (!process.env.OPENAI_KEY) {
            console.error("OPENAI_KEY manquante dans les variables d'environnement");
            return res.status(500).json({ 
                error: "Configuration serveur incomplète",
                details: "Clé API manquante"
            });
        }

        // Appel à OpenAI avec timeout
        const prompt = `Génère une bio LinkedIn pour un ${job} avec ces compétences: ${skills}.`;
        console.log("Prompt envoyé à OpenAI:", prompt);

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
                    content: "Tu es un expert en création de bios LinkedIn professionnelles."
                }, {
                    role: "user",
                    content: prompt
                }],
                temperature: 0.7,
                max_tokens: 500
            }),
            timeout: 10000
        });

        if (!openaiResponse.ok) {
            const errorData = await openaiResponse.json();
            console.error("Erreur OpenAI:", errorData);
            return res.status(502).json({ 
                error: "Service IA indisponible",
                details: errorData.error?.message || "Erreur inconnue de l'API"
            });
        }

        const result = await openaiResponse.json();
        console.log("Réponse OpenAI:", result); // Log complet de la réponse

        const bio = result.choices?.[0]?.message?.content;
        if (!bio) {
            return res.status(500).json({ 
                error: "Réponse vide de l'IA",
                details: "Aucun contenu généré"
            });
        }

        return res.status(200).json({ bio });

    } catch (error) {
        console.error("Erreur serveur complète:", error);
        return res.status(500).json({ 
            error: "Erreur interne",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}