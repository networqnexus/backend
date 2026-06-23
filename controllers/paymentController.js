const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const User   = require("../models/User");

// POST /api/payments/create-checkout
exports.createCheckout = async (req, res) => {
  try {
    const { plan } = req.body; // "monthly" | "yearly"
    const user = await User.findById(req.user.id);

    const priceId = plan === "yearly"
      ? process.env.STRIPE_PRICE_YEARLY
      : process.env.STRIPE_PRICE_MONTHLY;

    if (!priceId) return res.status(400).json({ success: false, message: "Stripe price not configured" });

    // Create or reuse Stripe customer
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: user.email, name: user.name, metadata: { userId: user._id.toString() } });
      customerId = customer.id;
      user.stripeCustomerId = customerId;
      await user.save();
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${process.env.FRONTEND_URL}/premium/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${process.env.FRONTEND_URL}/premium`,
      metadata: { userId: user._id.toString() },
    });

    res.json({ success: true, url: session.url });
  } catch(e) {
    console.error("Stripe checkout error:", e.message);
    res.status(500).json({ success: false, message: e.message || "Payment setup failed" });
  }
};

// POST /api/payments/webhook  (raw body required)
exports.webhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch(e) {
    return res.status(400).send(`Webhook Error: ${e.message}`);
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const userId  = session.metadata?.userId;
      if (userId) {
        const sub = await stripe.subscriptions.retrieve(session.subscription);
        const expiresAt = new Date(sub.current_period_end * 1000);
        await User.findByIdAndUpdate(userId, {
          isPremium: true,
          premiumExpiresAt: expiresAt,
          stripeSubId: session.subscription,
        });
      }
    }

    if (event.type === "customer.subscription.deleted" || event.type === "customer.subscription.updated") {
      const sub = event.data.object;
      const user = await User.findOne({ stripeSubId: sub.id });
      if (user) {
        const active = sub.status === "active" || sub.status === "trialing";
        user.isPremium        = active;
        user.premiumExpiresAt = active ? new Date(sub.current_period_end * 1000) : null;
        await user.save();
      }
    }
  } catch(e) {
    console.error("Webhook handler error:", e.message);
  }

  res.json({ received: true });
};

// POST /api/payments/cancel
exports.cancelSubscription = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user.stripeSubId) return res.status(400).json({ success: false, message: "No active subscription" });

    await stripe.subscriptions.update(user.stripeSubId, { cancel_at_period_end: true });
    res.json({ success: true, message: "Subscription will cancel at period end" });
  } catch(e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// GET /api/payments/status
exports.getStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("isPremium premiumExpiresAt stripeSubId");
    let subDetails = null;
    if (user.stripeSubId) {
      try {
        const sub = await stripe.subscriptions.retrieve(user.stripeSubId);
        subDetails = {
          status:       sub.status,
          cancelAtEnd:  sub.cancel_at_period_end,
          renewsAt:     new Date(sub.current_period_end * 1000),
          plan:         sub.items.data[0]?.plan?.interval === "year" ? "yearly" : "monthly",
        };
      } catch {}
    }
    res.json({ success: true, isPremium: user.isPremium, premiumExpiresAt: user.premiumExpiresAt, subscription: subDetails });
  } catch(e) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
