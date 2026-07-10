// ==========================================
// DARK WEB INTELLIGENCE - OSINT TYPES
// Military-Grade Intelligence Platform
// ==========================================

// === EMAIL INTELLIGENCE ===
export interface EmailIntelResult {
  email: string;
  reputation: number;
  suspicious: boolean;
  references: number;
  details: {
    blacklisted: boolean;
    maliciousActivity: boolean;
    spam: boolean;
    spoofable: boolean;
    freeProvider: boolean;
    disposable: boolean;
    dataBreach: boolean;
    firstSeen?: Date;
    lastSeen?: Date;
  };
  breaches: DataBreach[];
  credentials: StolenCredential[];
  sources: string[];
}

export interface DataBreach {
  name: string;
  title: string;
  domain: string;
  breachDate: Date;
  addedDate: Date;
  modifiedDate: Date;
  pwnCount: number;
  description: string;
  dataClasses: string[];
  isVerified: boolean;
  isFabricated: boolean;
  isSensitive: boolean;
  isRetired: boolean;
  isSpamList: boolean;
}

export interface StolenCredential {
  email: string;
  password?: string;
  hash?: string;
  source: string;
  dateCompromised: Date;
  additionalData?: Record<string, unknown>;
}

// === NETWORK INTELLIGENCE ===
export interface NetworkIntelResult {
  ip: string;
  type: 'ipv4' | 'ipv6';
  asn: {
    asn: string;
    name: string;
    domain: string;
    route: string;
    type: string;
  };
  location: {
    city: string;
    region: string;
    country: string;
    countryCode: string;
    continent: string;
    latitude: number;
    longitude: number;
    timezone: string;
  };
  reputation: {
    score: number;
    classification: 'malicious' | 'suspicious' | 'benign' | 'unknown';
    actor?: string;
    botnet?: string;
    c2?: boolean;
  };
  services: NetworkService[];
  history: NetworkHistoryEvent[];
  openPorts: number[];
  vulnerabilities: Vulnerability[];
  threatActors: string[];
  malware: MalwareSample[];
}

export interface NetworkService {
  port: number;
  protocol: string;
  service: string;
  product?: string;
  version?: string;
  banner?: string;
  cpe?: string[];
  timestamp: Date;
}

export interface NetworkHistoryEvent {
  timestamp: Date;
  event: string;
  oldValue?: unknown;
  newValue?: unknown;
  source: string;
}

export interface Vulnerability {
  cve: string;
  cvss: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  exploitAvailable: boolean;
  patched?: boolean;
}

export interface MalwareSample {
  hash: string;
  type: string;
  family?: string;
  firstSeen: Date;
  lastSeen: Date;
  signatures: string[];
}

// === DOMAIN INTELLIGENCE ===
export interface DomainIntelResult {
  domain: string;
  registrar: {
    name: string;
    ianaId?: number;
    abuseContact?: string;
  };
  registration: {
    created: Date;
    updated: Date;
    expires: Date;
    age: number;
  };
  dns: {
    a: string[];
    aaaa: string[];
    mx: string[];
    ns: string[];
    txt: string[];
    soa?: Record<string, unknown>;
  };
  whois: WhoisRecord;
  subdomains: string[];
  certificates: SSLCertificate[];
  historical: HistoricalRecord[];
  riskScore: number;
  threats: DomainThreat[];
  relatedDomains: string[];
  infrastructure: InfrastructureMapping[];
}

export interface WhoisRecord {
  registrar?: string;
  registrant?: string;
  organization?: string;
  email?: string;
  phone?: string;
  address?: string;
  nameservers: string[];
  created?: Date;
  updated?: Date;
  expires?: Date;
  privacyProtected: boolean;
}

export interface SSLCertificate {
  subject: string;
  issuer: string;
  serialNumber: string;
  fingerprint: string;
  validFrom: Date;
  validTo: Date;
  san: string[];
  isValid: boolean;
}

export interface HistoricalRecord {
  timestamp: Date;
  recordType: string;
  value: unknown;
}

export interface DomainThreat {
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  firstSeen: Date;
  source: string;
}

export interface InfrastructureMapping {
  type: 'ip' | 'domain' | 'asn' | 'certificate';
  value: string;
  relationship: string;
  confidence: number;
}

