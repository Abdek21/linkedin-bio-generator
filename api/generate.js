export default async (req, res) => {
    const { job, skills } = req.body;
    
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${process.env.OPENAI_KEY}`, // Clé sécurisée
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model: "gpt-3.5-turbo",
            max_tokens: 100,
            messages: [{
                role: "user",
                content: `Génère 3 versions de bio LinkedIn pour un ${job} expert en ${skills}. Styles : Professionnel, Créatif, Technique. Inclus des emojis.`
            }]
        })
    });
    
    const data = await response.json();
    res.status(200).json(data);
};