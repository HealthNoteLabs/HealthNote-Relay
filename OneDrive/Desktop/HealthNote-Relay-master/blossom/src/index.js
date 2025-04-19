const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Level } = require('level');
const crypto = require('crypto');
const { verifySignature, getEventHash } = require('nostr-tools');

// Initialize Express app
const app = express();
const port = process.env.PORT || 3000;

// Setup middleware
app.use(cors());
app.use(bodyParser.json());

// Create HTTP server
const server = http.createServer(app);

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Initialize LevelDB database
const db = new Level('./data', { valueEncoding: 'json' });

// Blossom node metadata
const blossomInfo = {
  name: "Health & Fitness Blossom Node",
  description: "Specialized Blossom node for health and fitness data",
  pubkey: process.env.BLOSSOM_PUBKEY || '00000000000000000000000000000000000000000000000000000000000000000',
  contact: process.env.CONTACT_EMAIL || 'admin@example.com',
  supportedMetrics: [
    // Standard health metrics
    32018, 32019, 32020, 32021, 32022, 32023, 32024, 32025,
    // Workout events (NIP-101e)
    1301, 33401, 33402
  ],
  software: "github.com/healthnote-relay/blossom",
  version: "0.1.0",
};

// Connected clients
const clients = new Map();

// WebSocket handler
wss.on('connection', (ws) => {
  const clientId = crypto.randomBytes(8).toString('hex');
  const clientSubscriptions = new Map();
  clients.set(clientId, { ws, subscriptions: clientSubscriptions });

  console.log(`Client ${clientId} connected`);

  // Handle WebSocket messages
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      await handleNostrMessage(data, clientId, ws);
    } catch (error) {
      console.error('Error handling message:', error);
      ws.send(JSON.stringify(["NOTICE", "Error processing message"]));
    }
  });

  // Handle WebSocket disconnection
  ws.on('close', () => {
    console.log(`Client ${clientId} disconnected`);
    clients.delete(clientId);
  });

  // Send a welcome message
  ws.send(JSON.stringify(["NOTICE", "Welcome to Health & Fitness Blossom Node"]));
});

// Handle Nostr protocol messages
async function handleNostrMessage(message, clientId, ws) {
  if (!Array.isArray(message)) {
    return;
  }

  const [type, ...params] = message;

  switch (type) {
    case "EVENT":
      await handleEvent(params[0], ws);
      break;
      
    case "REQ":
      await handleSubscription(clientId, params[0], params.slice(1), ws);
      break;
      
    case "CLOSE":
      handleCloseSubscription(clientId, params[0]);
      break;
      
    default:
      ws.send(JSON.stringify(["NOTICE", `Unknown message type: ${type}`]));
  }
}

// Handle EVENT messages
async function handleEvent(event, ws) {
  try {
    // Validate event
    if (!event.id || !event.pubkey || !event.sig) {
      ws.send(JSON.stringify(["NOTICE", "Invalid event: missing required fields"]));
      return;
    }

    // Verify event hash
    const hash = getEventHash(event);
    if (hash !== event.id) {
      ws.send(JSON.stringify(["NOTICE", "Invalid event: id does not match content"]));
      return;
    }

    // Verify signature
    if (!verifySignature(event)) {
      ws.send(JSON.stringify(["NOTICE", "Invalid event: signature verification failed"]));
      return;
    }

    // Check if it's a health event or workout event (NIP-101e)
    const isHealthEvent = event.kind >= 32018 && event.kind <= 32048;
    const isWorkoutEvent = event.kind === 1301 || event.kind === 33401 || event.kind === 33402;
    
    if (!isHealthEvent && !isWorkoutEvent) {
      ws.send(JSON.stringify(["NOTICE", "Event rejected: not a supported health or workout event"]));
      return;
    }

    // Store event
    await db.put(`event:${event.id}`, event);

    // Store in author index
    await db.put(`author:${event.pubkey}:${event.id}`, { id: event.id, created_at: event.created_at });

    // Store in kind index
    await db.put(`kind:${event.kind}:${event.id}`, { id: event.id, created_at: event.created_at });
    
    // For workout events, create additional indices
    if (isWorkoutEvent) {
      // For Exercise Templates, index by exercise name
      if (event.kind === 33401) {
        for (const tag of event.tags) {
          if (tag[0] === "title" && tag.length >= 2) {
            await db.put(`exercise:${tag[1].toLowerCase()}:${event.id}`, { id: event.id, created_at: event.created_at });
          }
        }
      }
      
      // For Workout Records, index by workout title and type
      if (event.kind === 1301) {
        for (const tag of event.tags) {
          if (tag[0] === "title" && tag.length >= 2) {
            await db.put(`workout:title:${tag[1].toLowerCase()}:${event.id}`, { id: event.id, created_at: event.created_at });
          }
          if (tag[0] === "type" && tag.length >= 2) {
            await db.put(`workout:type:${tag[1].toLowerCase()}:${event.id}`, { id: event.id, created_at: event.created_at });
          }
        }
      }
    }

    // Broadcast to all clients with matching subscriptions
    broadcastEvent(event);

    // Send OK message
    ws.send(JSON.stringify(["OK", event.id, true, ""]));
  } catch (error) {
    console.error('Error handling event:', error);
    ws.send(JSON.stringify(["OK", event.id, false, "Error storing event"]));
  }
}