// === DARK WEB INTELLIGENCE ===
export interface DarkWebResult {
  onionAddress?: string;
  i2pAddress?: string;
  title: string;
  description: string;
  language: string;
  category: string;
  lastSeen: Date;
  firstSeen: Date;
  status: 'online' | 'offline' | 'unknown';
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  content: DarkWebContent[];
  mentions: Mention[];
  relatedActors: ThreatActor[];
  bitcoinAddresses: string[];
  moneroAddresses: string[];
  pgpKeys: PGPKey[];
  contactInfo: ContactInfo[];
  technologies: string[];
  hosting: HostingInfo;
  ssl?: SSLCertificate;
}

export interface DarkWebContent {
  type: 'text' | 'image' | 'file' | 'database';
  url: string;
  hash: string;
  size: number;
  mimeType: string;
  extractedText?: string;
  metadata: Record<string, unknown>;
  capturedAt: Date;
}

export interface Mention {
  platform: string;
  channel?: string;
  username?: string;
  content: string;
  timestamp: Date;
  sentiment: 'positive' | 'negative' | 'neutral';
  language: string;
}

export interface ThreatActor {
  name: string;
  aliases: string[];
  group?: string;
  country?: string;
  motivation?: string;
  firstSeen: Date;
  lastSeen: Date;
  tactics: string[];
  targets: string[];
  associatedMalware: string[];
  confidence: number;
}

export interface PGPKey {
  fingerprint: string;
  keyId: string;
  algorithm: string;
  size: number;
  created: Date;
  identities: string[];
  emails: string[];
}

export interface ContactInfo {
  type: 'email' | 'jabber' | 'telegram' | 'signal' | 'wickr' | 'matrix';
  value: string;
  verified: boolean;
  lastUsed?: Date;
}

export interface HostingInfo {
  provider?: string;
  country?: string;
  ip?: string;
  reverseDns?: string;
  hostingType?: 'bulletproof' | 'compromised' | 'legitimate' | 'unknown' | 'anonymous' | 'distributed' | 'peer-to-peer' | 'cdn';
}

// === THREAT INTELLIGENCE ===
export interface ThreatIntelResult {
  ioc: IndicatorOfCompromise;
  threats: Threat[];
  campaigns: Campaign[];
  actors: ThreatActor[];
  signatures: YARASignature[];
  mitreAttacks: MITRETechnique[];
  recommendations: SecurityRecommendation[];
}

export interface IndicatorOfCompromise {
  type: 'ip' | 'domain' | 'url' | 'hash' | 'email' | 'mutex' | 'registry';
  value: string;
  confidence: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  firstSeen: Date;
  lastSeen: Date;
  sources: string[];
  tags: string[];
}

export interface Threat {
  name: string;
  category: string;
  family?: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  confidence: number;
  firstSeen: Date;
  lastSeen: Date;
  malware?: MalwareDetails;
}

export interface MalwareDetails {
  name: string;
  aliases: string[];
  type: string;
  platform: string[];
  capabilities: string[];
  c2Servers: string[];
  droppers: string[];
  signatures: string[];
  yaraRules: string[];
}

export interface Campaign {
  name: string;
  description: string;
  startDate?: Date;
  endDate?: Date;
  status: 'active' | 'inactive' | 'suspected';
  targets: string[];
  attackVectors: string[];
  associatedActors: string[];
  iocs: IndicatorOfCompromise[];
  impact: CampaignImpact;
}

export interface CampaignImpact {
  affectedOrganizations: number;
  affectedCountries: string[];
  estimatedLoss?: number;
  dataVolume?: number;
  mediaCoverage?: string[];
}

export interface YARASignature {
  name: string;
  rule: string;
  description: string;
  author: string;
  date: Date;
  hashes: string[];
  matches: number;
}

export interface MITRETechnique {
  techniqueId: string;
  name: string;
  tactic: string;
  description: string;
  platforms: string[];
  dataSources: string[];
  defenses: string[];
  detections: string[];
}

export interface SecurityRecommendation {
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  description: string;
  action: string;
  automation?: string;
  references: string[];
}

// === BLOCKCHAIN INTELLIGENCE ===
export interface BlockchainResult {
  address: string;
  type: 'bitcoin' | 'ethereum' | 'monero' | 'litecoin' | 'ripple' | 'other';
  balance: number;
  transactions: Transaction[];
  riskScore: number;
  riskCategories: RiskCategory[];
  entities: Entity[];
  clustering: ClusteringResult;
  mixingDetected: boolean;
  exchangeDeposits: ExchangeDeposit[];
  darkWebConnections: DarkWebConnection[];
}

