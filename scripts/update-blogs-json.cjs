const fs = require('fs');
const path = require('path');

const blogsDir = path.join(__dirname, '../blogs');
const outputFile = path.join(__dirname, '../data/blogs.json');

function extractMetadata(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const metadata = {};
    const lines = content.split('\n');

    lines.forEach(line => {
        const match = line.match(/<!--\s*@(\w+):\s*(.*)\s*-->/);
        if (match) {
            const key = match[1];
            let value = match[2].trim();

            // Type conversion
            if (value === 'true') value = true;
            else if (value === 'false') value = false;
            else if (!isNaN(value) && value !== '') value = Number(value);

            metadata[key] = value;
        }
    });

    if (Object.keys(metadata).length === 0) return null;

    metadata.slug = path.basename(filePath, '.html');
    metadata.id = metadata.slug;

    return metadata;
}

const blogs = [];
const files = fs.readdirSync(blogsDir);

files.forEach(file => {
    if (file.endsWith('.html') && file !== 'article-template.html') {
        const meta = extractMetadata(path.join(blogsDir, file));
        if (meta) {
            blogs.push(meta);
        }
    }
});

// Sort by date descending
blogs.sort((a, b) => new Date(b.date) - new Date(a.date));

fs.writeFileSync(outputFile, JSON.stringify(blogs, null, 2));
console.log(`Successfully updated ${outputFile} with ${blogs.length} articles.`);
