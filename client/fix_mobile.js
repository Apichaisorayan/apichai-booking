const fs = require('fs');
const path = require('path');

const dir = './public/mobile';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

for (const file of files) {
  try {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    // 1. Fix tailwind primary color
    content = content.replace(/primary: "#00bfa5",\s*"primary-dark": "#008f7a",/g, 'primary: "#c5a059",\n                        "primary-dark": "#a68241",\n                        secondary: "#002b38",');
    
    // 2. Fix sidebar-dark and card-dark and background-dark
    content = content.replace(/"background-dark": "#111827",/g, '"background-dark": "#1a1b1e",');
    content = content.replace(/"card-dark": "#1F2937",/g, '"card-dark": "#25262b",');
    content = content.replace(/"sidebar-dark": "#002a3a",/g, '"sidebar-dark": "#002b38",');

    // 3. Add Material Symbols CSS
    if (!content.includes('font-family: \'Material Symbols Outlined\'')) {
      content = content.replace(/\.hide-scrollbar::-webkit-scrollbar \{/g, `.material-symbols-outlined {\n            font-family: 'Material Symbols Outlined' !important;\n            font-feature-settings: 'liga';\n            -webkit-font-smoothing: antialiased;\n        }\n\n        .hide-scrollbar::-webkit-scrollbar {`);
    }

    // 4. Fix Logo
    content = content.replace(/\.\.\/assets\/logo\.png/g, '/assets/Logo_RattinanClinic-01.png');

    // 5. Auth storage
    content = content.replace(/sessionStorage\.getItem\('token'\)/g, "localStorage.getItem('token')");
    content = content.replace(/sessionStorage\.getItem\('user'\)/g, "localStorage.getItem('user')");
    content = content.replace(/sessionStorage\.removeItem/g, "localStorage.removeItem");

    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Successfully updated ' + file);
  } catch (err) {
    console.error('Error in ' + file + ':', err);
  }
}
