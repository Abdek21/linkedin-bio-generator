const { Stripe } = require('stripe'); // Assure-toi d'utiliser 'Stripe' et non 'stripe' dans v18
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { priceId, successUrl, cancelUrl } = req.body;

  // Validation des paramètres
  if (!priceId || !successUrl || !cancelUrl) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    // Création d'une session Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          product_data: {
            name: 'Test Product',
            description: 'Test product description',
          },
          unit_amount: 2000, // Exemple de montant en cents
          currency: 'usd',
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    // Retourner l'ID de la session Stripe
    res.status(200).json({ id: session.id });
  } catch (err) {
    // Gérer les erreurs avec un message plus détaillé
    console.error('Erreur Stripe:', err.message);
    res.status(500).json({ error: 'Erreur interne du serveur', details: err.message });
  }
};
