export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required.' });
  }

  // Get API key from secure environment variable
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'Server configuration error: Missing API Key.' });
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`;

  const systemInstruction = `
You are an expert executive resume writer. Your goal is to write a resume that scores 100 on ATS systems (Applicant Tracking Systems).
The user will provide their background and desired role. You must infer keywords from their prompt and use them naturally.

STRICT ATS RULES (MUST FOLLOW EXACTLY):
1. Use exact headings ONLY: Professional Summary, Skills, Work Experience, Projects, Education, Certifications, Achievements.
2. Structure the HTML ONLY as follows:
   - <h1>Full Name</h1>
   - A single <p> for Contact Info: City, State | Phone | Email | LinkedIn | GitHub
   - <h2>Professional Summary</h2> followed by a 3-4 line <p> with experience, tech, domain, and objective.
   - <h2>Skills</h2> followed by a plain text layout (no tables). Use <h3> for categories (Technical Skills, Tools, Soft Skills) and a comma-separated list inside a <p>.
   - <h2>Work Experience</h2> followed by entries.
   - <h2>Projects</h2> followed by entries.
   - <h2>Education</h2> followed by entries.
3. For Work Experience, Projects, and Education entries:
   - Use <h3>. Put the Title/Degree/Project Name on the left, and YOU MUST WRAP THE DATE in a span like this: <span class="date">Jan 2025 - May 2026</span>
   - Below the <h3>, put the Company Name, School Name, or Technologies used in an <h4>.
   - Use <ul><li> for bullet points.
4. Bullet Point Rules:
   - Use strong action verbs (Developed, Implemented, Designed, Optimized, Integrated).
   - Quantify achievements using %, numbers, revenue, or time saved. (e.g., "Improved application performance by 20%").
5. Dates MUST be in format: "Jan 2025 - May 2026" or "01/2025 - 05/2026".
6. Output ONLY clean HTML. NO markdown formatting (\`\`\`html). NO tables, text boxes, columns, icons, graphics, or progress bars.
`;

  const requestBody = {
    contents: [{
      parts: [{ text: systemInstruction + "\n\nUser Request: " + prompt }]
    }]
  };

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json();
      const prefix = apiKey ? apiKey.substring(0, 4) : 'none';
      return res.status(response.status).json({ 
        error: `Google API Error (Your key starts with "${prefix}"): ` + (errorData.error?.message || 'API request failed.') 
      });
    }

    const data = await response.json();
    let text = data.candidates[0].content.parts[0].text;
    
    // Clean up markdown formatting if the model still outputs it
    text = text.replace(/```html/gi, '').replace(/```/g, '').trim();
    
    return res.status(200).json({ html: text });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error.' });
  }
}
