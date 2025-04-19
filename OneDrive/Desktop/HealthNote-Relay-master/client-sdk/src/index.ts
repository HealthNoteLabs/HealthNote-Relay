import { Event, Filter, getPublicKey, nip04, nip19, signEvent } from 'nostr-tools';

// Event kind constants
export const WORKOUT_EVENTS = {
  WORKOUT_RECORD: 1301,
  EXERCISE_TEMPLATE: 33401,
  WORKOUT_TEMPLATE: 33402
};

export interface HealthNostrClientConfig {
  mainRelay: string;
  blossomNodes?: BlossomNode[];
  privateKey: string;
}

export interface BlossomNode {
  url: string;
  pubkey: string;
  supportedMetrics?: number[];
}

export enum PrivacyLevel {
  Public,  // Stored on main relay, visible to everyone
  Limited, // Stored on main relay with access control
  Private  // Stored on Blossom node with encryption
}

export interface HealthMetric {
  kind: number;
  value: number | string;
  unit?: string;
  timestamp?: number;
  privacyLevel: PrivacyLevel;
  tags?: string[][];
}

export interface ExerciseTemplate {
  id?: string;
  title: string;
  description?: string;
  format: string[];
  formatUnits?: string[];
  equipment?: string[];
  difficulty?: string;
  tags?: string[][];
  privacyLevel?: PrivacyLevel;
}

export interface WorkoutTemplate {
  id?: string;
  title: string;
  description?: string;
  exercises: string[];
  duration?: number;
  type?: string;
  difficulty?: string;
  tags?: string[][];
  privacyLevel?: PrivacyLevel;
}

export interface WorkoutRecord {
  id?: string;
  title: string;
  type: string;
  startTime: number;
  endTime: number;
  exercises: any[];
  completed?: boolean;
  notes?: string;
  tags?: string[][];
  privacyLevel?: PrivacyLevel;
}

/**
 * Client SDK for Health & Fitness Relay with Blossom integration
 */
export class HealthNostrClient {
  private mainRelay: string;
  private blossomNodes: BlossomNode[];
  private privateKey: string;
  private pubkey: string;
  private mainRelaySocket: WebSocket | null = null;
  private blossomSockets: Map<string, WebSocket> = new Map();
  private subscriptions: Map<string, Filter[]> = new Map();

  /**
   * Create a new HealthNostrClient
   */
  constructor(config: HealthNostrClientConfig) {
    this.mainRelay = config.mainRelay;
    this.blossomNodes = config.blossomNodes || [];
    this.privateKey = config.privateKey;
    this.pubkey = getPublicKey(this.privateKey);
  }

  /**
   * Connect to the main relay and Blossom nodes
   */
  async connect(): Promise<void> {
    console.log("Connecting to Health & Fitness Relay...");
    
    // Connect to main relay
    await this.connectToMainRelay();
    
    // Connect to Blossom nodes
    for (const node of this.blossomNodes) {
      await this.connectToBlossomNode(node);
    }
    
    // Get available Blossom nodes from main relay
    await this.discoverBlossomNodes();
  }
  
  /**
   * Disconnect from all relays
   */
  disconnect(): void {
    if (this.mainRelaySocket) {
      this.mainRelaySocket.close();
      this.mainRelaySocket = null;
    }
    
    for (const [url, socket] of this.blossomSockets.entries()) {
      socket.close();
      this.blossomSockets.delete(url);
    }
    
    this.subscriptions.clear();
  }
  
  /**
   * Publish a health metric
   */
  async publishMetric(metric: HealthMetric): Promise<string> {
    const timestamp = metric.timestamp || Math.floor(Date.now() / 1000);
    const tags = metric.tags || [];
    
    // Add privacy level tag
    switch (metric.privacyLevel) {
      case PrivacyLevel.Public:
        tags.push(["privacy", "public"]);
        break;
      case PrivacyLevel.Limited:
        tags.push(["privacy", "limited"]);
        break;
      case PrivacyLevel.Private:
        tags.push(["privacy", "private"]);
        break;
    }
    
    // Add unit tag if present
    if (metric.unit) {
      tags.push(["unit", metric.unit]);
    }
    
    let content = String(metric.value);
    
    // Encrypt content for private metrics
    if (metric.privacyLevel === PrivacyLevel.Private) {
      // Self-encrypt for now; in a real implementation we would use the recipient's public key
      content = await nip04.encrypt(this.privateKey, this.pubkey, content);
    }
    
    // Create the event
    const event: Event = {
      kind: metric.kind,
      created_at: timestamp,
      tags,
      content,
      pubkey: this.pubkey,
    } as Event;
    
    // Sign the event
    const signedEvent = await this.signEvent(event);
    
    // Determine where to publish based on privacy level
    switch (metric.privacyLevel) {
      case PrivacyLevel.Public:
      case PrivacyLevel.Limited:
        await this.publishToMainRelay(signedEvent);
        break;
      case PrivacyLevel.Private:
        // Find appropriate Blossom node
        const node = this.findBlossomNodeForKind(metric.kind);
        if (node) {
          await this.publishToBlossomNode(signedEvent, node);
        } else {
          // Fall back to main relay if no suitable Blossom node
          await this.publishToMainRelay(signedEvent);
        }
        break;
    }
    
    return signedEvent.id;
  }
  
