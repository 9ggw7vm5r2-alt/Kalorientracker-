module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const text = String((req.body && req.body.text) || '').trim();
  if (!text) return res.status(400).json({ error: 'Bitte beschreibe dein Essen.' });
  // Lightweight server-side fallback. The client has the same estimation logic,
  // so the feature also works offline or if this route is unavailable.
  const rules = [
    [/\b(brötchen|semmel)\b/i,160,5.5,30,2], [/\b(käse|gouda|emmentaler)\b/i,115,8,.3,9],
    [/\b(ei|eier|rührei|spiegelei)\b/i,80,6.5,.5,5.5], [/\b(banane)\b/i,105,1.3,27,.4],
    [/\b(skyr)\b/i,125,22,8,.5], [/\b(haferflocken|porridge|müsli)\b/i,280,10,45,7],
    [/\b(pizza)\b/i,850,34,95,36], [/\b(döner|kebab)\b/i,720,38,70,30],
    [/\b(burger)\b/i,600,30,50,30], [/\b(pommes|fritten)\b/i,430,6,55,20],
    [/\b(spaghetti|nudeln|pasta)\b/i,520,18,82,12], [/\b(bolognese)\b/i,260,18,14,14],
    [/\b(reis)\b/i,260,5,56,.6], [/\b(hähnchen|huhn|chicken)\b/i,250,46,0,6],
    [/\b(lachs)\b/i,310,30,0,20], [/\b(salat)\b/i,180,6,18,9],
    [/\b(curry)\b/i,520,22,60,22], [/\b(cola|limonade|fanta|sprite)\b/i,140,0,35,0],
    [/\b(kaffee)\b/i,15,.5,2,.5], [/\b(cappuccino|latte macchiato|milchkaffee)\b/i,140,7,12,6]
  ];
  let kcal=0, protein=0, carbs=0, fat=0, hits=0;
  for (const [re,k,p,c,f] of rules) if (re.test(text)) { hits++; kcal+=k; protein+=p; carbs+=c; fat+=f; }
  if (!hits) { kcal=500; protein=22; carbs=60; fat=18; }
  return res.status(200).json({
    name: text.slice(0,90), kcal: Math.round(kcal), protein: +protein.toFixed(1), carbs: +carbs.toFixed(1), fat: +fat.toFixed(1),
    note: 'Grobe Schätzung anhand typischer Portionsgrößen. Menge, Zubereitung, Öl, Saucen und Marken können die tatsächlichen Werte deutlich verändern.'
  });
};
