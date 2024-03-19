// Change require statements to import statements
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const app = express();

// Since __dirname is not available with ES modules, we need to derive it
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Serve static files from the root directory
app.use(express.static(__dirname));

app.get('/', (req, res) => {
  // Send the HTML file that includes index.js and initiates the Highcharts map chart
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start the server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}`);
  console.log('Press Ctrl+C to quit.');
});