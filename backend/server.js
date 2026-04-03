const express = require('express');
const app = express();
const PORT = 3001;

// Middleware to parse JSON
app.use(express.json());

// A simple "Hello World" route
app.get('/', (req, res) => {
  res.send('Backend is running!');
});

// A sample API route
app.get('/api/data', (req, res) => {
  res.json({ message: "Hello from the server!", status: "success" });
});

app.listen(PORT, () => {
  console.log(`Server is live at http://localhost:${PORT}`);
});