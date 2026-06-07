import html2pdf from 'html2pdf.js';

document.addEventListener('DOMContentLoaded', () => {
  const apiKeyInput = document.getElementById('api-key');
  const promptInput = document.getElementById('prompt');
  const templateSelect = document.getElementById('template-select');
  const generateBtn = document.getElementById('generate-btn');
  const downloadBtn = document.getElementById('download-btn');
  const resumePreview = document.getElementById('resume-preview');
  const errorMessage = document.getElementById('error-message');
  const btnText = generateBtn.querySelector('.btn-text');
  const loader = generateBtn.querySelector('.loader');

  // Load saved API key
  const savedKey = localStorage.getItem('gemini_api_key');
  if (savedKey) {
    apiKeyInput.value = savedKey;
  }

  // Template Switching Logic
  templateSelect.addEventListener('change', (e) => {
    resumePreview.classList.remove('template-classic', 'template-modern', 'template-minimalist', 'template-faangpath');
    resumePreview.classList.add(e.target.value);
  });

  generateBtn.addEventListener('click', async () => {
    const apiKey = apiKeyInput.value.trim();
    const prompt = promptInput.value.trim();

    if (!apiKey) {
      showError('Please enter your Gemini API Key.');
      return;
    }

    if (!prompt) {
      showError('Please enter a prompt for your resume.');
      return;
    }

    // Save API key
    localStorage.setItem('gemini_api_key', apiKey);
    
    // Reset UI
    hideError();
    setLoading(true);

    try {
      const htmlContent = await generateResumeWithGemini(apiKey, prompt);
      
      // Update preview
      resumePreview.classList.remove('placeholder');
      resumePreview.innerHTML = htmlContent;
      resumePreview.setAttribute('contenteditable', 'true');
      
      downloadBtn.disabled = false;
    } catch (error) {
      showError(error.message || 'An error occurred while generating the resume.');
    } finally {
      setLoading(false);
    }
  });

  downloadBtn.addEventListener('click', () => {
    // Before downloading, we temporarily remove contenteditable to avoid cursor/focus outlines in PDF
    resumePreview.setAttribute('contenteditable', 'false');
    
    const opt = {
      margin:       10,
      filename:     'resume.pdf',
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(resumePreview).save().then(() => {
      // Restore editability
      resumePreview.setAttribute('contenteditable', 'true');
    });
  });

  function setLoading(isLoading) {
    if (isLoading) {
      generateBtn.disabled = true;
      btnText.classList.add('hidden');
      loader.classList.remove('hidden');
    } else {
      generateBtn.disabled = false;
      btnText.classList.remove('hidden');
      loader.classList.add('hidden');
    }
  }

  function showError(msg) {
    errorMessage.textContent = msg;
    errorMessage.classList.remove('hidden');
  }

  function hideError() {
    errorMessage.classList.add('hidden');
    errorMessage.textContent = '';
  }

  async function generateResumeWithGemini(apiKey, userPrompt) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    
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
        parts: [{ text: systemInstruction + "\n\nUser Request: " + userPrompt }]
      }]
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'API request failed. Check your API key.');
    }

    const data = await response.json();
    let text = data.candidates[0].content.parts[0].text;
    
    // Clean up markdown formatting if the model still outputs it
    text = text.replace(/```html/gi, '').replace(/```/g, '').trim();
    
    return text;
  }
});
