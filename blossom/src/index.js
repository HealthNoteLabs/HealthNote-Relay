const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.json({
    name: "Health & Fitness Blossom Node",
    description: "Specialized Blossom node for health and fitness data",
    version: "0.1.0"
  });
});

app.listen(port, () => {
  console.log(`Health Blossom node running on port ${port}`);
}); 