import html2pdf from 'html2pdf.js';

document.addEventListener('DOMContentLoaded', () => {
  const promptInput = document.getElementById('prompt');
  const templateSelect = document.getElementById('template-select');
  const generateBtn = document.getElementById('generate-btn');
  const downloadBtn = document.getElementById('download-btn');
  const resumePreview = document.getElementById('resume-preview');
  const errorMessage = document.getElementById('error-message');
  const btnText = generateBtn.querySelector('.btn-text');
  const loader = generateBtn.querySelector('.loader');

  // Template Switching Logic
  templateSelect.addEventListener('change', (e) => {
    resumePreview.classList.remove('template-classic', 'template-modern', 'template-minimalist', 'template-faangpath');
    resumePreview.classList.add(e.target.value);
  });

  generateBtn.addEventListener('click', async () => {
    const prompt = promptInput.value.trim();

    if (!prompt) {
      showError('Please enter a prompt for your resume.');
      return;
    }
    
    // Reset UI
    hideError();
    setLoading(true);

    try {
      const htmlContent = await generateResumeWithGemini(prompt);
      
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

  async function generateResumeWithGemini(userPrompt) {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt: userPrompt })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to generate resume.');
    }

    const data = await response.json();
    return data.html;
  }
});
