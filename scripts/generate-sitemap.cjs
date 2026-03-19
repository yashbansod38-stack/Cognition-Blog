/**
 * generate-sitemap.cjs
 * Reads blogs.json and generates a sitemap.xml with all blog posts.
 * 
 * Usage: node scripts/generate-sitemap.cjs
 */

const fs = require('fs');
const path = require('path');

const DOMAIN = 'https://cognition.in';
const blogsJsonPath = path.join(__dirname, '../data/blogs.json');
const sitemapPath = path.join(__dirname, '../sitemap.xml');

function generateSitemap() {
    const blogs = JSON.parse(fs.readFileSync(blogsJsonPath, 'utf8'));

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">

  <!-- Homepage -->
  <url>
    <loc>${DOMAIN}/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
`;

    blogs.forEach(blog => {
        const imageUrl = blog.image ? `${DOMAIN}/${blog.image}` : '';
        xml += `
  <!-- ${blog.title} -->
  <url>
    <loc>${DOMAIN}/blogs/${blog.slug}.html</loc>
    <lastmod>${blog.date}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>${imageUrl ? `
    <image:image>
      <image:loc>${imageUrl}</image:loc>
      <image:title>${blog.title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</image:title>
    </image:image>` : ''}
  </url>
`;
    });

    xml += `
</urlset>
`;

    fs.writeFileSync(sitemapPath, xml.trim(), 'utf8');
    console.log(`✅ Sitemap generated at ${sitemapPath} with ${blogs.length} blog posts + homepage.`);
}

generateSitemap();
