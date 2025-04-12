import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Vérification de la clé API
    if (!process.env.OPENAI_KEY) {
        return res.status(500).json({ 
            error: "Configuration serveur invalide",
            details: "La clé API OpenAI n'est pas configurée"
        });
    }

    try {
        const { job, skills, tone = "professional", isPro = false } = req.body;
        
        // Validation des entrées
        if (!job || !skills) {
            return res.status(400).json({ 
                error: "Paramètres manquants",
                details: "Les champs 'job' et 'skills' sont requis"
            });
        }

        // Construction du prompt
        const prompt = `Crée une bio LinkedIn professionnelle pour un ${job} avec ces compétences: ${skills}.
        Ton: ${tone}
        Format: Markdown avec sections claires`;

        const response = await fetch("https://api.openai.com/v1/chat/completions", {
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
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("Erreur OpenAI:", errorData);
            return res.status(500).json({ 
                error: "Erreur OpenAI",
                details: errorData.error?.message
            });
        }

        const data = await response.json();
        const bioContent = data.choices[0].message.content;

        res.status(200).json({
            bio: bioContent,
            isPro: isPro
        });

    } catch (error) {
        console.error("Erreur API:", error);
        res.status(500).json({ 
            error: "Erreur interne du serveur",
            details: error.message 
        });
    }
}