// Handle REQ messages
async function handleSubscription(clientId, subscriptionId, filters, ws) {
  if (!subscriptionId) {
    ws.send(JSON.stringify(["NOTICE", "Invalid subscription: missing subscription ID"]));
    return;
  }

  const client = clients.get(clientId);
  if (!client) {
    return;
  }

  // Save subscription
  client.subscriptions.set(subscriptionId, filters);

  try {
    // Query events matching filters
    const events = await queryEvents(filters);

    // Send matching events to the client
    for (const event of events) {
      ws.send(JSON.stringify(["EVENT", subscriptionId, event]));
    }

    // Send EOSE (End of Stored Events)
    ws.send(JSON.stringify(["EOSE", subscriptionId]));
  } catch (error) {
    console.error('Error handling subscription:', error);
    ws.send(JSON.stringify(["NOTICE", `Error processing subscription: ${error.message}`]));
  }
}

// Handle CLOSE messages
function handleCloseSubscription(clientId, subscriptionId) {
  const client = clients.get(clientId);
  if (client && subscriptionId) {
    client.subscriptions.delete(subscriptionId);
  }
}

// Query events from database
async function queryEvents(filters) {
  if (!Array.isArray(filters) || filters.length === 0) {
    return [];
  }

  const results = [];
  const processedIds = new Set();

  for (const filter of filters) {
    let events = [];

    // Query by IDs
    if (Array.isArray(filter.ids) && filter.ids.length > 0) {
      for (const id of filter.ids) {
        try {
          const event = await db.get(`event:${id}`);
          if (!processedIds.has(event.id)) {
            events.push(event);
            processedIds.add(event.id);
          }
        } catch (error) {
          if (error.code !== 'LEVEL_NOT_FOUND') {
            console.error('Error querying by ID:', error);
          }
        }
      }
    }
    // Query by authors
    else if (Array.isArray(filter.authors) && filter.authors.length > 0) {
      for (const author of filter.authors) {
        try {
          // Get author's events
          const authorEvents = [];
          for await (const [key, value] of db.iterator({
            gt: `author:${author}:`,
            lt: `author:${author};\xff`
          })) {
            try {
              const event = await db.get(`event:${value.id}`);
              if (!processedIds.has(event.id)) {
                authorEvents.push(event);
                processedIds.add(event.id);
              }
            } catch (error) {
              if (error.code !== 'LEVEL_NOT_FOUND') {
                console.error('Error fetching author event:', error);
              }
            }
          }
          events = events.concat(authorEvents);
        } catch (error) {
          console.error('Error querying by author:', error);
        }
      }
    }
    // Query by kinds
    else if (Array.isArray(filter.kinds) && filter.kinds.length > 0) {
      for (const kind of filter.kinds) {
        try {
          // Get events by kind
          const kindEvents = [];
          for await (const [key, value] of db.iterator({
            gt: `kind:${kind}:`,
            lt: `kind:${kind};\xff`
          })) {
            try {
              const event = await db.get(`event:${value.id}`);
              if (!processedIds.has(event.id)) {
                kindEvents.push(event);
                processedIds.add(event.id);
              }
            } catch (error) {
              if (error.code !== 'LEVEL_NOT_FOUND') {
                console.error('Error fetching kind event:', error);
              }
            }
          }
          events = events.concat(kindEvents);
        } catch (error) {
          console.error('Error querying by kind:', error);
        }
      }
    }

    // Apply since filter
    if (filter.since) {
      events = events.filter(event => event.created_at >= filter.since);
    }

    // Apply until filter
    if (filter.until) {
      events = events.filter(event => event.created_at <= filter.until);
    }

    // Apply limit
    if (filter.limit && filter.limit > 0) {
      events = events.slice(0, filter.limit);
    }

    results.push(...events);
  }

  return results;
}

