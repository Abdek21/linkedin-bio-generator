// Chargement conditionnel de dotenv (uniquement en développement local)
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

// Debug avancé
console.log("Mode:", process.env.NODE_ENV || 'development');
console.log("Stripe key loaded:", !!process.env.STRIPE_KEY_TEST);

// Importation de Stripe
const Stripe = require('stripe').Stripe;

// Vérification de la clé Stripe
if (!process.env.STRIPE_KEY_TEST) {
  throw new Error("STRIPE_KEY_TEST manquante - Configurez la variable d'environnement");
}

const stripe = new Stripe(process.env.STRIPE_KEY_TEST);

// Fonction handler pour traiter les requêtes
module.exports = async function handler(req, res) {
  // Vérification que la méthode de la requête est bien POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Récupération des paramètres du corps de la requête
  const { priceId, successUrl, cancelUrl } = req.body;

  // Validation des paramètres
  if (!priceId || !successUrl || !cancelUrl) {
    return res.status(400).json({ 
      error: 'Missing required parameters',
      required: ['priceId', 'successUrl', 'cancelUrl']
    });
  }

  try {
    console.log(`Creating checkout session for price: ${priceId}`);
    
    // Création d'une session Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price: priceId,
        quantity: 1,
      }],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    console.log(`Session created: ${session.id}`);

    return res.status(200).json({ 
      id: session.id,
      url: session.url // Optionnel: renvoyer aussi l'URL de checkout
    });

  } catch (err) {
    console.error('Erreur Stripe détaillée:', {
      message: err.message,
      type: err.type,
      stack: err.stack
    });

    return res.status(500).json({
      error: 'Erreur lors de la création de la session Stripe',
      details: {
        type: err.type,
        message: err.message
      }
    });
  }
};