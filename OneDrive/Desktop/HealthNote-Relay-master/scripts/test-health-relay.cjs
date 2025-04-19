/**
 * HealthNote-Relay Test Script
 * 
 * Tests the relay's ability to handle NIP-101e health events.
 * Creates and publishes:
 * 1. Exercise Template (kind 33401)
 * 2. Workout Template (kind 33402) 
 * 3. Workout Record (kind 1301)
 * 
 * Usage: node test-health-relay.cjs <relay-url> [private-key]
 */

const WebSocket = require('ws');
const crypto = require('crypto');
const nostrTools = require('nostr-tools');

// Parse command line arguments
const args = process.argv.slice(2);
const relayUrl = args[0] || 'wss://relay.damus.io';

// Generate or use a private key
let privateKey;
if (args[1]) {
  privateKey = args[1];
} else {
  privateKey = Buffer.from(crypto.randomBytes(32)).toString('hex');
  console.log(`Generated private key: ${privateKey}`);
}

const publicKey = nostrTools.getPublicKey(privateKey);
console.log(`Using public key: ${publicKey}`);

// Function to sign and prepare an event for publishing
function signEvent(event) {
  event.id = nostrTools.getEventHash(event);
  const sig = nostrTools.finalizeEvent(event, privateKey);
  event.sig = typeof sig === 'string' ? sig : sig.sig || sig.toString();
  
  // Return a clean copy to avoid circular references
  return {
    id: event.id,
    pubkey: event.pubkey,
    created_at: event.created_at,
    kind: event.kind,
    tags: event.tags,
    content: event.content,
    sig: event.sig
  };
}

// Create an Exercise Template (kind 33401)
function createExerciseTemplate() {
  const eventId = crypto.randomBytes(16).toString('hex');
  const exerciseTemplate = {
    kind: 33401,
    pubkey: publicKey,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ['d', eventId],
      ['title', 'Test Push-up'],
      ['type', 'strength'],
      ['muscle', 'chest'],
      ['muscle', 'triceps'],
      ['equipment', 'none'],
      ['measurement', 'reps'],
      ['difficulty', '1'],
      ['privacy', 'public']
    ],
    content: JSON.stringify({
      instructions: [
        'Get into a plank position with hands slightly wider than shoulders',
        'Lower your body until chest nearly touches floor',
        'Push back up to starting position'
      ],
      tips: ['Keep body straight', 'Look slightly ahead'],
      variations: ['Knee push-ups', 'Decline push-ups']
    })
  };
  
  return signEvent(exerciseTemplate);
}

// Create a Workout Template (kind 33402)
function createWorkoutTemplate(exerciseTemplateId) {
  const eventId = crypto.randomBytes(16).toString('hex');
  const workoutTemplate = {
    kind: 33402,
    pubkey: publicKey,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ['d', eventId],
      ['title', 'Test Bodyweight Workout'],
      ['type', 'strength'],
      ['description', 'Simple bodyweight routine for testing'],
      ['duration', '15'],
      ['level', 'beginner'],
      ['exercise', exerciseTemplateId, '3x10', 'Push-ups'],
      ['privacy', 'public']
    ],
    content: JSON.stringify({
      warmup: '2 minutes of jumping jacks',
      cooldown: 'Basic stretching',
      notes: 'Rest 60 seconds between sets',
      sequence: [
        {
          name: 'Main Circuit',
          exercises: ['Push-ups'],
          parameters: '3 sets of 10 reps'
        }
      ]
    })
  };
  
  return signEvent(workoutTemplate);
}

