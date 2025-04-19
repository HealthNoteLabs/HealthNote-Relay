#!/usr/bin/env node

/**
 * HealthNote-Relay Test Script
 * 
 * This script tests the functionality of a HealthNote-Relay implementation
 * by creating and querying various NIP-101e events (Exercise Templates,
 * Workout Templates, and Workout Records).
 * 
 * Usage: 
 *   node test-relay.js <relay-url> [private-key]
 * 
 * If no private key is provided, a temporary one will be generated.
 */

import WebSocket from 'ws';
import crypto from 'crypto';
import * as nostrTools from 'nostr-tools';

// Parse command line arguments
const args = process.argv.slice(2);
const relayUrl = args[0] || 'wss://relay.healthnote.io';
let privateKey = args[1];

// Generate a temporary private key if none provided
if (!privateKey) {
  privateKey = nostrTools.generateSecretKey();
  console.log(`Generated temporary private key: ${Buffer.from(privateKey).toString('hex')}`);
  privateKey = Buffer.from(privateKey).toString('hex');
}

const publicKey = nostrTools.getPublicKey(privateKey);
console.log(`Using public key: ${publicKey}`);

// Test events
const events = {
  exerciseTemplate: null,
  workoutTemplate: null,
  workoutRecord: null
};

// Connect to relay
console.log(`Connecting to relay: ${relayUrl}`);
const relay = new WebSocket(relayUrl);

relay.on('open', async () => {
  console.log('Connected to relay');
  
  try {
    await runTests();
    console.log('\n✅ All tests completed successfully!');
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  } finally {
    relay.close();
  }
});

relay.on('error', (error) => {
  console.error('Relay connection error:', error);
});

// Main test sequence
async function runTests() {
  console.log('\n--- Starting HealthNote-Relay Tests ---');
  
  // Test 1: Create and publish an Exercise Template
  await testExerciseTemplate();
  
  // Test 2: Create and publish a Workout Template
  await testWorkoutTemplate();
  
  // Test 3: Create and publish a Workout Record
  await testWorkoutRecord();
  
  // Test 4: Query for events
  await testQueries();
  
  // Test 5: Test privacy levels
  await testPrivacyLevels();
}

