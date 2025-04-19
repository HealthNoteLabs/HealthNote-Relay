# HealthNote-Relay Privacy Policy and Terms of Use

## Privacy Policy

### Our Commitment

HealthNote-Relay is built on the principle that your health data belongs to you alone. We are committed to providing a relay service that respects user sovereignty and privacy as foundational values, not afterthoughts.

### Data We Process

As a specialized Nostr relay for health and fitness data, we process:

1. **Events published to the network** in accordance with the NIP-101e specification
2. **Cryptographic signatures** to verify event authenticity
3. **Metadata tags** used for categorization and privacy classification

### How We Handle Your Data

#### Privacy Classification

HealthNote-Relay implements a three-tiered privacy model:

- **Public Data**: Exercise and workout templates intended for public sharing are stored on the main relay and remain publicly accessible.
- **Limited Data**: Workout records with the "limited" privacy tag are stored on the main relay but are only accessible to users explicitly granted access.
- **Private Data**: Events with the "private" privacy tag are automatically routed to Blossom nodes under your control, never stored on our central relay.

#### Data Storage

- We do not aggregate, analyze, or mine your health data for commercial purposes.
- Data is stored exactly as provided, with no modification other than indexing for retrieval.
- We implement the expiration tags ("expires_at") to honor user-defined data retention periods, automatically removing data when requested.

#### End-to-End Encryption

- Events marked for encrypted sharing use Nostr's NIP-04 encryption standard.
- Encryption and decryption happen exclusively on client devices.
- We never have access to encryption keys or plaintext content of encrypted events.

### Third Parties

- We do not sell, rent, or lease user data to any third parties.
- We do not partner with advertising networks or analytics providers.
- We do not use tracking technologies like cookies or fingerprinting.

### Data Security

- The relay uses industry-standard security measures to protect against unauthorized access.
- Regular security audits help ensure the integrity of our systems.
- All API communications are encrypted using TLS.

## Terms of Use

### Acceptable Use

Users of HealthNote-Relay agree to:

1. Respect the privacy preferences specified in event tags
2. Not attempt to circumvent the privacy controls implemented by the relay
3. Not use the relay for any purpose that violates applicable laws or regulations
4. Not attempt to overload, flood, or disrupt the relay service

### Reliability and Availability

- HealthNote-Relay is provided as-is, without warranties of reliability or availability.
- We strive to maintain high uptime but do not guarantee uninterrupted service.
- For critical health data, we recommend using Blossom nodes for local storage and backup.

### Data Sovereignty

- You retain all rights to the data you publish.
- You can request deletion of your data at any time by using the appropriate NIP mechanisms.
- You control how long your data is stored through "expires_at" tags.

### Changes to Terms

We may update our Privacy Policy and Terms of Use to reflect changes in our practices or for other operational, legal, or regulatory reasons. We will notify users of any material changes through:

- Updates to our website
- Announcements on our Nostr account
- NIP-01 NOTICE events published by the relay

### Governing Philosophy

HealthNote-Relay operates according to these guiding principles:

1. **User Sovereignty**: Users should have complete control over their health data.
2. **Privacy by Design**: Privacy protection is built into our architecture, not added as an afterthought.
3. **Transparency**: We are open about our data practices and system architecture.
4. **Minimalism**: We collect and store only what is necessary to provide the relay service.

## Contact Information

For questions about our privacy practices or terms of use:

- Nostr: npub_RELAY_PUBLIC_KEY
- Email: contact@healthnote-relay.example.com
- GitHub Issues: https://github.com/HealthNoteLabs/HealthNote-Relay/issues

---

*Last Updated: [Current Date]*

*This policy is licensed under CC-BY-SA 4.0 and may be adapted by other Nostr relay operators committed to privacy and user sovereignty.* 