// Broadcast event to all clients with matching subscriptions
function broadcastEvent(event) {
  for (const [clientId, client] of clients.entries()) {
    for (const [subId, filters] of client.subscriptions.entries()) {
      if (eventMatchesFilters(event, filters)) {
        client.ws.send(JSON.stringify(["EVENT", subId, event]));
      }
    }
  }
}

// Check if event matches filters
function eventMatchesFilters(event, filters) {
  if (!Array.isArray(filters) || filters.length === 0) {
    return false;
  }

  for (const filter of filters) {
    // Check IDs
    if (Array.isArray(filter.ids) && filter.ids.length > 0) {
      if (!filter.ids.includes(event.id)) {
        continue;
      }
    }

    // Check authors
    if (Array.isArray(filter.authors) && filter.authors.length > 0) {
      if (!filter.authors.includes(event.pubkey)) {
        continue;
      }
    }

    // Check kinds
    if (Array.isArray(filter.kinds) && filter.kinds.length > 0) {
      if (!filter.kinds.includes(event.kind)) {
        continue;
      }
    }

    // Check since
    if (filter.since && event.created_at < filter.since) {
      continue;
    }

    // Check until
    if (filter.until && event.created_at > filter.until) {
      continue;
    }

    // All conditions passed for this filter
    return true;
  }

  return false;
}

// Health endpoint
app.get('/', (req, res) => {
  res.json(blossomInfo);
});

// Register endpoint
app.post('/register', async (req, res) => {
  try {
    // Generate registration data
    const regData = {
      url: `${req.protocol}://${req.get('host')}`,
      pubkey: blossomInfo.pubkey,
      supportedMetrics: blossomInfo.supportedMetrics,
    };

    // Try to register with main relay
    const relayURL = process.env.MAIN_RELAY_URL || 'http://relay:8080';
    const response = await fetch(`${relayURL}/register-blossom`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(regData),
    });

    if (response.ok) {
      res.status(200).json({ success: true, message: 'Registered with main relay' });
    } else {
      res.status(500).json({ success: false, message: 'Failed to register with main relay' });
    }
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Event API endpoints
app.get('/api/events/:id', async (req, res) => {
  try {
    const event = await db.get(`event:${req.params.id}`);
    res.json(event);
  } catch (error) {
    if (error.code === 'LEVEL_NOT_FOUND') {
      res.status(404).json({ error: 'Event not found' });
    } else {
      console.error('Error getting event:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

app.get('/api/events', async (req, res) => {
  try {
    const { author, kind, limit = 10 } = req.query;
    let events = [];

    if (author) {
      for await (const [key, value] of db.iterator({
        gt: `author:${author}:`,
        lt: `author:${author};\xff`,
        limit: parseInt(limit),
      })) {
        const event = await db.get(`event:${value.id}`);
        events.push(event);
      }
    } else if (kind) {
      for await (const [key, value] of db.iterator({
        gt: `kind:${kind}:`,
        lt: `kind:${kind};\xff`,
        limit: parseInt(limit),
      })) {
        const event = await db.get(`event:${value.id}`);
        events.push(event);
      }
    }

    res.json(events);
  } catch (error) {
    console.error('Error listing events:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start the server
server.listen(port, () => {
  console.log(`Health & Fitness Blossom node running on port ${port}`);
  
  // Attempt to register with main relay on startup
  fetch(`http://localhost:${port}/register`)
    .then(response => {
      if (response.ok) {
        console.log('Registered with main relay');
      } else {
        console.log('Failed to register with main relay');
      }
    })
    .catch(error => {
      console.error('Error registering with main relay:', error);
    });
}); 