// Test 1: Create and publish an Exercise Template
async function testExerciseTemplate() {
  console.log('\n📋 Test 1: Create Exercise Template');
  
  const now = Math.floor(Date.now() / 1000);
  const eventId = crypto.randomBytes(16).toString('hex');
  
  const exerciseTemplate = {
    kind: 33401,
    pubkey: publicKey,
    created_at: now,
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
  
  // Sign and publish event
  exerciseTemplate.id = nostrTools.getEventHash(exerciseTemplate);
  exerciseTemplate.sig = nostrTools.finalizeEvent(exerciseTemplate, privateKey);
  
  events.exerciseTemplate = exerciseTemplate;
  await publishEvent(exerciseTemplate);
  console.log(`✅ Exercise Template published with ID: ${exerciseTemplate.id}`);
  
  // Verify it was stored
  await verifyEventStored(exerciseTemplate.id);
}

// Test 2: Create and publish a Workout Template
async function testWorkoutTemplate() {
  console.log('\n📋 Test 2: Create Workout Template');
  
  if (!events.exerciseTemplate) {
    throw new Error('Exercise Template not created yet');
  }
  
  const now = Math.floor(Date.now() / 1000);
  const eventId = crypto.randomBytes(16).toString('hex');
  
  const workoutTemplate = {
    kind: 33402,
    pubkey: publicKey,
    created_at: now,
    tags: [
      ['d', eventId],
      ['title', 'Test Bodyweight Workout'],
      ['type', 'strength'],
      ['description', 'Simple bodyweight routine for testing'],
      ['duration', '15'],
      ['level', 'beginner'],
      ['exercise', events.exerciseTemplate.id, '3x10', 'Push-ups'],
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
  
  // Sign and publish event
  workoutTemplate.id = nostrTools.getEventHash(workoutTemplate);
  workoutTemplate.sig = nostrTools.finalizeEvent(workoutTemplate, privateKey);
  
  events.workoutTemplate = workoutTemplate;
  await publishEvent(workoutTemplate);
  console.log(`✅ Workout Template published with ID: ${workoutTemplate.id}`);
  
  // Verify it was stored
  await verifyEventStored(workoutTemplate.id);
}

// Test 3: Create and publish a Workout Record
async function testWorkoutRecord() {
  console.log('\n📋 Test 3: Create Workout Record');
  
  if (!events.exerciseTemplate || !events.workoutTemplate) {
    throw new Error('Templates not created yet');
  }
  
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
      ['workout', events.workoutTemplate.id],
      ['exercise', events.exerciseTemplate.id, '3x10', 'Push-ups'],
      ['feeling', '8'],
      ['privacy', 'limited']
    ],
    content: JSON.stringify({
      notes: 'Completed test workout successfully',
      exercises: [
        {
          id: events.exerciseTemplate.id,
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
  
  // Sign and publish event
  workoutRecord.id = nostrTools.getEventHash(workoutRecord);
  workoutRecord.sig = nostrTools.finalizeEvent(workoutRecord, privateKey);
  
  events.workoutRecord = workoutRecord;
  await publishEvent(workoutRecord);
  console.log(`✅ Workout Record published with ID: ${workoutRecord.id}`);
  
  // Verify it was stored
  await verifyEventStored(workoutRecord.id);
}

// Test 4: Query for events
async function testQueries() {
  console.log('\n📋 Test 4: Querying Events');
  
  // Test query for exercise templates
  console.log('Testing query for exercise templates (kind: 33401)...');
  const exerciseTemplates = await queryEvents({
    kinds: [33401],
    authors: [publicKey]
  });
  
  if (exerciseTemplates.length === 0) {
    throw new Error('No exercise templates found');
  }
  console.log(`✅ Found ${exerciseTemplates.length} exercise template(s)`);
  
  // Test query for workout templates
  console.log('Testing query for workout templates (kind: 33402)...');
  const workoutTemplates = await queryEvents({
    kinds: [33402],
    authors: [publicKey]
  });
  
  if (workoutTemplates.length === 0) {
    throw new Error('No workout templates found');
  }
  console.log(`✅ Found ${workoutTemplates.length} workout template(s)`);
  
  // Test query for workout records
  console.log('Testing query for workout records (kind: 1301)...');
  const workoutRecords = await queryEvents({
    kinds: [1301],
    authors: [publicKey]
  });
  
  if (workoutRecords.length === 0) {
    throw new Error('No workout records found');
  }
  console.log(`✅ Found ${workoutRecords.length} workout record(s)`);
  
  // Test query with tag filters
  console.log('Testing query with tag filters...');
  const strengthWorkouts = await queryEvents({
    kinds: [1301],
    authors: [publicKey],
    '#type': ['strength']
  });
  
  if (strengthWorkouts.length === 0) {
    throw new Error('No strength workouts found with tag filter');
  }
  console.log(`✅ Found ${strengthWorkouts.length} strength workout(s) with tag filter`);
}

// Test 5: Test privacy levels
async function testPrivacyLevels() {
  console.log('\n📋 Test 5: Testing Privacy Levels');
  
  // Create and publish events with different privacy levels
  const now = Math.floor(Date.now() / 1000);
  
  // Public event
  const publicEvent = {
    kind: 1301,
    pubkey: publicKey,
    created_at: now,
    tags: [
      ['d', crypto.randomBytes(16).toString('hex')],
      ['title', 'Public Workout'],
      ['type', 'cardio'],
      ['started_at', (now - 1200).toString()],
      ['ended_at', now.toString()],
      ['privacy', 'public']
    ],
    content: 'Test public workout'
  };
  
  // Limited event
  const limitedEvent = {
    kind: 1301,
    pubkey: publicKey,
    created_at: now,
    tags: [
      ['d', crypto.randomBytes(16).toString('hex')],
      ['title', 'Limited Workout'],
      ['type', 'cardio'],
      ['started_at', (now - 1200).toString()],
      ['ended_at', now.toString()],
      ['privacy', 'limited']
    ],
    content: 'Test limited workout'
  };
  
  // Private event
  const privateEvent = {
    kind: 1301,
    pubkey: publicKey,
    created_at: now,
    tags: [
      ['d', crypto.randomBytes(16).toString('hex')],
      ['title', 'Private Workout'],
      ['type', 'cardio'],
      ['started_at', (now - 1200).toString()],
      ['ended_at', now.toString()],
      ['privacy', 'private']
    ],
    content: 'Test private workout'
  };
  
  // Sign and publish events
  publicEvent.id = nostrTools.getEventHash(publicEvent);
  publicEvent.sig = nostrTools.finalizeEvent(publicEvent, privateKey);
  
  limitedEvent.id = nostrTools.getEventHash(limitedEvent);
  limitedEvent.sig = nostrTools.finalizeEvent(limitedEvent, privateKey);
  
  privateEvent.id = nostrTools.getEventHash(privateEvent);
  privateEvent.sig = nostrTools.finalizeEvent(privateEvent, privateKey);
  
  await publishEvent(publicEvent);
  console.log(`✅ Public workout published with ID: ${publicEvent.id}`);
  
  await publishEvent(limitedEvent);
  console.log(`✅ Limited workout published with ID: ${limitedEvent.id}`);
  
  await publishEvent(privateEvent);
  console.log(`✅ Private workout published with ID: ${privateEvent.id}`);
  
  // Verify storage based on privacy level
  console.log('Verifying events with different privacy levels...');
  
  await verifyEventStored(publicEvent.id);
  console.log('✅ Public event verified');
  
  await verifyEventStored(limitedEvent.id);
  console.log('✅ Limited event verified');
  
  try {
    await verifyEventStored(privateEvent.id);
    console.log('✅ Private event verified (may be stored on Blossom node)');
  } catch (error) {
    console.log('ℹ️ Private event not found on main relay (expected if using Blossom node)');
  }
}

// Helper function to publish an event
async function publishEvent(event) {
  return new Promise((resolve, reject) => {
    const message = JSON.stringify(['EVENT', event]);
    relay.send(message);
    
    // Listen for OK message
    const listener = (data) => {
      const message = JSON.parse(data);
      if (message[0] === 'OK' && message[1] === event.id) {
        relay.removeEventListener('message', listener);
        resolve(true);
      }
    };
    
    relay.addEventListener('message', listener);
    
    // Timeout after 5 seconds
    setTimeout(() => {
      relay.removeEventListener('message', listener);
      reject(new Error(`Timeout waiting for OK message for event ${event.id}`));
    }, 5000);
  });
}

// Helper function to verify an event was stored
async function verifyEventStored(eventId) {
  return new Promise((resolve, reject) => {
    const subscriptionId = 'verify_' + Math.random().toString(36).substring(2, 15);
    const message = JSON.stringify(['REQ', subscriptionId, { ids: [eventId] }]);
    relay.send(message);
    
    const listener = (data) => {
      const message = JSON.parse(data);
      if (message[0] === 'EVENT' && message[1] === subscriptionId) {
        relay.removeEventListener('message', listener);
        resolve(true);
      } else if (message[0] === 'EOSE' && message[1] === subscriptionId) {
        relay.removeEventListener('message', listener);
        reject(new Error(`Event ${eventId} not found on relay`));
      }
    };
    
    relay.addEventListener('message', listener);
    
    // Timeout after 5 seconds
    setTimeout(() => {
      relay.removeEventListener('message', listener);
      reject(new Error(`Timeout waiting for event ${eventId}`));
    }, 5000);
  });
}

// Helper function to query events
async function queryEvents(filter) {
  return new Promise((resolve, reject) => {
    const subscriptionId = 'query_' + Math.random().toString(36).substring(2, 15);
    const message = JSON.stringify(['REQ', subscriptionId, filter]);
    relay.send(message);
    
    const events = [];
    
    const listener = (data) => {
      const message = JSON.parse(data);
      if (message[0] === 'EVENT' && message[1] === subscriptionId) {
        events.push(message[2]);
      } else if (message[0] === 'EOSE' && message[1] === subscriptionId) {
        relay.removeEventListener('message', listener);
        resolve(events);
      }
    };
    
    relay.addEventListener('message', listener);
    
    // Timeout after 10 seconds
    setTimeout(() => {
      relay.removeEventListener('message', listener);
      if (events.length > 0) {
        resolve(events);
      } else {
        reject(new Error('Timeout waiting for query results'));
      }
    }, 10000);
  });
}

relay.on('close', () => {
  console.log('Disconnected from relay');
}); 