import Stripe from 'stripe';
import { v4 as uuidv4 } from 'uuid'; // Pour générer un requestId unique
import rateLimit from 'express-rate-limit'; // Si tu utilises Express, sinon tu peux ajuster avec un autre mécanisme si nécessaire.

// Initialisation sécurisée de Stripe avec vérification
let stripe;
try {
  stripe = process.env.STRIPE_SECRET_KEY 
    ? new Stripe(process.env.STRIPE_SECRET_KEY) 
    : null;
} catch (err) {
  console.error("Erreur d'initialisation Stripe:", err);
  stripe = null;
}

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limite à 5 requêtes par IP
  message: "Trop de requêtes, essayez à nouveau plus tard",
});

export default async function handler(req, res) {
  const requestId = uuidv4();  // Créer un ID unique pour chaque requête (utile pour debugger)
  console.log(`[RequestID: ${requestId}] Requête reçue:`, { 
    method: req.method,
    body: req.body 
  });

  // Application du rate limiting
  limiter(req, res, async () => {
    // Vérification méthode HTTP
    if (req.method !== 'POST') {
      res.setHeader('Allow', ['POST']);
      return res.status(405).json({ 
        error: 'Method not allowed',
        allowed_methods: ['POST'],
        requestId 
      });
    }

    try {
      const { job, skills } = req.body;
      
      // Validation renforcée
      if (!job?.trim() || job.length > 100) {
        return res.status(400).json({ 
          error: "Job invalide",
          details: "Doit contenir entre 1 et 100 caractères",
          received: job,
          requestId 
        });
      }

      if (!skills?.trim() || skills.length > 500) {
        return res.status(400).json({ 
          error: "Compétences invalides",
          details: "Doivent contenir entre 1 et 500 caractères",
          received: skills,
          requestId 
        });
      }

      // Vérification des clés API
      if (!process.env.OPENAI_KEY) {
        console.error(`[RequestID: ${requestId}] Configuration manquante: OPENAI_KEY`);
        return res.status(503).json({ 
          error: "Service temporairement indisponible",
          details: "Configuration serveur incomplète",
          requestId 
        });
      }

      // Construction du prompt
      const prompt = `Génère une bio LinkedIn professionnelle pour un ${job.trim()} avec ces compétences : ${skills.trim()}.`;
      console.log(`[RequestID: ${requestId}] Prompt généré:`, prompt);

      // Appel à OpenAI avec timeout
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

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
            content: "Tu es un expert en création de bios LinkedIn professionnelles. Utilise un ton moderne et valorisant."
          }, {
            role: "user",
            content: prompt
          }],
          temperature: 0.7,
          max_tokens: 500
        }),
        signal: controller.signal
      });

      clearTimeout(timeout);

      // Gestion réponse OpenAI
      if (!openaiResponse.ok) {
        const errorData = await openaiResponse.json().catch(() => ({}));
        console.error(`[RequestID: ${requestId}] Erreur OpenAI:`, {
          status: openaiResponse.status,
          error: errorData
        });
        
        return res.status(502).json({ 
          error: "Service IA indisponible",
          details: errorData.error?.message || "Erreur de communication avec l'API",
          status: openaiResponse.status,
          requestId
        });
      }

      const result = await openaiResponse.json();
      const bio = result.choices?.[0]?.message?.content;

      if (!bio?.trim()) {
        console.error(`[RequestID: ${requestId}] Réponse OpenAI inattendue:`, result);
        return res.status(500).json({ 
          error: "Format de réponse inattendu",
          details: "L'IA n'a pas retourné de contenu valide",
          requestId
        });
      }

      console.log(`[RequestID: ${requestId}] Bio générée avec succès`);
      return res.status(200).json({ 
        bio,
        tokens_used: result.usage?.total_tokens,
        requestId
      });

    } catch (error) {
      console.error(`[RequestID: ${requestId}] Erreur complète:`, {
        name: error.name,
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });

      const statusCode = error.name === 'AbortError' ? 504 : 500;
      return res.status(statusCode).json({ 
        error: error.name === 'AbortError' 
          ? "Timeout du service IA" 
          : "Erreur interne du serveur",
        details: process.env.NODE_ENV === 'development' 
          ? error.message 
          : undefined,
        requestId
      });
    }
  });
}