  /**
   * Query health metrics
   */
  async queryMetrics(filter: Filter): Promise<Event[]> {
    const subscriptionId = `sub_${Math.random().toString(36).substring(2, 15)}`;
    const results: Event[] = [];
    const promises: Promise<Event[]>[] = [];
    
    // Query main relay
    promises.push(this.queryMainRelay(subscriptionId, filter));
    
    // Query relevant Blossom nodes
    for (const node of this.blossomNodes) {
      if (this.shouldQueryBlossomNode(node, filter)) {
        promises.push(this.queryBlossomNode(subscriptionId, filter, node));
      }
    }
    
    // Combine results
    const allResults = await Promise.all(promises);
    for (const events of allResults) {
      results.push(...events);
    }
    
    // Sort by created_at
    results.sort((a, b) => b.created_at - a.created_at);
    
    return results;
  }
  
  /**
   * Get profile information (kind 0 event)
   */
  async getProfile(): Promise<any> {
    const filter: Filter = {
      kinds: [0],
      authors: [this.pubkey],
      limit: 1
    };
    
    const events = await this.queryMetrics(filter);
    if (events.length > 0) {
      try {
        return JSON.parse(events[0].content);
      } catch (e) {
        return {};
      }
    }
    
    return {};
  }
  
  /**
   * Update profile information
   */
  async updateProfile(profile: any): Promise<string> {
    const event: Event = {
      kind: 0,
      created_at: Math.floor(Date.now() / 1000),
      tags: [],
      content: JSON.stringify(profile),
      pubkey: this.pubkey,
    } as Event;
    
    const signedEvent = await this.signEvent(event);
    await this.publishToMainRelay(signedEvent);
    
    return signedEvent.id;
  }
  
  // Private methods
  