// Create a Workout Record (kind 1301)
function createWorkoutRecord(exerciseTemplateId, workoutTemplateId) {
  const now = Math.floor(Date.now() / 1000);
  const eventId = crypto.randomBytes(16).toString('hex');
  
  const workoutRecord = {
    kind: 1301,
    pubkey: publicKey,
    created_at: now,
    tags: [
      ['d', eventId],
      ['title', 'Test Workout Session'],
      ['type', 'strength'],
      ['started_at', (now - 1800).toString()],
      ['ended_at', now.toString()],
      ['duration', '1800'],
      ['workout', workoutTemplateId],
      ['exercise', exerciseTemplateId, '3x10', 'Push-ups'],
      ['feeling', '8'],
      ['privacy', 'limited']
    ],
    content: JSON.stringify({
      notes: 'Completed test workout successfully',
      exercises: [
        {
          id: exerciseTemplateId,
          title: 'Push-ups',
          sets: [
            { reps: 10 },
            { reps: 10 },
            { reps: 8 }
          ],
          notes: 'Last set was challenging'
        }
      ]
    })
  };
  
  return signEvent(workoutRecord);
}

// Connect to relay and run the test
console.log(`\nConnecting to relay: ${relayUrl}`);
const relay = new WebSocket(relayUrl);

// Store our events
const events = {
  exerciseTemplate: null,
  workoutTemplate: null,
  workoutRecord: null
};

// Add a global message handler for debugging
relay.on('message', (rawData) => {
  try {
    // Log the type and first part of data for debugging
    const type = typeof rawData;
    const preview = type === 'string' ? rawData.substring(0, 100) : 
                  (rawData instanceof Buffer ? rawData.toString('hex').substring(0, 100) : 
                  (rawData instanceof Object ? 'Object' : String(rawData).substring(0, 100)));
    
    console.log(`DEBUG: Received ${type} message: ${preview}${preview.length >= 100 ? '...' : ''}`);
  } catch (err) {
    console.log(`Error in debug logger: ${err.message}`);
  }
});

