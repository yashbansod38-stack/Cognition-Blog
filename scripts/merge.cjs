const fs = require('fs');

const template = fs.readFileSync('blogs/article-template.html', 'utf8');
const rawHtml = fs.readFileSync('blogs/Indian-Longevity-Stack.html', 'utf8');

const title = 'The Indian Longevity Supplement Stack';
const desc = 'NMN, Ashwagandha & Shilajit — What Actually Works in 2026. A science-backed, India-first guide bridging 3,000 years of Ayurvedic tradition with modern cellular biology.';
const date = '2026-03-16';

let merged = template
  .replace(/YOUR ARTICLE TITLE/g, title)
  .replace(/YOUR ARTICLE DESCRIPTION/g, desc)
  .replace(/YOUR CATEGORY LABEL/g, 'Longevity & Bio-Optimization')
  .replace(/YOUR-IMAGE\.jpg/g, 'blog-indian-longevity.jpg')
  .replace(/YOUR-SLUG/g, 'Indian-Longevity-Stack')
  .replace(/2026-MM-DD/g, date)
  .replace(/<!-- @category: ai -->/, '<!-- @category: longevity -->')
  .replace(/<!-- @categoryLabel: AI Workflow Engineering -->/, '<!-- @categoryLabel: Longevity & Bio-Optimization -->')
  .replace(/<!-- @readTime: 10 -->/, '<!-- @readTime: 12 -->');

// We need to extract <style> from original
const styleMatch = rawHtml.match(/<style>([\s\S]*?)<\/style>/);
if (styleMatch) {
    merged = merged.replace('</style>', styleMatch[1] + '\n    </style>');
}

// Include Google font
merged = merged.replace('</head>', '    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&family=Plus+Jakarta+Sans:wght@400;500;700&display=swap" rel="stylesheet">\n</head>');

// Extract main content from rawHtml
const headerMatch = rawHtml.match(/<header[^>]*>([\s\S]*?)<\/header>/);
const mainMatch = rawHtml.match(/<main[^>]*>([\s\S]*?)<\/main>/);

let content = '';
if (headerMatch) content += '<header class="pt-20 pb-16 px-6 text-center max-w-5xl mx-auto">' + headerMatch[1] + '</header>';
if (mainMatch) content += '<main class="max-w-6xl mx-auto px-6 space-y-16">' + mainMatch[1] + '</main>';

// Also wrap it in dark bg manually
content = '<div style="background-color: #0F172A; color: #E2E8F0; font-family: \'Plus Jakarta Sans\', sans-serif;" class="py-10">\n' + content + '\n</div>';

// Replace the placeholder area in the template
const tmplMainMatch = merged.match(/(<main[^>]*>[\s\S]*?)<div class="article-container">[\s\S]*?<\/div>([\s\S]*?<\/main>)/);
if (tmplMainMatch) {
  merged = tmplMainMatch[1] + '<div class="article-container">' + content + '</div>' + tmplMainMatch[2];
}

// Extract script
const scriptMatch = rawHtml.match(/<script>([\s\S]*?)<\/script>/g);
if (scriptMatch) {
  const lastScript = scriptMatch[scriptMatch.length - 1]; // the Chart.js init script
  merged = merged.replace('</body>', lastScript + '\n</body>');
}

fs.writeFileSync('blogs/Indian-Longevity-Stack.html', merged);
console.log('Merged successfully.');