export interface Transaction {
  hash: string;
  timestamp: Date;
  value: number;
  valueUSD?: number;
  from: string[];
  to: string[];
  fee: number;
  confirmations: number;
  blockHeight: number;
  isSuspicious: boolean;
  tags: string[];
}

export interface RiskCategory {
  category: string;
  risk: 'high' | 'medium' | 'low';
  description: string;
  evidence: string[];
}

export interface Entity {
  name: string;
  category: 'exchange' | 'mixer' | 'gambling' | 'darkmarket' | 'ransomware' | 'wallet' | 'unknown';
  confidence: number;
  addresses: string[];
  description?: string;
}

export interface ClusteringResult {
  clusterId: string;
  addresses: string[];
  entity?: Entity;
  confidence: number;
  algorithm: string;
}

export interface ExchangeDeposit {
  exchange: string;
  address: string;
  timestamp: Date;
  value: number;
  txHash: string;
}

export interface DarkWebConnection {
  market: string;
  address: string;
  product?: string;
  value: number;
  timestamp: Date;
  txHash: string;
}

// === REVERSE ENGINEERING ===
export interface ReverseEngineeringResult {
  file: FileAnalysis;
  staticAnalysis: StaticAnalysis;
  dynamicAnalysis?: DynamicAnalysis;
  memoryAnalysis?: MemoryAnalysis;
  signatures: SignatureCheck[];
  yaraMatches: YARAMatch[];
  iocs: IndicatorOfCompromise[];
}

export interface FileAnalysis {
  name: string;
  size: number;
  type: string;
  md5: string;
  sha1: string;
  sha256: string;
  ssdeep?: string;
  entropy: number;
  isPacked: boolean;
  isEncrypted: boolean;
}

export interface StaticAnalysis {
  imports: string[];
  exports: string[];
  strings: ExtractedString[];
  sections: PESection[];
  resources: PEResource[];
  certificates: SigningCertificate[];
  metadata: FileMetadata;
}

export interface ExtractedString {
  value: string;
  offset: number;
  encoding: 'ascii' | 'unicode' | 'utf8';
  suspicious: boolean;
  category?: string;
}

export interface PESection {
  name: string;
  virtualAddress: string;
  virtualSize: number;
  rawSize: number;
  entropy: number;
  characteristics: string[];
  suspicious: boolean;
}

export interface PEResource {
  type: string;
  id: number;
  language: string;
  size: number;
  md5: string;
  suspicious: boolean;
}

export interface SigningCertificate {
  subject: string;
  issuer: string;
  serialNumber: string;
  thumbprint: string;
  validFrom: Date;
  validTo: Date;
  isValid: boolean;
  isTrusted: boolean;
}

export interface FileMetadata {
  originalFilename?: string;
  internalName?: string;
  productName?: string;
  companyName?: string;
  fileDescription?: string;
  fileVersion?: string;
  productVersion?: string;
  copyright?: string;
  compiledAt?: Date;
  linker?: string;
  compiler?: string;
}

export interface DynamicAnalysis {
  processes: ProcessActivity[];
  networkActivity: NetworkActivity[];
  fileSystemActivity: FileSystemActivity[];
  registryActivity: RegistryActivity[];
  mutexes: string[];
  services: string[];
  scheduledTasks: string[];
  behaviors: string[];
  evasionTechniques: string[];
}

export interface ProcessActivity {
  pid: number;
  name: string;
  commandLine: string;
  parentPid: number;
  created: Date;
  terminated?: Date;
  injected: boolean;
  hollowed: boolean;
}

export interface NetworkActivity {
  protocol: string;
  srcIp: string;
  srcPort: number;
  dstIp: string;
  dstPort: number;
  domain?: string;
  url?: string;
  data?: string;
  timestamp: Date;
  suspicious: boolean;
}

export interface FileSystemActivity {
  operation: 'create' | 'read' | 'write' | 'delete' | 'rename' | 'copy';
  path: string;
  timestamp: Date;
  pid: number;
  suspicious: boolean;
}

export interface RegistryActivity {
  operation: 'create' | 'read' | 'write' | 'delete';
  key: string;
  valueName?: string;
  data?: string;
  timestamp: Date;
  pid: number;
  suspicious: boolean;
}

export interface MemoryAnalysis {
  processes: MemoryProcess[];
  networkConnections: MemoryNetworkConnection[];
  loadedModules: LoadedModule[];
  artifacts: Artifact[];
  injectedCode: InjectedCode[];
  rootkitIndicators: RootkitIndicator[];
}