relay.on('open', async () => {
  console.log('Connected to relay');
  
  try {
    // Step 1: Create and publish Exercise Template
    console.log('\n📋 Step 1: Publishing Exercise Template');
    events.exerciseTemplate = createExerciseTemplate();
    
    const exerciseMessage = JSON.stringify(['EVENT', events.exerciseTemplate]);
    relay.send(exerciseMessage);
    console.log(`Exercise Template ID: ${events.exerciseTemplate.id}`);
    
    // Wait for confirmation before proceeding to step 2
    console.log('Waiting for confirmation (5s timeout)...');
    let exerciseConfirmed = false;

    // Set up a one-time handler for the OK message
    const exerciseHandler = function(rawData) {
      try {
        // Try multiple ways to parse the data
        let message;
        if (typeof rawData === 'string') {
          message = JSON.parse(rawData);
        } else if (rawData instanceof Buffer) {
          message = JSON.parse(rawData.toString());
        } else if (rawData && rawData.data) {
          // WebSocket might wrap in a data property
          const dataStr = typeof rawData.data === 'string' ? 
            rawData.data : 
            rawData.data instanceof Buffer ? 
              rawData.data.toString() : 
              JSON.stringify(rawData.data);
          message = JSON.parse(dataStr);
        } else if (rawData && typeof rawData === 'object') {
          // Might already be parsed
          message = rawData;
        }
        
        if (Array.isArray(message) && message[0] === 'OK' && message[1] === events.exerciseTemplate.id) {
          exerciseConfirmed = true;
          if (message[2] === true) {
            console.log('✅ Exercise Template accepted by relay');
          } else {
            console.log('❌ Exercise Template rejected by relay');
            if (message[3]) console.log(`Reason: ${message[3]}`);
          }
          relay.removeListener('message', exerciseHandler);
        }
      } catch (err) {
        console.log(`Error processing exercise confirmation: ${err.message}`);
      }
    };

    relay.on('message', exerciseHandler);

    // Wait for timeout or confirmation
    await new Promise((resolve) => {
      setTimeout(() => {
        if (!exerciseConfirmed) {
          console.log('⏰ Timeout waiting for Exercise Template confirmation');
        }
        relay.removeListener('message', exerciseHandler);
        resolve();
      }, 5000);
    });
    
    // Step 2: Create and publish Workout Template
    console.log('\n📋 Step 2: Publishing Workout Template');
    events.workoutTemplate = createWorkoutTemplate(events.exerciseTemplate.id);
    
    const workoutMessage = JSON.stringify(['EVENT', events.workoutTemplate]);
    relay.send(workoutMessage);
    console.log(`Workout Template ID: ${events.workoutTemplate.id}`);
    
    // Wait for confirmation before proceeding to step 3
    console.log('Waiting for Workout Template confirmation (5s timeout)...');
    let workoutConfirmed = false;

    // Set up a one-time handler for the OK message
    const workoutHandler = function(rawData) {
      try {
        // Try multiple ways to parse the data
        let message;
        if (typeof rawData === 'string') {
          message = JSON.parse(rawData);
        } else if (rawData instanceof Buffer) {
          message = JSON.parse(rawData.toString());
        } else if (rawData && rawData.data) {
          // WebSocket might wrap in a data property
          const dataStr = typeof rawData.data === 'string' ? 
            rawData.data : 
            rawData.data instanceof Buffer ? 
              rawData.data.toString() : 
              JSON.stringify(rawData.data);
          message = JSON.parse(dataStr);
        } else if (rawData && typeof rawData === 'object') {
          // Might already be parsed
          message = rawData;
        }
        
        if (Array.isArray(message) && message[0] === 'OK' && message[1] === events.workoutTemplate.id) {
          workoutConfirmed = true;
          if (message[2] === true) {
            console.log('✅ Workout Template accepted by relay');
          } else {
            console.log('❌ Workout Template rejected by relay');
            if (message[3]) console.log(`Reason: ${message[3]}`);
          }
          relay.removeListener('message', workoutHandler);
        }
      } catch (err) {
        console.log(`Error processing workout confirmation: ${err.message}`);
      }
    };

    relay.on('message', workoutHandler);

    // Wait for timeout or confirmation
    await new Promise((resolve) => {
      setTimeout(() => {
        if (!workoutConfirmed) {
          console.log('⏰ Timeout waiting for Workout Template confirmation');
        }
        relay.removeListener('message', workoutHandler);
        resolve();
      }, 5000);
    });
    
    // Step 3: Create and publish Workout Record
    console.log('\n📋 Step 3: Publishing Workout Record');
    events.workoutRecord = createWorkoutRecord(
      events.exerciseTemplate.id,
      events.workoutTemplate.id
    );
    
    const recordMessage = JSON.stringify(['EVENT', events.workoutRecord]);
    relay.send(recordMessage);
    console.log(`Workout Record ID: ${events.workoutRecord.id}`);
    
    // Wait for confirmation
    console.log('Waiting for Workout Record confirmation (5s timeout)...');
    let recordConfirmed = false;

    // Set up a one-time handler for the OK message
    const recordHandler = function(rawData) {
      try {
        // Try multiple ways to parse the data
        let message;
        if (typeof rawData === 'string') {
          message = JSON.parse(rawData);
        } else if (rawData instanceof Buffer) {
          message = JSON.parse(rawData.toString());
        } else if (rawData && rawData.data) {
          // WebSocket might wrap in a data property
          const dataStr = typeof rawData.data === 'string' ? 
            rawData.data : 
            rawData.data instanceof Buffer ? 
              rawData.data.toString() : 
              JSON.stringify(rawData.data);
          message = JSON.parse(dataStr);
        } else if (rawData && typeof rawData === 'object') {
          // Might already be parsed
          message = rawData;
        }
        
        if (Array.isArray(message) && message[0] === 'OK' && message[1] === events.workoutRecord.id) {
          recordConfirmed = true;
          if (message[2] === true) {
            console.log('✅ Workout Record accepted by relay');
          } else {
            console.log('❌ Workout Record rejected by relay');
            if (message[3]) console.log(`Reason: ${message[3]}`);
          }
          relay.removeListener('message', recordHandler);
        }
      } catch (err) {
        console.log(`Error processing record confirmation: ${err.message}`);
      }
    };

    relay.on('message', recordHandler);

    // Wait for timeout or confirmation
    await new Promise((resolve) => {
      setTimeout(() => {
        if (!recordConfirmed) {
          console.log('⏰ Timeout waiting for Workout Record confirmation');
        }
        relay.removeListener('message', recordHandler);
        resolve();
      }, 5000);
    });
    
    console.log('\n🔍 Verifying events can be retrieved...');
    
    // Step 4: Verify we can retrieve the events
    const subId = 'verification-' + Math.random().toString(36).substring(2, 10);
    const reqMessage = JSON.stringify([
      'REQ',
      subId,
      {
        ids: [
          events.exerciseTemplate.id, 
          events.workoutTemplate.id, 
          events.workoutRecord.id
        ]
      }
    ]);
    
    console.log('Verifying events can be retrieved (5s timeout)...');
    const foundEvents = [];

    // Set up a handler for the verification phase
    const verifyHandler = function(rawData) {
      try {
        // Try multiple ways to parse the data
        let message;
        if (typeof rawData === 'string') {
          message = JSON.parse(rawData);
        } else if (rawData instanceof Buffer) {
          message = JSON.parse(rawData.toString());
        } else if (rawData && rawData.data) {
          // WebSocket might wrap in a data property
          const dataStr = typeof rawData.data === 'string' ? 
            rawData.data : 
            rawData.data instanceof Buffer ? 
              rawData.data.toString() : 
              JSON.stringify(rawData.data);
          message = JSON.parse(dataStr);
        } else if (rawData && typeof rawData === 'object') {
          // Might already be parsed
          message = rawData;
        }
        
        if (Array.isArray(message)) {
          if (message[0] === 'EVENT' && message[1] === subId) {
            foundEvents.push(message[2].id);
            console.log(`Found event: ${message[2].id}`);
          }
          
          if (message[0] === 'EOSE' && message[1] === subId) {
            console.log('Received end of subscription (EOSE)');
            clearTimeout(verifyTimeout);
            relay.removeListener('message', verifyHandler);
            verifyResolve();
          }
        }
      } catch (err) {
        console.log(`Error processing verification message: ${err.message}`);
      }
    };

    // Use a variable to hold the resolve function so it can be called from the handler
    let verifyResolve;
    let verifyTimeout;

    // Send the verification request
    console.log('Sending query for events...');
    relay.send(reqMessage);
    relay.on('message', verifyHandler);

    // Wait for EOSE or timeout
    await new Promise((resolve) => {
      verifyResolve = resolve;
      verifyTimeout = setTimeout(() => {
        console.log('⏰ Query timeout reached');
        relay.removeListener('message', verifyHandler);
        resolve();
      }, 5000);
    });
    
    // Report results
    console.log('\n📊 Test Results:');
    
    if (foundEvents.includes(events.exerciseTemplate.id)) {
      console.log('✅ Exercise Template found in relay');
    } else {
      console.log('❌ Exercise Template not found in relay');
    }
    
    if (foundEvents.includes(events.workoutTemplate.id)) {
      console.log('✅ Workout Template found in relay');
    } else {
      console.log('❌ Workout Template not found in relay');
    }
    
    if (foundEvents.includes(events.workoutRecord.id)) {
      console.log('✅ Workout Record found in relay');
    } else {
      console.log('❌ Workout Record not found in relay');
    }
    
    console.log('\n🏁 Test completed!');
    
  } catch (error) {
    console.error('\n❌ Test error:', error);
  } finally {
    relay.close();
  }
});

relay.on('error', (error) => {
  console.error('Relay connection error:', error);
});

relay.on('close', () => {
  console.log('Disconnected from relay');
}); 