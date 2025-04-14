import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { priceId, successUrl, cancelUrl } = req.body;

  // Validation simple des paramètres
  if (!priceId || !successUrl || !cancelUrl) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    // Création d'une session Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price: priceId,
        quantity: 1,
      }],
      mode: 'payment', // Mode de paiement direct (pas abonnement)
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    res.status(200).json({ id: session.id });
  } catch (err) {
    console.error('Erreur Stripe:', err);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
}
