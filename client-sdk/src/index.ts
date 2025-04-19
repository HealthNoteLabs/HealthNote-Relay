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

/**
 * Client SDK for Health & Fitness Relay with Blossom integration
 */
export class HealthNostrClient {
  private mainRelay: string;
  private blossomNodes: BlossomNode[];
  private privateKey: string;

  /**
   * Create a new HealthNostrClient
   */
  constructor(config: HealthNostrClientConfig) {
    this.mainRelay = config.mainRelay;
    this.blossomNodes = config.blossomNodes || [];
    this.privateKey = config.privateKey;
  }

  /**
   * Connect to the main relay and Blossom nodes
   */
  async connect(): Promise<void> {
    console.log("Connecting to Health & Fitness Relay...");
  }
} 