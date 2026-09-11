const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const outputDirectory = path.join(root, 'app', 'graphics');
const body = fs.readFileSync(path.join(root, 'app', 'bodySection.html'), 'utf8');
const figures = body.match(/<figure class="SA_ems-data-chart[\s\S]*?<\/figure>/g) || [];

fs.mkdirSync(outputDirectory, { recursive: true });

function page(title, markup) {
    return `<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <base href="../" />
    <title>${title}</title>
    <link rel="stylesheet" href="css/main.css" />
</head>
<body class="SA_graphic-standalone">
    <main>${markup}</main>
    <div id="insert-breaking-code" hidden></div>
    <nav id="SA_toc" hidden></nav>
    <script src="js/script.min.js"></script>
</body>
</html>
`;
}

figures.forEach(figure => {
    const type = (figure.match(/data-ems-chart="([^"]+)"/) || [])[1];
    const title = ((figure.match(/<h3>([\s\S]*?)<\/h3>/) || [])[1] || type).replace(/<[^>]+>/g, '');
    if (!type) return;
    fs.writeFileSync(path.join(outputDirectory, `${type}.html`), page(title, figure));
});

const beeswarm = fs.readFileSync(path.join(root, 'app', 'beeswarm.html'), 'utf8');
fs.writeFileSync(path.join(outputDirectory, 'beeswarm.html'), page('How long Toronto patients waited for an ambulance', beeswarm));
