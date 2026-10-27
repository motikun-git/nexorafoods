/*
 * DEFAULT STORE SETTINGS (white-label)
 *
 * Everything brand-specific lives here and in the database - never in the
 * React code. For a new client: either change these defaults before the
 * first start, or edit "Store Settings" in the admin dashboard.
 * Saved database values always override these defaults.
 */
module.exports = {
  storeName: "Nexora Food",
  tagline: "Pure Origins, Trusted Quality",
  description: "Your everyday destination for food, snacks, beverages and everyday essentials.",
  logo: "/images/brand/logo-192.webp",
  favicon: "/images/brand/favicon-64.png",

  colors: {
    primary: "#35552B", // green
    accent: "#F28C38", // orange
  },

  currency: { code: "BDT", symbol: "৳", locale: "en-BD" },

  // Delivery charge by area. freeDeliveryAbove: order subtotal that gets
  // free delivery (null = never free).
  delivery: {
    insideDhaka: 60,
    outsideDhaka: 120,
    freeDeliveryAbove: null,
  },

  // Payment methods offered at checkout (online payment comes later).
  payments: {
    cashOnDelivery: true,
  },

  // Order numbers look like "NF-261026-4KQ7" (prefix + date + random).
  orderPrefix: "NF",

  contact: {
    phone: "+8801313552299",
    email: "info@nexorafoods.com",
    address: "House #579 (Parabar), Road #09, Mirpur DOHS, Dhaka-1216, Bangladesh",
    mapUrl: "https://maps.app.goo.gl/rZYg1sbisnkYfyMZ7?g_st=ac",
    website: "https://nexorafoods.com",
  },

  socials: {
    facebook: "https://www.facebook.com/nexorafoods/",
    instagram: "https://www.instagram.com/nexorafoods_official",
    tiktok: "https://www.tiktok.com/@nexorafoods",
    youtube: "",
  },

  // About page text ({store} is replaced with the store name)
  about: {
    intro: "Your everyday destination for food, snacks, beverages and essential groceries. We aim to make discovering everyday products simple, convenient and enjoyable.",
    storyTitle: "A simpler way to shop for everyday essentials.",
    story: "{store} is an online shopping destination focused on food, beverages, snacks and other everyday essentials. Our goal is to make browsing products straightforward and shopping more convenient. From exploring categories to reviewing your cart, we want your shopping experience to feel clear, organised and easy.",
    mission: "To provide a convenient online destination where customers can explore everyday products, compare options and manage their shopping with ease.",
    vision: "To build a dependable and user-friendly shopping experience that keeps improving with the needs of our customers.",
  },

  hero: {
    badge: "Your everyday food destination",
    title: "Everything You Love,",
    highlight: "All in One Place.",
    subtitle: "Discover food, snacks, beverages and everyday essentials at great prices.",
    ctaLabel: "Explore Products",
    ctaLink: "/shop",
    slides: [
      { image: "/images/hero/hero-basket.webp", imageSmall: "/images/hero/hero-basket-sm.webp", alt: "A basket of fresh fruits and vegetables" },
      { image: "/images/hero/hero-grains.webp", imageSmall: "/images/hero/hero-grains-sm.webp", alt: "Bowls of rice, dal, beans and grains" },
      { image: "/images/hero/hero-dairy.webp", imageSmall: "/images/hero/hero-dairy-sm.webp", alt: "Milk, eggs and cheese" },
      { image: "/images/hero/hero-bakery.webp", imageSmall: "/images/hero/hero-bakery-sm.webp", alt: "Fresh bread and pastries" },
    ],
  },
};
