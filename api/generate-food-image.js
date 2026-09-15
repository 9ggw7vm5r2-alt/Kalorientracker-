export default async function handler(req,res){
  if(req.method!=='POST') return res.status(405).json({error:'Method not allowed'});
  if(!process.env.OPENAI_API_KEY) return res.status(503).json({error:'AI image generation is not configured'});
  const dish=String(req.body?.dish||'').trim().slice(0,180);
  if(!dish) return res.status(400).json({error:'dish required'});
  const prompt=`Photorealistic appetizing food photography of "${dish}". Accurately reflect the named dish and ingredients implied by its name. Single finished serving on a tasteful plate or bowl, natural restaurant-quality lighting, realistic textures, clean modern background, three-quarter overhead view, no people, no hands, no text, no logos, no packaging. Suitable as a square thumbnail in a premium calorie-tracking app.`;
  try{
    const r=await fetch('https://api.openai.com/v1/images/generations',{
      method:'POST',
      headers:{'Authorization':`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},
      body:JSON.stringify({model:'gpt-image-2',prompt,size:'1024x1024',quality:'low',output_format:'webp'})
    });
    const j=await r.json();
    if(!r.ok) return res.status(r.status).json({error:j?.error?.message||'Image generation failed'});
    const b64=j?.data?.[0]?.b64_json;
    if(!b64) return res.status(502).json({error:'No image returned'});
    return res.status(200).json({image:`data:image/webp;base64,${b64}`});
  }catch(e){return res.status(500).json({error:'Image generation failed'});}
}