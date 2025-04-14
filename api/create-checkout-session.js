import Stripe from 'stripe';

// Toujours vérifier que la clé est présente
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  throw new Error('STRIPE_SECRET_KEY is not defined');
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2023-10-16', // Assure-toi d'utiliser l'apiVersion de Stripe
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { priceId, successUrl, cancelUrl } = req.body;

  if (!priceId || !successUrl || !cancelUrl) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    return res.status(200).json({ id: session.id, url: session.url }); // <-- ajoute l'URL de session
  } catch (err) {
    console.error('Erreur Stripe:', err.message);
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
}
