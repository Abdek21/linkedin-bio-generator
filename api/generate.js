import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Méthode non autorisée' });
    }

    try {
        const { job, skills } = req.body;

        // Validation des entrées
        if (!job || !skills) {
            return res.status(400).json({ 
                error: "Champs manquants",
                details: "Les champs 'job' et 'skills' sont requis"
            });
        }

        // Vérification de la clé OpenAI
        if (!process.env.OPENAI_KEY) {
            return res.status(500).json({ 
                error: "Configuration serveur invalide",
                details: "Clé OpenAI manquante"
            });
        }

        // Appel à l'API OpenAI
        const prompt = `Crée une bio LinkedIn pour un ${job} avec comme compétences : ${skills}.`;
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
                    content: "Tu es un expert en création de bios LinkedIn."
                }, {
                    role: "user",
                    content: prompt
                }],
                temperature: 0.7,
                max_tokens: 500
            })
        });

        if (!openaiResponse.ok) {
            const errorData = await openaiResponse.json();
            console.error("Erreur OpenAI:", errorData);
            return res.status(502).json({ 
                error: "Erreur de l'API OpenAI",
                details: errorData.error?.message || "Erreur inconnue"
            });
        }

        const result = await openaiResponse.json();
        const bio = result.choices[0]?.message?.content;

        if (!bio) {
            return res.status(500).json({ 
                error: "Aucun contenu généré",
                details: "L'API OpenAI n'a pas renvoyé de bio"
            });
        }

        return res.status(200).json({ bio });

    } catch (error) {
        console.error("Erreur serveur:", error);
        return res.status(500).json({ 
            error: "Erreur interne du serveur",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}