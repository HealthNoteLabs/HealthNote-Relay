# HealthNote-Relay Product Context

## Problem Statement
Traditional health and fitness apps store user data in centralized servers, giving users limited control over their data and raising privacy concerns. Many users are hesitant to track their health metrics due to these privacy issues, and those who do often cannot easily share specific data with healthcare providers, coaches, or friends without exposing more than intended.

## Solution
HealthNote-Relay addresses these issues by building on the Nostr protocol and extending it with Blossom integration to create a decentralized, privacy-focused health data platform with:

1. **Three-tiered privacy model**:
   - Public data: Achievements, fitness challenges, aggregate metrics
   - Limited access: Shared with specific npubs (trainers, healthcare providers)
   - Private data: Encrypted and stored on personal Blossom nodes

2. **User-controlled data**:
   - Users decide where their data is stored
   - Fine-grained sharing permissions
   - Configurable data retention policies

3. **Social fitness features**:
   - Fitness challenges and competitions
   - Anonymous comparative metrics
   - Achievement badges and milestones

## Target Audience
- Privacy-conscious health enthusiasts
- Fitness trainers and coaches
- Healthcare providers interested in patient-owned data
- Software developers building health and fitness applications

## User Experience Goals
1. **Simple and intuitive**: Easy to integrate with existing applications
2. **Transparent privacy controls**: Clear visibility of where data is stored
3. **Flexible sharing options**: Seamless sharing with precise control
4. **Reliable performance**: Fast data retrieval and minimal downtime
5. **Interoperability**: Compatible with the broader Nostr ecosystem 