  private async connectToMainRelay(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const socket = new WebSocket(this.mainRelay);
        
        socket.onopen = () => {
          this.mainRelaySocket = socket;
          console.log(`Connected to main relay: ${this.mainRelay}`);
          resolve();
        };
        
        socket.onerror = (error) => {
          console.error(`Error connecting to main relay: ${error}`);
          reject(error);
        };
        
        socket.onclose = () => {
          console.log(`Disconnected from main relay: ${this.mainRelay}`);
          this.mainRelaySocket = null;
        };
        
        socket.onmessage = (msg) => {
          this.handleRelayMessage(msg.data);
        };
      } catch (error) {
        console.error(`Failed to connect to main relay: ${error}`);
        reject(error);
      }
    });
  }
  
  private async connectToBlossomNode(node: BlossomNode): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = node.url.replace(/^http/, 'ws');
        const socket = new WebSocket(wsUrl);
        
        socket.onopen = () => {
          this.blossomSockets.set(node.url, socket);
          console.log(`Connected to Blossom node: ${node.url}`);
          resolve();
        };
        
        socket.onerror = (error) => {
          console.error(`Error connecting to Blossom node: ${error}`);
          reject(error);
        };
        
        socket.onclose = () => {
          console.log(`Disconnected from Blossom node: ${node.url}`);
          this.blossomSockets.delete(node.url);
        };
        
        socket.onmessage = (msg) => {
          this.handleRelayMessage(msg.data);
        };
      } catch (error) {
        console.error(`Failed to connect to Blossom node: ${error}`);
        reject(error);
      }
    });
  }
  
  private async discoverBlossomNodes(): Promise<void> {
    // In a real implementation, we would query the main relay for Blossom nodes
    // and update this.blossomNodes accordingly
    console.log("Discovering Blossom nodes...");
  }
  
  private findBlossomNodeForKind(kind: number): BlossomNode | null {
    for (const node of this.blossomNodes) {
      if (!node.supportedMetrics || node.supportedMetrics.includes(kind)) {
        return node;
      }
    }
    return null;
  }
  
  private shouldQueryBlossomNode(node: BlossomNode, filter: Filter): boolean {
    // Check if the node supports any of the kinds in the filter
    if (!filter.kinds || filter.kinds.length === 0) {
      return true;
    }
    
    if (!node.supportedMetrics || node.supportedMetrics.length === 0) {
      return true;
    }
    
    return filter.kinds.some(kind => node.supportedMetrics!.includes(kind));
  }
  
  private async signEvent(event: Event): Promise<Event> {
    return signEvent(event, this.privateKey);
  }
  
  private async publishToMainRelay(event: Event): Promise<void> {
    if (!this.mainRelaySocket) {
      throw new Error("Not connected to main relay");
    }
    
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error("Publish timeout"));
      }, 5000);
      
      const messageHandler = (msg: any) => {
        try {
          const data = JSON.parse(msg.data);
          if (Array.isArray(data) && data[0] === "OK" && data[1] === event.id) {
            clearTimeout(timeoutId);
            this.mainRelaySocket!.removeEventListener("message", messageHandler);
            resolve();
          }
        } catch (error) {
          // Ignore parsing errors
        }
      };
      
      this.mainRelaySocket.addEventListener("message", messageHandler);
      this.mainRelaySocket.send(JSON.stringify(["EVENT", event]));
    });
  }
  
  private async publishToBlossomNode(event: Event, node: BlossomNode): Promise<void> {
    const socket = this.blossomSockets.get(node.url);
    if (!socket) {
      throw new Error(`Not connected to Blossom node: ${node.url}`);
    }
    
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error("Publish timeout"));
      }, 5000);
      
      const messageHandler = (msg: any) => {
        try {
          const data = JSON.parse(msg.data);
          if (Array.isArray(data) && data[0] === "OK" && data[1] === event.id) {
            clearTimeout(timeoutId);
            socket.removeEventListener("message", messageHandler);
            resolve();
          }
        } catch (error) {
          // Ignore parsing errors
        }
      };
      
      socket.addEventListener("message", messageHandler);
      socket.send(JSON.stringify(["EVENT", event]));
    });
  }
  
  private async queryMainRelay(subscriptionId: string, filter: Filter): Promise<Event[]> {
    if (!this.mainRelaySocket) {
      throw new Error("Not connected to main relay");
    }
    
    return new Promise((resolve, reject) => {
      const events: Event[] = [];
      const timeoutId = setTimeout(() => {
        this.mainRelaySocket!.send(JSON.stringify(["CLOSE", subscriptionId]));
        resolve(events);
      }, 5000);
      
      const messageHandler = (msg: any) => {
        try {
          const data = JSON.parse(msg.data);
          if (Array.isArray(data)) {
            if (data[0] === "EVENT" && data[1] === subscriptionId) {
              events.push(data[2]);
            } else if (data[0] === "EOSE" && data[1] === subscriptionId) {
              clearTimeout(timeoutId);
              this.mainRelaySocket!.removeEventListener("message", messageHandler);
              this.mainRelaySocket!.send(JSON.stringify(["CLOSE", subscriptionId]));
              resolve(events);
            }
          }
        } catch (error) {
          // Ignore parsing errors
        }
      };
      
      this.mainRelaySocket.addEventListener("message", messageHandler);
      this.mainRelaySocket.send(JSON.stringify(["REQ", subscriptionId, filter]));
    });
  }
  
  private async queryBlossomNode(subscriptionId: string, filter: Filter, node: BlossomNode): Promise<Event[]> {
    const socket = this.blossomSockets.get(node.url);
    if (!socket) {
      return [];
    }
    
    return new Promise((resolve, reject) => {
      const events: Event[] = [];
      const timeoutId = setTimeout(() => {
        socket.send(JSON.stringify(["CLOSE", subscriptionId]));
        resolve(events);
      }, 5000);
      
      const messageHandler = (msg: any) => {
        try {
          const data = JSON.parse(msg.data);
          if (Array.isArray(data)) {
            if (data[0] === "EVENT" && data[1] === subscriptionId) {
              events.push(data[2]);
            } else if (data[0] === "EOSE" && data[1] === subscriptionId) {
              clearTimeout(timeoutId);
              socket.removeEventListener("message", messageHandler);
              socket.send(JSON.stringify(["CLOSE", subscriptionId]));
              resolve(events);
            }
          }
        } catch (error) {
          // Ignore parsing errors
        }
      };
      
      socket.addEventListener("message", messageHandler);
      socket.send(JSON.stringify(["REQ", subscriptionId, filter]));
    });
  }
  
  private handleRelayMessage(data: string): void {
    try {
      const message = JSON.parse(data);
      if (!Array.isArray(message)) {
        return;
      }
      
      const [type, ...params] = message;
      
      switch (type) {
        case "EVENT":
          // Handle event
          break;
        case "NOTICE":
          console.log(`Relay notice: ${params[0]}`);
          break;
      }
    } catch (error) {
      // Ignore parsing errors
    }
  }

  /**
   * Publish an exercise template (NIP-101e)
   */
  async publishExerciseTemplate(template: ExerciseTemplate): Promise<string> {
    const timestamp = Math.floor(Date.now() / 1000);
    const tags = template.tags || [];
    
    // Add required tags
    tags.push(["d", crypto.randomUUID()]);
    tags.push(["title", template.title]);
    
    // Add format tags
    if (template.format && template.format.length > 0) {
      tags.push(["format", ...template.format]);
    }
    
    if (template.formatUnits && template.formatUnits.length > 0) {
      tags.push(["format_units", ...template.formatUnits]);
    }
    
    // Add optional tags
    if (template.equipment && template.equipment.length > 0) {
      tags.push(["equipment", ...template.equipment]);
    }
    
    if (template.difficulty) {
      tags.push(["difficulty", template.difficulty]);
    }
    
    // Add privacy level tag
    const privacyLevel = template.privacyLevel || PrivacyLevel.Public;
    switch (privacyLevel) {
      case PrivacyLevel.Public:
        tags.push(["privacy", "public"]);
        break;
      case PrivacyLevel.Limited:
        tags.push(["privacy", "limited"]);
        break;
      case PrivacyLevel.Private:
        tags.push(["privacy", "private"]);
        break;
    }
    
    // Create the event
    const event: Event = {
      kind: WORKOUT_EVENTS.EXERCISE_TEMPLATE,
      created_at: timestamp,
      tags,
      content: template.description || "",
      pubkey: this.pubkey,
    } as Event;
    
    // Sign the event
    const signedEvent = await this.signEvent(event);
    
    // Determine where to publish based on privacy level
    switch (privacyLevel) {
      case PrivacyLevel.Public:
      case PrivacyLevel.Limited:
        await this.publishToMainRelay(signedEvent);
        break;
      case PrivacyLevel.Private:
        // Find appropriate Blossom node
        const node = this.findBlossomNodeForKind(WORKOUT_EVENTS.EXERCISE_TEMPLATE);
        if (node) {
          await this.publishToBlossomNode(signedEvent, node);
        } else {
          // Fall back to main relay if no suitable Blossom node
          await this.publishToMainRelay(signedEvent);
        }
        break;
    }
    
    return signedEvent.id;
  }
  
  /**
   * Publish a workout template (NIP-101e)
   */
  async publishWorkoutTemplate(template: WorkoutTemplate): Promise<string> {
    const timestamp = Math.floor(Date.now() / 1000);
    const tags = template.tags || [];
    
    // Add required tags
    tags.push(["d", crypto.randomUUID()]);
    tags.push(["title", template.title]);
    
    // Add exercises
    for (const exercise of template.exercises) {
      tags.push(["exercise", exercise]);
    }
    
    // Add optional tags
    if (template.duration) {
      tags.push(["duration", template.duration.toString(), "seconds"]);
    }
    
    if (template.type) {
      tags.push(["type", template.type]);
    }
    
    if (template.difficulty) {
      tags.push(["difficulty", template.difficulty]);
    }
    
    // Add privacy level tag
    const privacyLevel = template.privacyLevel || PrivacyLevel.Public;
    switch (privacyLevel) {
      case PrivacyLevel.Public:
        tags.push(["privacy", "public"]);
        break;
      case PrivacyLevel.Limited:
        tags.push(["privacy", "limited"]);
        break;
      case PrivacyLevel.Private:
        tags.push(["privacy", "private"]);
        break;
    }
    
    // Create the event
    const event: Event = {
      kind: WORKOUT_EVENTS.WORKOUT_TEMPLATE,
      created_at: timestamp,
      tags,
      content: template.description || "",
      pubkey: this.pubkey,
    } as Event;
    
    // Sign the event
    const signedEvent = await this.signEvent(event);
    
    // Determine where to publish based on privacy level
    switch (privacyLevel) {
      case PrivacyLevel.Public:
      case PrivacyLevel.Limited:
        await this.publishToMainRelay(signedEvent);
        break;
      case PrivacyLevel.Private:
        // Find appropriate Blossom node
        const node = this.findBlossomNodeForKind(WORKOUT_EVENTS.WORKOUT_TEMPLATE);
        if (node) {
          await this.publishToBlossomNode(signedEvent, node);
        } else {
          // Fall back to main relay if no suitable Blossom node
          await this.publishToMainRelay(signedEvent);
        }
        break;
    }
    
    return signedEvent.id;
  }
  
  /**
   * Publish a workout record (NIP-101e)
   */
  async publishWorkoutRecord(record: WorkoutRecord): Promise<string> {
    const timestamp = Math.floor(Date.now() / 1000);
    const tags = record.tags || [];
    
    // Add required tags
    tags.push(["d", crypto.randomUUID()]);
    tags.push(["title", record.title]);
    tags.push(["type", record.type]);
    tags.push(["start", record.startTime.toString()]);
    tags.push(["end", record.endTime.toString()]);
    
    // Add exercises
    for (const exercise of record.exercises) {
      // Format: ["exercise", "template_id", "relay_url", ...exercise_stats]
      if (typeof exercise === 'string') {
        // Simple reference to an exercise by ID
        tags.push(["exercise", exercise]);
      } else if (Array.isArray(exercise)) {
        // Full exercise data
        tags.push(["exercise", ...exercise]);
      }
    }
    
    // Add optional tags
    if (record.completed !== undefined) {
      tags.push(["completed", record.completed.toString()]);
    }
    
    // Add privacy level tag
    const privacyLevel = record.privacyLevel || PrivacyLevel.Limited;
    switch (privacyLevel) {
      case PrivacyLevel.Public:
        tags.push(["privacy", "public"]);
        break;
      case PrivacyLevel.Limited:
        tags.push(["privacy", "limited"]);
        break;
      case PrivacyLevel.Private:
        tags.push(["privacy", "private"]);
        break;
    }
    
    // Create the event
    const event: Event = {
      kind: WORKOUT_EVENTS.WORKOUT_RECORD,
      created_at: timestamp,
      tags,
      content: record.notes || "",
      pubkey: this.pubkey,
    } as Event;
    
    // Sign the event
    const signedEvent = await this.signEvent(event);
    
    // Determine where to publish based on privacy level
    switch (privacyLevel) {
      case PrivacyLevel.Public:
      case PrivacyLevel.Limited:
        await this.publishToMainRelay(signedEvent);
        break;
      case PrivacyLevel.Private:
        // Find appropriate Blossom node
        const node = this.findBlossomNodeForKind(WORKOUT_EVENTS.WORKOUT_RECORD);
        if (node) {
          await this.publishToBlossomNode(signedEvent, node);
        } else {
          // Fall back to main relay if no suitable Blossom node
          await this.publishToMainRelay(signedEvent);
        }
        break;
    }
    
    return signedEvent.id;
  }
  
  /**
   * Get exercise templates
   */
  async getExerciseTemplates(filter: Partial<Filter> = {}): Promise<Event[]> {
    const queryFilter: Filter = {
      kinds: [WORKOUT_EVENTS.EXERCISE_TEMPLATE],
      ...filter
    };
    
    return this.queryMetrics(queryFilter);
  }
  
  /**
   * Get workout templates
   */
  async getWorkoutTemplates(filter: Partial<Filter> = {}): Promise<Event[]> {
    const queryFilter: Filter = {
      kinds: [WORKOUT_EVENTS.WORKOUT_TEMPLATE],
      ...filter
    };
    
    return this.queryMetrics(queryFilter);
  }
  
  /**
   * Get workout records
   */
  async getWorkoutRecords(filter: Partial<Filter> = {}): Promise<Event[]> {
    const queryFilter: Filter = {
      kinds: [WORKOUT_EVENTS.WORKOUT_RECORD],
      ...filter
    };
    
    return this.queryMetrics(queryFilter);
  }
} 