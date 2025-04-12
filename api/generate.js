import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async (req, res) => {
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

        // Vérification du statut Pro si nécessaire
        const freeUses = await getFreeUses(req); // À implémenter selon votre système
        if (!isPro && freeUses >= process.env.MAX_FREE_GENERATIONS) {
            return res.status(402).json({ 
                error: "Upgrade to Pro required",
                upgradeUrl: "/pro"
            });
        }

        // Construction du prompt amélioré
        const prompt = `En tant qu'expert LinkedIn, crée une bio premium pour un ${job} spécialisé en ${skills}.
        
**Exigences :**
- Ton: ${tone} (professionnel, moderne ou technique)
- Longueur: 150-250 mots
- Structure claire avec paragraphes distincts
- Mise en forme markdown avec **bold** et listes
- Inclure si pertinent :
  * Réalisations concrètes
  * Technologies maîtrisées
  * Valeur ajoutée unique
  * Appel à l'action

**Exemple de format :**
## [Titre accrocheur]

[Description professionnelle en 2-3 phrases]

**Expertise clé :**
- Compétence 1
- Compétence 2
- Compétence 3

[Autres sections selon pertinence]`;

        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.OPENAI_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "gpt-4", // ou "gpt-3.5-turbo" si 4 n'est pas disponible
                messages: [{
                    role: "system",
                    content: "Tu es un expert en création de bios LinkedIn professionnelles et persuasives. Utilise un style clair et structuré avec markdown."
                }, {
                    role: "user",
                    content: prompt
                }],
                temperature: 0.7,
                max_tokens: 600,
                top_p: 1,
                frequency_penalty: 0,
                presence_penalty: 0
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
};

// Fonction utilitaire pour suivre les utilisations gratuites
async function getFreeUses(req) {
    // Implémentez votre logique de suivi (DB, cookies, etc.)
    return 0; // Exemple basique
}