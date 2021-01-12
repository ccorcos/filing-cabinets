const fs = require("fs-extra");
const path = require("path");
const pretty = require("pretty");
const { execSync } = require("child_process");
const cheerio = require("cheerio");

// Writing > Settings > Property | Data Streams > Web
// https://analytics.google.com/analytics/web/?authuser=0#/p257723659/reports/defaulthome
const googleAnalytics = `
<script async src="https://www.googletagmanager.com/gtag/js?id=G-X8Y16M146T"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', 'G-X8Y16M146T');
</script>
`;

const files = fs.readdirSync(__dirname);
const exportDirName = files.find((file) => file.startsWith("Export"));
const exportDir = path.join(__dirname, exportDirName);

const exportFiles = fs.readdirSync(exportDir);
const [assetsDir, htmlFile] = exportFiles;

let htmlContents = fs.readFileSync(path.join(exportDir, htmlFile), "utf8");
htmlContents = pretty(htmlContents);

// Remove indentation.
htmlContents = flatten(htmlContents);

htmlContents = htmlContents.replace(
  "<head>\n<meta",
  `<head>\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<meta`
);

htmlContents = htmlContents.replace(
  "<head>\n<meta",
  `<head>\n${googleAnalytics}\n<meta`
);

// Remove CSS.
htmlContents =
  htmlContents.substring(0, htmlContents.indexOf("<style>")) +
  `<link rel="stylesheet" href="style.css">` +
  htmlContents.substring(htmlContents.indexOf("</style>") + 8);

htmlContents = htmlContents
  .split("<nav ")
  .join(`<div `)
  .split("</nav>")
  .join("</div>");

// Open links in a new tab, but not the table of contents (which is <a class=)
htmlContents = htmlContents.split("<a href=").join(`<a target="_blank" href=`);

// Page width.
htmlContents = htmlContents.split("max-width: 900px;").join(`max-width: 46em;`);

// Toggles default closed
htmlContents = htmlContents.split(' open=""').join("");

// Should use encodeURIComponent but it messes up with commas in the title.
// const assetPath = encodeURIComponent(assetsDir)
const assetPath = assetsDir.replace(/ /g, "%20");

// Rename assets directory.
htmlContents = htmlContents.split(assetPath).join("assets");

const $ = cheerio.load(htmlContents);

// Remove the links that wrap around images.
const images = $("figure > a > img");
for (const img of images) {
  $(img.parent).replaceWith(img);
}

htmlContents = pretty($.html());

fs.writeFileSync(
  path.join(__dirname, "index.html"),
  pretty(htmlContents),
  "utf8"
);

fs.copySync(path.join(exportDir, assetsDir), path.join(__dirname, "assets"), {
  overwrite: true,
});

function flatten(str) {
  return str
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .trim();
}

execSync("open index.html");