export interface MemoryProcess {
  pid: number;
  name: string;
  ppid: number;
  path: string;
  commandLine: string;
  hash: string;
  suspicious: boolean;
  hidden: boolean;
  injected: boolean;
  hollowed: boolean;
}

export interface MemoryNetworkConnection {
  pid: number;
  protocol: string;
  localAddress: string;
  localPort: number;
  remoteAddress: string;
  remotePort: number;
  state: string;
  suspicious: boolean;
}

export interface LoadedModule {
  pid: number;
  name: string;
  path: string;
  baseAddress: string;
  size: number;
  suspicious: boolean;
}

export interface Artifact {
  type: string;
  description: string;
  location: string;
  data?: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

export interface InjectedCode {
  pid: number;
  processName: string;
  startAddress: string;
  size: number;
  protection: string;
  suspicious: boolean;
}

export interface RootkitIndicator {
  type: string;
  description: string;
  evidence: string[];
  severity: 'critical' | 'high' | 'medium';
}

export interface SignatureCheck {
  type: 'authenticode' | 'hash' | 'yara';
  valid: boolean;
  signer?: string;
  timestamp?: Date;
  thumbprint?: string;
  message: string;
}

export interface YARAMatch {
  rule: string;
  namespace: string;
  tags: string[];
  meta: Record<string, unknown>;
  strings: MatchedString[];
}

export interface MatchedString {
  identifier: string;
  instances: StringInstance[];
}

export interface StringInstance {
  offset: number;
  length: number;
  data: string;
}

export interface AnalysisRecommendation {
  category: string;
  description: string;
  action: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  automated: boolean;
}

// === RED TEAM & C2 ===
export interface RedTeamOperation {
  id: string;
  name: string;
  description: string;
  status: 'planning' | 'active' | 'paused' | 'completed' | 'cancelled';
  startDate: Date;
  endDate?: Date;
  operator: string;
  target: TargetInfo;
  agents: C2Agent[];
  commands: C2Command[];
  results: C2Result[];
  logs: OperationLog[];
  artifacts: OperationArtifact[];
}

export interface TargetInfo {
  name: string;
  type: 'organization' | 'individual' | 'infrastructure';
  scope: string[];
  exclusions: string[];
  objectives: string[];
}

export interface C2Agent {
  id: string;
  name: string;
  platform: string;
  architecture: string;
  status: 'active' | 'inactive' | 'lost' | 'destroyed';
  firstSeen: Date;
  lastSeen: Date;
  ip: string;
  hostname: string;
  username: string;
  privileges: 'user' | 'admin' | 'system' | 'root';
  sessions: C2Session[];
  capabilities: string[];
  implants: Implant[];
}

export interface C2Session {
  id: string;
  agentId: string;
  startTime: Date;
  endTime?: Date;
  status: 'active' | 'closed' | 'timeout';
  commands: C2Command[];
}

export interface C2Command {
  id: string;
  sessionId: string;
  type: string;
  command: string;
  parameters: Record<string, unknown>;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  issuedAt: Date;
  executedAt?: Date;
  completedAt?: Date;
  output?: string;
  error?: string;
  artifacts: string[];
}

export interface C2Result {
  commandId: string;
  type: string;
  data: unknown;
  size: number;
  timestamp: Date;
}

export interface OperationLog {
  timestamp: Date;
  level: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  source: string;
  details?: Record<string, unknown>;
}

export interface OperationArtifact {
  id: string;
  type: string;
  name: string;
  description: string;
  hash: string;
  size: number;
  capturedAt: Date;
  capturedBy: string;
  path: string;
}

export interface Implant {
  id: string;
  type: string;
  version: string;
  configuration: Record<string, unknown>;
  loadedAt: Date;
  status: 'active' | 'inactive' | 'detected' | 'removed';
}

// === SIEM & SOC ===
export interface SIEMEvent {
  id: string;
  timestamp: Date;
  source: string;
  sourcetype: string;
  host: string;
  index: string;
  event: string;
  fields: Record<string, unknown>;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  classification: string;
  enrichment: EnrichmentData[];
  correlations: CorrelationEvent[];
  incidents: Incident[];
}

export interface EnrichmentData {
  type: string;
  source: string;
  data: unknown;
  timestamp: Date;
}

export interface CorrelationEvent {
  id: string;
  rule: string;
  description: string;
  events: string[];
  severity: 'critical' | 'high' | 'medium' | 'low';
  timestamp: Date;
  status: 'open' | 'closed' | 'suppressed';
}

export interface Incident {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'new' | 'in_progress' | 'resolved' | 'closed';
  assignee?: string;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  events: string[];
  iocs: IndicatorOfCompromise[];
  threatActors: string[];
  mitreTechniques: MITRETechnique[];
  playbooks: PlaybookExecution[];
  notes: IncidentNote[];
}

export interface PlaybookExecution {
  playbookId: string;
  name: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt: Date;
  completedAt?: Date;
  steps: PlaybookStep[];
  results: unknown;
}

export interface PlaybookStep {
  id: string;
  name: string;
  action: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startedAt?: Date;
  completedAt?: Date;
  output?: unknown;
  error?: string;
}

export interface IncidentNote {
  author: string;
  timestamp: Date;
  content: string;
  attachments: string[];
}

// === GRAPH DATABASE ===
export interface GraphNode {
  id: string;
  type: string;
  labels: string[];
  properties: Record<string, unknown>;
  centrality?: number;
  community?: number;
}

export interface GraphRelationship {
  id: string;
  type: string;
  source: string;
  target: string;
  properties: Record<string, unknown>;
  weight?: number;
  direction: 'in' | 'out' | 'both';
}

export interface GraphQuery {
  cypher: string;
  parameters: Record<string, unknown>;
  timeout?: number;
}

export interface GraphAnalysis {
  nodes: GraphNode[];
  relationships: GraphRelationship[];
  paths: GraphPath[];
  communities: Community[];
  centralities: CentralityResult[];
  anomalies: Anomaly[];
}

export interface GraphPath {
  nodes: string[];
  relationships: string[];
  length: number;
  weight: number;
  start: string;
  end: string;
}

export interface Community {
  id: number;
  members: string[];
  size: number;
  density: number;
  centrality: number;
  label?: string;
}

export interface CentralityResult {
  node: string;
  degree: number;
  betweenness: number;
  closeness: number;
  eigenvector: number;
  pagerank: number;
}

export interface Anomaly {
  type: string;
  description: string;
  nodes: string[];
  relationships: string[];
  score: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

// === REAL-TIME MONITORING ===
export interface MonitoringStream {
  id: string;
  name: string;
  type: 'darkweb' | 'social' | 'news' | 'blockchain' | 'network' | 'threat';
  sources: string[];
  filters: StreamFilter[];
  alerts: Alert[];
  status: 'active' | 'paused' | 'stopped';
  createdAt: Date;
  lastActivity?: Date;
}

export interface StreamFilter {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'contains' | 'regex' | 'in';
  value: unknown;
}

export interface Alert {
  id: string;
  streamId: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  source: string;
  timestamp: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  iocs: IndicatorOfCompromise[];
  context: Record<string, unknown>;
}

// === TELECOM INTELLIGENCE ===
export interface TelecomResult {
  phoneNumber: string;
  country: string;
  carrier: string;
  lineType: 'mobile' | 'landline' | 'voip' | 'premium';
  isValid: boolean;
  isActive: boolean;
  ported: boolean;
  riskLevel: 'high' | 'medium' | 'low';
  associatedEmails: string[];
  associatedAccounts: SocialAccount[];
  locationHistory: LocationPoint[];
  ss7Data?: SS7Data;
  imsiData?: IMSIData;
}

export interface SocialAccount {
  platform: string;
  username: string;
  profileUrl: string;
  lastActive?: Date;
  profileData?: Record<string, unknown>;
}

export interface LocationPoint {
  timestamp: Date;
  latitude: number;
  longitude: number;
  accuracy: number;
  source: string;
}

export interface SS7Data {
  imsi: string;
  imei: string;
  mcc: string;
  mnc: string;
  lac: string;
  cellId: string;
  timestamp: Date;
}

export interface IMSIData {
  imsi: string;
  imei: string;
  operator: string;
  country: string;
  registrationDate?: Date;
  lastActivity?: Date;
  callRecords: CallRecord[];
  smsRecords: SMSRecord[];
  dataSessions: DataSession[];
}

export interface CallRecord {
  timestamp: Date;
  duration: number;
  direction: 'incoming' | 'outgoing';
  number: string;
  location?: LocationPoint;
}

export interface SMSRecord {
  timestamp: Date;
  direction: 'incoming' | 'outgoing';
  number: string;
  content?: string;
  location?: LocationPoint;
}

export interface DataSession {
  startTime: Date;
  endTime?: Date;
  duration: number;
  dataVolume: number;
  ipAddress?: string;
  location?: LocationPoint;
}

// === FACE & VOICE RECOGNITION ===
export interface FaceRecognitionResult {
  imageHash: string;
  faces: DetectedFace[];
  matches: FaceMatch[];
  metadata: ImageMetadata;
}

export interface DetectedFace {
  faceId: string;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  landmarks: FacialLandmark[];
  attributes: FaceAttributes;
  confidence: number;
}

export interface FacialLandmark {
  type: string;
  x: number;
  y: number;
}

export interface FaceAttributes {
  age?: number;
  gender?: 'male' | 'female';
  emotion?: string;
  glasses?: boolean;
  sunglasses?: boolean;
  beard?: boolean;
  mustache?: boolean;
  smile?: number;
}

export interface FaceMatch {
  faceId: string;
  personId: string;
  name?: string;
  confidence: number;
  sources: MatchSource[];
  firstSeen?: Date;
  lastSeen?: Date;
  occurrences: number;
}

export interface MatchSource {
  platform: string;
  url: string;
  timestamp: Date;
  imageUrl: string;
  context?: string;
}

export interface ImageMetadata {
  filename: string;
  size: number;
  width: number;
  height: number;
  format: string;
  exif: Record<string, unknown>;
  geolocation?: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  device?: string;
  software?: string;
  created?: Date;
  modified?: Date;
}

export interface VoiceRecognitionResult {
  audioHash: string;
  duration: number;
  sampleRate: number;
  channels: number;
  speaker: SpeakerIdentification;
  transcription: TranscriptionResult;
  analysis: VoiceAnalysis;
}

export interface SpeakerIdentification {
  speakerId?: string;
  name?: string;
  confidence: number;
  gender: 'male' | 'female';
  ageRange?: string;
  language?: string;
  accent?: string;
  matches: SpeakerMatch[];
}

export interface SpeakerMatch {
  speakerId: string;
  name?: string;
  confidence: number;
  source: string;
  timestamp: Date;
}

export interface TranscriptionResult {
  text: string;
  language: string;
  confidence: number;
  words: Word[];
  segments: Segment[];
}

export interface Word {
  text: string;
  startTime: number;
  endTime: number;
  confidence: number;
}

export interface Segment {
  speaker: string;
  text: string;
  startTime: number;
  endTime: number;
}

export interface VoiceAnalysis {
  emotions: Emotion[];
  stressLevel: number;
  deceptionIndicators: string[];
  keywords: string[];
  topics: string[];
}

export interface Emotion {
  type: string;
  confidence: number;
}

// === UNIFIED SEARCH ===
export interface UnifiedSearchQuery {
  query: string;
  types: SearchType[];
  filters: SearchFilter[];
  sort: SortOption;
  pagination: PaginationOptions;
  enrichment: boolean;
}

export type SearchType =
  | 'email'
  | 'ip'
  | 'domain'
  | 'username'
  | 'phone'
  | 'hash'
  | 'face'
  | 'voice'
  | 'blockchain'
  | 'darkweb'
  | 'threat'
  | 'malware'
  | 'vulnerability'
  | 'cve';

export interface SearchFilter {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'regex' | 'in' | 'between';
  value: unknown;
}

export interface SortOption {
  field: string;
  order: 'asc' | 'desc';
}

export interface PaginationOptions {
  page: number;
  limit: number;
  cursor?: string;
}

export interface UnifiedSearchResult {
  query: string;
  total: number;
  page: number;
  limit: number;
  results: SearchResultItem[];
  aggregations: Aggregation[];
  suggestions: string[];
  related: RelatedQuery[];
  executionTime: number;
}

export interface SearchResultItem {
  id: string;
  type: SearchType;
  score: number;
  data: unknown;
  highlights: string[];
  source: string;
  timestamp: Date;
}

export interface Aggregation {
  field: string;
  buckets: Bucket[];
}

export interface Bucket {
  key: string;
  count: number;
}

export interface RelatedQuery {
  query: string;
  type: SearchType;
  score: number;
}

// API Response Types
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: APIError;
  meta: ResponseMeta;
}

export interface APIError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  stack?: string;
}

export interface ResponseMeta {
  timestamp: Date;
  requestId: string;
  duration: number;
  rateLimit: {
    limit: number;
    remaining: number;
    reset: Date;
  };
  pagination?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  nextCursor?: string;
  prevCursor?: string;
}
