export default async (req, res) => {
    try {
        const { job, skills } = req.body;
        
        if (!job || !skills) {
            return res.status(400).json({ error: "Paramètres manquants" });
        }

        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.OPENAI_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "gpt-3.5-turbo",
                temperature: 0.7,
                max_tokens: 150,
                messages: [{
                    role: "user",
                    content: `Génère 3 versions concises de bio LinkedIn pour un ${job} expert en ${skills}. 
                              Formats: 1) Professionnel 2) Créatif 3) Technique. 
                              Utilise des emojis pertinents. Maximum 100 mots par version.`
                }]
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || "Erreur API OpenAI");
        }

        const data = await response.json();
        res.status(200).json(data);

    } catch (error) {
        console.error("Erreur API:", error);
        res.status(500).json({ 
            error: "Échec de la génération",
            details: error.message 
        });
    }
};