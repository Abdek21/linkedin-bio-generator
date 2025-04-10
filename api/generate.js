export default async (req, res) => {
    // Vérification de la clé API
    if (!process.env.OPENAI_KEY) {
        console.error("Erreur: OPENAI_KEY non définie");
        return res.status(500).json({ 
            error: "Configuration serveur invalide",
            details: "La clé API OpenAI n'est pas configurée"
        });
    }

    try {
        const { job, skills, tone = "professionnel" } = req.body;
        
        // Validation des entrées
        if (!job || !skills) {
            return res.status(400).json({ 
                error: "Paramètres manquants",
                details: "Les champs 'job' et 'skills' sont requis"
            });
        }

        // Construction du prompt
        const prompt = `Tu es un expert en rédaction de profils LinkedIn. 
Crée 3 versions de bio pour un ${job} spécialisé en ${skills} :
1. Version professionnelle (ton formel)
2. Version créative (ton moderne avec emojis)
3. Version technique (focus compétences)

Chaque version doit faire 80-100 mots maximum.`;

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
                    content: "Tu es un assistant qui crée des bios LinkedIn percutantes."
                }, {
                    role: "user",
                    content: prompt
                }],
                temperature: 0.7,
                max_tokens: 500,
                top_p: 1,
                frequency_penalty: 0,
                presence_penalty: 0
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("Erreur OpenAI:", data);
            return res.status(500).json({ 
                error: "Erreur OpenAI",
                details: data.error?.message || "Erreur inconnue de l'API"
            });
        }

        res.status(200).json(data);

    } catch (error) {
        console.error("Erreur API:", error);
        res.status(500).json({ 
            error: "Erreur interne du serveur",
            details: error.message 
        });
    }
};