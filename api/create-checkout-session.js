// Charger dotenv si nécessaire (utile uniquement en développement local)
require('dotenv').config();
console.log("Stripe secret key:", process.env.STRIPE_SECRET_KEY); // Log pour vérifier
// Importation de Stripe
const { Stripe } = require('stripe');

// Créer une instance de Stripe avec la clé API stockée dans les variables d'environnement
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY); // Utilisation de la variable d'environnement

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
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    // Création d'une session Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'], // Méthodes de paiement acceptées
      line_items: [{
        price: priceId, // Utiliser le prix transmis dans la requête
        quantity: 1, // Quantité de l'article
      }],
      mode: 'payment', // Mode de paiement (pas d'abonnement)
      success_url: successUrl, // URL de succès
      cancel_url: cancelUrl, // URL d'annulation
    });

    // Retourner l'ID de la session Stripe en réponse
    res.status(200).json({ id: session.id });
  } catch (err) {
    // Gestion des erreurs
    console.error('Erreur Stripe:', err);
    res.status(500).json({
      error: 'Erreur interne du serveur',
      details: err.message, // Afficher le message d'erreur pour faciliter le débogage
    });
  }
};
