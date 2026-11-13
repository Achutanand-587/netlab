// ─────────────────────────────────────────────────────────────────
// NetLab – Learning Center: Static Content + Progress Service
// All content is predefined. No AI / external API used.
// Progress persists via localStorage.
// ─────────────────────────────────────────────────────────────────

export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correct: number; // index into options
  explanation: string;
}

export interface Lesson {
  id: string;
  title: string;
  concept: string;
  workingPrinciple: string;
  keyPoints: string[];
  realWorldExample: string;
  practicalLink?: { label: string; route: string };
  quiz: QuizQuestion[];
  visualType?: 'osi' | 'encapsulation' | 'tcp-handshake' | 'subnet' | 'topology' | 'crc' | 'bandwidth' | 'arp' | 'none';
}

export interface Topic {
  id: string;
  title: string;
  description: string;
  difficulty: Difficulty;
  estimatedMinutes: number;
  lessons: Lesson[];
  relatedTopicIds: string[];
  practicalRoute?: string;
  icon: string;
}

// ── Progress types ──────────────────────────────────────────────
export interface LessonProgress {
  completed: boolean;
  quizScore: number | null; // 0-100
  visitedAt: string; // ISO
}

export interface TopicProgress {
  started: boolean;
  lessons: Record<string, LessonProgress>;
}

export interface LearningProgress {
  topics: Record<string, TopicProgress>;
  lastVisited: { topicId: string; lessonId: string } | null;
}

const LS_KEY = 'netlab_learning_progress_v1';

export function loadProgress(): LearningProgress {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw) as LearningProgress;
  } catch { /* ignore */ }
  return { topics: {}, lastVisited: null };
}

export function saveProgress(p: LearningProgress): void {
  try { localStorage.setItem(LS_KEY, JSON.stringify(p)); } catch { /* ignore */ }
}

export function markLessonComplete(
  progress: LearningProgress,
  topicId: string,
  lessonId: string,
  quizScore: number | null
): LearningProgress {
  const tp: TopicProgress = progress.topics[topicId] ?? { started: true, lessons: {} };
  tp.started = true;
  tp.lessons[lessonId] = { completed: true, quizScore, visitedAt: new Date().toISOString() };
  return { ...progress, topics: { ...progress.topics, [topicId]: tp }, lastVisited: { topicId, lessonId } };
}

export function markLessonVisited(
  progress: LearningProgress,
  topicId: string,
  lessonId: string
): LearningProgress {
  const tp: TopicProgress = progress.topics[topicId] ?? { started: true, lessons: {} };
  if (!tp.lessons[lessonId]) {
    tp.lessons[lessonId] = { completed: false, quizScore: null, visitedAt: new Date().toISOString() };
  }
  return { ...progress, topics: { ...progress.topics, [topicId]: tp }, lastVisited: { topicId, lessonId } };
}

export function getTopicCompletion(topic: Topic, progress: LearningProgress): number {
  const tp = progress.topics[topic.id];
  if (!tp) return 0;
  const done = topic.lessons.filter(l => tp.lessons[l.id]?.completed).length;
  return topic.lessons.length ? Math.round((done / topic.lessons.length) * 100) : 0;
}

export function getOverallProgress(topics: Topic[], progress: LearningProgress): number {
  const totalLessons = topics.reduce((s, t) => s + t.lessons.length, 0);
  if (!totalLessons) return 0;
  const done = topics.reduce((s, t) => {
    const tp = progress.topics[t.id];
    return s + (tp ? t.lessons.filter(l => tp.lessons[l.id]?.completed).length : 0);
  }, 0);
  return Math.round((done / totalLessons) * 100);
}

// ── Static curriculum ───────────────────────────────────────────
export const TOPICS: Topic[] = [
  // ── 1. Introduction ─────────────────────────────────────────
  {
    id: 'intro',
    title: 'Introduction to Computer Networks',
    description: 'Understand what networks are, why they exist, and how devices communicate.',
    difficulty: 'beginner',
    estimatedMinutes: 25,
    icon: '🌐',
    relatedTopicIds: ['osi', 'devices'],
    practicalRoute: '/topology',
    lessons: [
      {
        id: 'intro-1',
        title: 'What is a Computer Network?',
        concept: 'A computer network is a collection of two or more devices (computers, phones, servers, printers) linked together so they can share data and resources. Without networks, every file would need to be physically transported between computers.',
        workingPrinciple: 'Devices on a network send data as small chunks called packets. Each packet carries a source address (where it came from), a destination address (where it is going), and a portion of the actual data. Routers and switches forward these packets through the network until they reach the right destination.',
        keyPoints: [
          'A network lets devices share data, printers, internet access, and storage.',
          'Data travels as packets — small numbered chunks, not one big stream.',
          'Every device on a network needs a unique address so packets reach the right place.',
          'Networks range from two laptops in a home to millions of servers on the internet.',
        ],
        realWorldExample: 'When you open a website, your browser sends a request packet across your home Wi-Fi, through your router, over the internet (through many intermediate routers), to a web server. The server sends back many response packets that your browser reassembles into the web page you see.',
        practicalLink: { label: 'Build a network in Topology Lab', route: '/topology' },
        quiz: [
          { id: 1, question: 'What is the primary purpose of a computer network?', options: ['To increase CPU speed', 'To share data and resources between devices', 'To replace hard drives', 'To improve screen resolution'], correct: 1, explanation: 'Networks exist so that devices can share data, resources like printers, and services like internet access.' },
          { id: 2, question: 'Data is transmitted across networks as:', options: ['One large continuous file', 'Binary digits stored on USB drives', 'Small chunks called packets', 'Electrical signals with no structure'], correct: 2, explanation: 'Networks break data into packets — small numbered chunks that travel independently and are reassembled at the destination.' },
        ],
        visualType: 'none',
      },
      {
        id: 'intro-2',
        title: 'Types of Networks: LAN, WAN, MAN',
        concept: 'Networks are classified by their geographic size. A LAN (Local Area Network) covers a building or campus. A MAN (Metropolitan Area Network) covers a city. A WAN (Wide Area Network) spans countries or the whole globe — the internet is the world\'s largest WAN.',
        workingPrinciple: 'LAN: Devices in a single building share a common physical medium (Ethernet cable or Wi-Fi). Speeds are high (100 Mbps – 10 Gbps) and latency is very low. MAN: Multiple LANs in a city connected by fibre or wireless links. WAN: Connects geographically distant networks via leased lines, undersea fibre cables, or satellite links. Speeds vary; latency is higher due to distance.',
        keyPoints: [
          'LAN — building or campus, high speed, low latency.',
          'MAN — city-wide, connects multiple LANs.',
          'WAN — country/global, includes the internet.',
          'Your home has a LAN; your ISP operates part of the WAN.',
        ],
        realWorldExample: 'A university campus has one large LAN connecting all buildings. It connects to the city\'s MAN provided by an ISP. That MAN is connected to global internet backbones — the WAN — through undersea fibre cables.',
        practicalLink: { label: 'Simulate LAN and WAN topologies', route: '/topology' },
        quiz: [
          { id: 1, question: 'Which network type typically covers a single building?', options: ['WAN', 'MAN', 'LAN', 'Internet'], correct: 2, explanation: 'LAN (Local Area Network) covers a building or campus with high-speed, low-latency connections.' },
          { id: 2, question: 'The internet is an example of:', options: ['LAN', 'MAN', 'WAN', 'PAN'], correct: 2, explanation: 'The internet is the world\'s largest Wide Area Network (WAN), spanning continents via undersea cables and satellite links.' },
        ],
        visualType: 'none',
      },
      {
        id: 'intro-3',
        title: 'Network Topologies',
        concept: 'Network topology describes the physical or logical arrangement of devices. Common topologies are Bus, Star, Ring, Mesh, and Hybrid. Each has trade-offs in cost, fault tolerance, and performance.',
        workingPrinciple: 'Bus: All devices share one cable. Simple but a cable break stops everything. Star: Every device connects to a central switch. Most common today — a switch failure affects all, but a device failure does not. Ring: Devices form a loop. Data travels around the ring. Mesh: Every device connects to every other. Highest fault tolerance, most expensive. Hybrid: A mix of two or more topologies.',
        keyPoints: [
          'Star is the most common topology in modern LANs.',
          'Mesh is used in critical networks where downtime is unacceptable.',
          'Bus and Ring are mostly historical — rarely used in new deployments.',
          'The internet uses a partial mesh of routers across the globe.',
        ],
        realWorldExample: 'Your home network is a star: all your phones, laptops, and smart TVs connect to your Wi-Fi router (the central hub). If the router fails, all devices lose connectivity — classic star behaviour.',
        practicalLink: { label: 'Create topologies in Topology Lab', route: '/topology' },
        quiz: [
          { id: 1, question: 'Which topology connects every device to a central switch or hub?', options: ['Bus', 'Ring', 'Star', 'Mesh'], correct: 2, explanation: 'In a star topology every device connects to a central switch. It is the most widely used topology in modern LANs.' },
          { id: 2, question: 'Which topology offers the highest fault tolerance?', options: ['Bus', 'Star', 'Ring', 'Mesh'], correct: 3, explanation: 'In a full mesh every device is connected to every other device, so there are always alternative paths if one link fails.' },
        ],
        visualType: 'topology',
      },
    ],
  },

  // ── 2. OSI Model ─────────────────────────────────────────────
  {
    id: 'osi',
    title: 'OSI & TCP/IP Models',
    description: 'Learn the seven-layer OSI model and how it maps to the practical TCP/IP stack.',
    difficulty: 'beginner',
    estimatedMinutes: 35,
    icon: '📚',
    relatedTopicIds: ['intro', 'protocols', 'packets'],
    practicalRoute: '/protocols',
    lessons: [
      {
        id: 'osi-1',
        title: 'The Seven-Layer OSI Model',
        concept: 'The OSI (Open Systems Interconnection) model divides network communication into seven layers. Each layer has a specific responsibility and communicates only with the layer directly above and below it. This separation allows different vendors to build interoperable equipment.',
        workingPrinciple: 'Layer 7 Application — user-facing protocols (HTTP, DNS, FTP). Layer 6 Presentation — data formatting, encryption, compression. Layer 5 Session — managing conversation sessions between applications. Layer 4 Transport — reliable or unreliable delivery, ports, segmentation (TCP/UDP). Layer 3 Network — logical addressing and routing (IP). Layer 2 Data Link — MAC addressing, framing, error detection on a single link (Ethernet). Layer 1 Physical — bits over cables, Wi-Fi, fibre.',
        keyPoints: [
          'Mnemonic: "All People Seem To Need Data Processing" (Application → Physical).',
          'Each layer adds a header when sending (encapsulation) and removes it when receiving (decapsulation).',
          'Routers operate at Layer 3; switches at Layer 2; hubs at Layer 1.',
          'TCP and UDP live at Layer 4; IP lives at Layer 3.',
        ],
        realWorldExample: 'When you send an email: your email app (L7) formats it, encryption may be applied (L6), a session is maintained (L5), TCP breaks it into segments with ports (L4), IP adds source/destination IPs (L3), Ethernet adds MAC addresses (L2), and finally the bits are transmitted as electrical/optical signals (L1).',
        practicalLink: { label: 'Observe protocols in Protocol Lab', route: '/protocols' },
        quiz: [
          { id: 1, question: 'At which OSI layer does IP addressing and routing occur?', options: ['Layer 2 Data Link', 'Layer 3 Network', 'Layer 4 Transport', 'Layer 7 Application'], correct: 1, explanation: 'Layer 3 (Network) handles logical IP addressing and routing decisions between networks.' },
          { id: 2, question: 'Which layer is responsible for reliable end-to-end delivery and uses ports?', options: ['Layer 2', 'Layer 3', 'Layer 4', 'Layer 5'], correct: 2, explanation: 'Layer 4 (Transport) uses TCP for reliable delivery with ports to identify applications.' },
          { id: 3, question: 'What is added to data at each layer during sending?', options: ['A trailer only', 'A header (and sometimes trailer)', 'An IP address', 'Nothing'], correct: 1, explanation: 'Each layer wraps data in its own header (and sometimes a trailer) — this is called encapsulation.' },
        ],
        visualType: 'osi',
      },
      {
        id: 'osi-2',
        title: 'Encapsulation and Decapsulation',
        concept: 'Encapsulation is the process of wrapping data with protocol headers as it moves down the OSI layers before transmission. Decapsulation is the reverse — stripping headers as data moves up the layers at the receiver.',
        workingPrinciple: 'Sender (top to bottom): Application data → Transport adds TCP/UDP header (segment) → Network adds IP header (packet) → Data Link adds Ethernet header + trailer (frame) → Physical sends bits. Receiver (bottom to top): Physical receives bits → Data Link checks frame, removes header/trailer → Network checks IP header, removes it → Transport reassembles segments → Application receives original data.',
        keyPoints: [
          'Each layer\'s data unit has a name: segment (L4), packet (L3), frame (L2), bit (L1).',
          'Headers contain control information: addresses, sequence numbers, error checks.',
          'The receiving device processes headers in reverse order.',
          'Only the relevant layer reads and strips its own header.',
        ],
        realWorldExample: 'Think of a letter inside envelopes. You put a letter (application data) in an inner envelope with a room number (port), then inside an outer envelope with a street address (IP), and finally in a postal bag with a local sorting code (MAC). Each handler only looks at the envelope relevant to them.',
        practicalLink: { label: 'Watch packet structure in PCAP Analyzer', route: '/packets' },
        quiz: [
          { id: 1, question: 'What is the name of the data unit at the Transport layer?', options: ['Packet', 'Frame', 'Segment', 'Bit'], correct: 2, explanation: 'At Layer 4 (Transport) the data unit is called a segment. At Layer 3 it is a packet; at Layer 2 a frame.' },
          { id: 2, question: 'During decapsulation, headers are removed:', options: ['From the top layer down', 'From the bottom layer up', 'All at once', 'Only at the destination application'], correct: 1, explanation: 'Decapsulation happens bottom-up: Layer 1 → 2 → 3 → 4 → 7, with each layer stripping its own header.' },
        ],
        visualType: 'encapsulation',
      },
      {
        id: 'osi-3',
        title: 'TCP/IP Model vs OSI Model',
        concept: 'The TCP/IP model (also called the Internet model) is a practical four-layer model used in real-world networking. It was developed before the OSI model and is what the internet actually runs on.',
        workingPrinciple: 'TCP/IP Application layer = OSI Layers 5+6+7. TCP/IP Transport layer = OSI Layer 4. TCP/IP Internet layer = OSI Layer 3. TCP/IP Network Access (Link) layer = OSI Layers 1+2. The OSI model is a theoretical reference; TCP/IP is the practical implementation.',
        keyPoints: [
          'TCP/IP has 4 layers; OSI has 7.',
          'The internet uses TCP/IP — not OSI — but OSI is the universal teaching reference.',
          'HTTP, FTP, DNS sit in the TCP/IP Application layer.',
          'TCP and UDP are the two key Transport-layer protocols.',
        ],
        realWorldExample: 'When your browser makes an HTTPS request: DNS resolves the domain (Application), TCP establishes a connection (Transport), IP routes the packets (Internet), and your Ethernet/Wi-Fi card transmits the frames (Network Access).',
        practicalLink: { label: 'Explore protocol exchanges in Protocol Lab', route: '/protocols' },
        quiz: [
          { id: 1, question: 'How many layers does the TCP/IP model have?', options: ['3', '4', '5', '7'], correct: 1, explanation: 'The TCP/IP model has 4 layers: Application, Transport, Internet, and Network Access.' },
          { id: 2, question: 'Which TCP/IP layer corresponds to OSI layers 5, 6, and 7?', options: ['Transport', 'Internet', 'Network Access', 'Application'], correct: 3, explanation: 'The TCP/IP Application layer combines the OSI Session (5), Presentation (6), and Application (7) layers.' },
        ],
        visualType: 'osi',
      },
    ],
  },

  // ── 3. Network Devices ───────────────────────────────────────
  {
    id: 'devices',
    title: 'Network Devices & Addressing',
    description: 'Understand hubs, switches, routers, MAC addresses, and IP addresses.',
    difficulty: 'beginner',
    estimatedMinutes: 30,
    icon: '🖥️',
    relatedTopicIds: ['intro', 'subnetting'],
    practicalRoute: '/topology',
    lessons: [
      {
        id: 'devices-1',
        title: 'Hubs, Switches, and Routers',
        concept: 'These three devices forward network traffic, but at different OSI layers and with very different intelligence. Understanding the difference is essential for designing networks.',
        workingPrinciple: 'Hub (L1): Broadcasts every packet out all ports — no intelligence. Creates one large collision domain. Switch (L2): Learns which MAC address is on which port and forwards frames only to the correct port. Reduces collisions. Each port is its own collision domain. Router (L3): Routes packets between different networks using IP addresses. Connects your LAN to the internet. Separates broadcast domains.',
        keyPoints: [
          'Hub: Layer 1, broadcasts everything — dumb and inefficient.',
          'Switch: Layer 2, uses MAC address table to forward selectively.',
          'Router: Layer 3, uses routing table with IP addresses.',
          'Modern networks use switches for LAN and routers to connect to other networks.',
        ],
        realWorldExample: 'Your home network: a Wi-Fi router contains both a switch (for the LAN ports) and a router (to connect your LAN to your ISP\'s network). The switch lets your devices talk to each other; the router decides which traffic goes to the internet.',
        practicalLink: { label: 'Add devices in Topology Lab', route: '/topology' },
        quiz: [
          { id: 1, question: 'Which device operates at Layer 2 and uses MAC addresses to forward frames?', options: ['Hub', 'Switch', 'Router', 'Firewall'], correct: 1, explanation: 'A switch operates at Layer 2 (Data Link) and maintains a MAC address table to forward frames only to the correct port.' },
          { id: 2, question: 'Which device is needed to connect two different networks (e.g., your LAN to the internet)?', options: ['Hub', 'Switch', 'Router', 'Access point'], correct: 2, explanation: 'A router operates at Layer 3 and routes packets between different networks using IP addresses.' },
        ],
        visualType: 'none',
      },
      {
        id: 'devices-2',
        title: 'MAC Addresses and IP Addresses',
        concept: 'Every network device has two types of addresses. A MAC address is the hardware address burned into the network interface card (NIC). An IP address is a logical address assigned by configuration or DHCP. Both are required for network communication.',
        workingPrinciple: 'MAC address: 48-bit address written as six hex pairs (e.g. AA:BB:CC:11:22:33). First 3 bytes = manufacturer OUI; last 3 bytes = device serial. Used for delivery within a single network segment (LAN). IP address: 32-bit (IPv4) or 128-bit (IPv6) logical address. Used for routing across networks. ARP (Address Resolution Protocol) maps IP → MAC within a LAN so the switch knows the destination port.',
        keyPoints: [
          'MAC addresses are hardware-burned and unique worldwide (in theory).',
          'IP addresses are logical — they change when you join a different network.',
          'ARP resolves "which MAC has this IP?" by broadcasting to the whole LAN.',
          'You need both: IP to route between networks, MAC to deliver on the local segment.',
        ],
        realWorldExample: 'When you ping 192.168.1.5 on your LAN: your computer uses ARP to broadcast "Who has 192.168.1.5?" The device at that IP replies with its MAC address. Your computer then sends the ping frame directly to that MAC. The switch forwards it only to the correct port.',
        practicalLink: { label: 'Inspect MAC and IP in PCAP Analyzer', route: '/packets' },
        quiz: [
          { id: 1, question: 'What is the purpose of ARP?', options: ['Assign IP addresses to devices', 'Map IP addresses to MAC addresses', 'Route packets between networks', 'Encrypt network traffic'], correct: 1, explanation: 'ARP (Address Resolution Protocol) resolves an IP address to its corresponding MAC address within a local network.' },
          { id: 2, question: 'A MAC address is:', options: ['A logical address assigned by DHCP', 'A 32-bit address used for routing', 'A hardware address burned into the network card', 'An IPv6 address'], correct: 2, explanation: 'A MAC address is a 48-bit hardware address permanently assigned to the network interface card (NIC) by the manufacturer.' },
        ],
        visualType: 'arp',
      },
    ],
  },

  // ── 4. IP Addressing & Subnetting ────────────────────────────
  {
    id: 'subnetting',
    title: 'IP Addressing & Subnetting',
    description: 'Master IPv4 addressing, subnet masks, CIDR notation, FLSM, and VLSM.',
    difficulty: 'intermediate',
    estimatedMinutes: 45,
    icon: '🔢',
    relatedTopicIds: ['devices', 'protocols'],
    practicalRoute: '/subnetting',
    lessons: [
      {
        id: 'subnet-1',
        title: 'IPv4 Addressing and Classes',
        concept: 'An IPv4 address is a 32-bit number written as four decimal octets separated by dots (e.g. 192.168.1.1). Originally, addresses were divided into classes A, B, and C based on the leading bits. Today CIDR has replaced classful addressing, but understanding the classes helps interpret address ranges.',
        workingPrinciple: 'Class A: 1.0.0.0 – 126.255.255.255, /8 default mask, 16 million hosts per network. Class B: 128.0.0.0 – 191.255.255.255, /16 default mask, 65,534 hosts per network. Class C: 192.0.0.0 – 223.255.255.255, /24 default mask, 254 hosts per network. Private ranges: 10.x.x.x (Class A), 172.16-31.x.x (Class B), 192.168.x.x (Class C) — not routed on the public internet.',
        keyPoints: [
          '127.0.0.1 is loopback — always refers to the local device.',
          'Private IP ranges are free to use inside your LAN.',
          'NAT translates private IPs to a public IP for internet access.',
          'Each IPv4 address has a network part and a host part.',
        ],
        realWorldExample: 'Your home router assigns 192.168.1.x addresses (private Class C) to your devices via DHCP. Your router has one public IP from your ISP. NAT hides all your private devices behind that one public IP.',
        practicalLink: { label: 'Calculate subnets in Subnetting Lab', route: '/subnetting' },
        quiz: [
          { id: 1, question: 'Which IPv4 address range is used for loopback?', options: ['0.0.0.0', '127.0.0.0/8', '192.168.0.0/16', '10.0.0.0/8'], correct: 1, explanation: '127.0.0.0/8 is reserved for loopback — traffic sent here stays on the local device. 127.0.0.1 is the most commonly used loopback address.' },
          { id: 2, question: 'Which of these is a private IP address?', options: ['8.8.8.8', '100.64.1.1', '192.168.10.5', '203.0.113.1'], correct: 2, explanation: '192.168.0.0/16 is a private address range. 8.8.8.8 is Google\'s public DNS; 203.0.113.x is documentation range.' },
        ],
        visualType: 'subnet',
      },
      {
        id: 'subnet-2',
        title: 'Subnet Masks and CIDR Notation',
        concept: 'A subnet mask separates the network portion of an IP address from the host portion. CIDR (Classless Inter-Domain Routing) notation writes the mask as a prefix length (/24) instead of the full dotted-decimal (255.255.255.0).',
        workingPrinciple: 'Subnet mask: a 32-bit number with continuous 1s followed by 0s. The 1s identify the network portion; the 0s identify the host portion. Example: /24 = 255.255.255.0 (24 ones, 8 zeros). To find the network address: IP AND subnet mask. To find the broadcast: set all host bits to 1. Usable hosts = 2^(host bits) − 2.',
        keyPoints: [
          '/24 → 254 usable hosts; /25 → 126; /26 → 62; /30 → 2 (point-to-point links).',
          'Network address (all host bits 0) and broadcast (all host bits 1) are not assignable.',
          'Increasing the prefix by 1 halves the number of hosts.',
          'CIDR allows subnets of any size, not just classful boundaries.',
        ],
        realWorldExample: 'Network 192.168.1.0/24: Network address 192.168.1.0, Broadcast 192.168.1.255, Usable range 192.168.1.1 – 192.168.1.254 (254 hosts).',
        practicalLink: { label: 'Try the Subnetting Calculator', route: '/subnetting' },
        quiz: [
          { id: 1, question: 'How many usable host addresses are in a /28 subnet?', options: ['14', '16', '30', '254'], correct: 0, explanation: '/28 means 4 host bits: 2^4 = 16 addresses. Subtract 2 (network + broadcast) = 14 usable hosts.' },
          { id: 2, question: 'What is the subnet mask for /26?', options: ['255.255.255.0', '255.255.255.128', '255.255.255.192', '255.255.255.240'], correct: 2, explanation: '/26 means the first 26 bits are 1s. The last octet has 2 ones: 11000000 = 192. So the mask is 255.255.255.192.' },
        ],
        visualType: 'subnet',
      },
      {
        id: 'subnet-3',
        title: 'FLSM and VLSM Subnetting',
        concept: 'FLSM (Fixed-Length Subnet Masking) divides a network into equal-sized subnets. VLSM (Variable-Length Subnet Masking) allows subnets of different sizes, allocating only as many addresses as each segment needs — far more efficient.',
        workingPrinciple: 'FLSM: Choose one subnet size. All subnets get the same mask. Simple but wastes addresses. Example: Divide 192.168.1.0/24 into 4 equal subnets → 4 × /26 (62 hosts each). VLSM: Sort requirements largest to smallest. Assign the smallest subnet that fits each requirement. Example: Dept A needs 50 hosts → /26 (62 usable). Dept B needs 10 → /28 (14 usable). WAN link needs 2 → /30 (2 usable). Much less address waste.',
        keyPoints: [
          'VLSM is always preferred in real networks to conserve address space.',
          'Sort VLSM requirements from largest to smallest before allocating.',
          'FLSM is simpler to calculate and explain.',
          'Both require the network address and prefix of the parent block.',
        ],
        realWorldExample: 'An enterprise with 192.168.10.0/24 uses VLSM: Engineering (60 hosts) → /26, HR (28 hosts) → /27, IT (12 hosts) → /28, Server farm (5 hosts) → /29, two WAN links → /30 each. Total addresses used ≈ 180 out of 254. With FLSM /26 for all, only 4 subnets fit and 190 addresses are wasted per subnet.',
        practicalLink: { label: 'Run FLSM and VLSM experiments', route: '/subnetting' },
        quiz: [
          { id: 1, question: 'Which technique allocates different-sized subnets to match actual host requirements?', options: ['FLSM', 'NAT', 'VLSM', 'DHCP'], correct: 2, explanation: 'VLSM (Variable-Length Subnet Masking) assigns different prefix lengths to different subnets based on actual host counts, minimising address waste.' },
          { id: 2, question: 'You need a subnet for a point-to-point WAN link (2 hosts). Which prefix is most efficient?', options: ['/24', '/28', '/30', '/16'], correct: 2, explanation: '/30 gives 4 addresses (2^2), with 2 usable hosts — exactly right for a point-to-point link with no waste.' },
        ],
        visualType: 'subnet',
      },
    ],
  },

  // ── 5. Protocols ─────────────────────────────────────────────
  {
    id: 'protocols',
    title: 'Network Protocols',
    description: 'Understand TCP, UDP, DNS, DHCP, ARP, HTTP, and ICMP in depth.',
    difficulty: 'intermediate',
    estimatedMinutes: 40,
    icon: '📡',
    relatedTopicIds: ['osi', 'packets'],
    practicalRoute: '/protocols',
    lessons: [
      {
        id: 'proto-1',
        title: 'TCP – Reliable Transmission',
        concept: 'TCP (Transmission Control Protocol) is a connection-oriented Layer 4 protocol. It guarantees that data arrives in order, without loss, and without duplication. This reliability comes at the cost of additional overhead.',
        workingPrinciple: 'Three-way handshake establishes a connection: SYN → SYN-ACK → ACK. Data transmission: each segment is acknowledged; lost segments are retransmitted. Sequence numbers ensure in-order delivery. Flow control (window size) prevents the sender from overwhelming the receiver. Congestion control adapts to network conditions. Four-way handshake closes the connection: FIN → ACK → FIN → ACK.',
        keyPoints: [
          'TCP is used by HTTP, HTTPS, FTP, SSH, SMTP — anything where reliability matters.',
          'The three-way handshake adds latency before data can be sent.',
          'Sequence and acknowledgement numbers track every byte transmitted.',
          'TCP port numbers identify the application (HTTP=80, HTTPS=443, SSH=22).',
        ],
        realWorldExample: 'Loading a web page: TCP establishes a connection to port 443, your browser sends the HTTP request, the server acknowledges each TCP segment, all segments are reassembled in order, and the page renders correctly — even if some packets were routed differently through the network.',
        practicalLink: { label: 'Simulate TCP handshake in Protocol Lab', route: '/protocols' },
        quiz: [
          { id: 1, question: 'How many steps are in the TCP three-way handshake?', options: ['2', '3', '4', '5'], correct: 1, explanation: 'The TCP three-way handshake has three steps: SYN (client), SYN-ACK (server), ACK (client). After this the connection is established.' },
          { id: 2, question: 'Which TCP mechanism prevents the sender from sending data faster than the receiver can process it?', options: ['Congestion control', 'Flow control', 'Sequence numbering', 'Checksums'], correct: 1, explanation: 'Flow control uses a receive window (advertised by the receiver) to tell the sender how much data it can accept. Congestion control addresses network capacity.' },
        ],
        visualType: 'tcp-handshake',
      },
      {
        id: 'proto-2',
        title: 'UDP – Fast but Unreliable',
        concept: 'UDP (User Datagram Protocol) is a connectionless Layer 4 protocol. It sends datagrams without establishing a connection, with no acknowledgement, retransmission, or ordering guarantees. This makes it faster and lower-overhead than TCP.',
        workingPrinciple: 'No handshake — the sender just fires datagrams at the destination. No acknowledgement — if a packet is lost, it is gone. No ordering — packets may arrive out of order. No flow or congestion control. Applications that need speed over reliability (video streaming, gaming, DNS queries, VoIP) use UDP and implement their own error handling if needed.',
        keyPoints: [
          'UDP header is only 8 bytes; TCP header is 20+ bytes.',
          'DNS uses UDP port 53 for queries (fast lookups).',
          'Video calls use UDP — a dropped frame is better than a delayed one.',
          'DHCP uses UDP because there is no IP address yet to establish a TCP connection.',
        ],
        realWorldExample: 'A video call sends 30 frames per second over UDP. If one packet is lost, the video briefly blurs — but the call continues. If TCP was used, the call would freeze while lost packets are retransmitted, creating an unbearable delay.',
        practicalLink: { label: 'Observe UDP traffic in Protocol Lab', route: '/protocols' },
        quiz: [
          { id: 1, question: 'Which statement about UDP is correct?', options: ['UDP guarantees delivery', 'UDP is connection-oriented', 'UDP has no handshake or retransmission', 'UDP is slower than TCP'], correct: 2, explanation: 'UDP is connectionless with no handshake, no acknowledgement, and no retransmission — making it faster but unreliable.' },
          { id: 2, question: 'Which protocol typically uses UDP?', options: ['HTTP', 'SSH', 'FTP', 'DNS'], correct: 3, explanation: 'DNS uses UDP port 53 for queries because speed matters more than reliability — if a query is lost the application just retries.' },
        ],
        visualType: 'none',
      },
      {
        id: 'proto-3',
        title: 'DNS, DHCP, ARP, and ICMP',
        concept: 'Four essential support protocols keep networks running. DNS resolves domain names to IP addresses. DHCP automatically assigns IP addresses to devices. ARP maps IP addresses to MAC addresses. ICMP reports errors and tests connectivity.',
        workingPrinciple: 'DNS: Browser asks "What is the IP of google.com?" → DNS resolver checks cache → queries root → TLD → authoritative server → returns IP. DHCP: Device broadcasts DHCPDISCOVER → server offers an IP (DHCPOFFER) → device requests it (DHCPREQUEST) → server confirms (DHCPACK). ARP: Device broadcasts "Who has 192.168.1.5?" → that device replies with its MAC. ICMP: ping sends ICMP Echo Request → destination replies with Echo Reply. traceroute sends packets with increasing TTL to map hops.',
        keyPoints: [
          'DNS uses port 53 UDP (queries) and TCP (zone transfers).',
          'DHCP uses UDP ports 67 (server) and 68 (client).',
          'ARP operates at Layer 2 — it has no IP header.',
          'ICMP is used by ping and traceroute — not for user data.',
        ],
        realWorldExample: 'You type "www.example.com" in your browser: (1) DHCP gave you your IP when you connected. (2) DNS resolves www.example.com → 93.184.216.34. (3) ARP finds the MAC of your default gateway. (4) Your packet routes to the server. (5) You can ping the server to test connectivity using ICMP.',
        practicalLink: { label: 'Simulate DNS and DHCP in Protocol Lab', route: '/protocols' },
        quiz: [
          { id: 1, question: 'What does DNS do?', options: ['Assign IP addresses automatically', 'Translate domain names to IP addresses', 'Map IP addresses to MAC addresses', 'Report network errors'], correct: 1, explanation: 'DNS (Domain Name System) translates human-readable domain names (google.com) into IP addresses (142.250.x.x) that routers can use.' },
          { id: 2, question: 'Which protocol is used by the ping command?', options: ['TCP', 'UDP', 'ICMP', 'ARP'], correct: 2, explanation: 'ping uses ICMP (Internet Control Message Protocol) Echo Request and Echo Reply messages to test reachability.' },
        ],
        visualType: 'arp',
      },
    ],
  },

  // ── 6. Packet Analysis ───────────────────────────────────────
  {
    id: 'packets',
    title: 'Packet Analysis',
    description: 'Learn to read and interpret real network packets and packet captures.',
    difficulty: 'intermediate',
    estimatedMinutes: 35,
    icon: '🔍',
    relatedTopicIds: ['osi', 'protocols', 'bandwidth'],
    practicalRoute: '/packets',
    lessons: [
      {
        id: 'pkt-1',
        title: 'What is a Packet?',
        concept: 'A packet is the fundamental unit of data transmission in modern networks. It is a structured block of bytes containing a header (control information) and a payload (the actual data being transported).',
        workingPrinciple: 'An Ethernet frame contains: Destination MAC (6 bytes), Source MAC (6 bytes), EtherType (2 bytes, e.g. 0x0800 for IPv4), IP Payload, FCS checksum (4 bytes). The IP packet inside: Version, Header Length, TTL, Protocol (6=TCP, 17=UDP), Source IP, Destination IP, Data. The TCP segment inside: Source Port, Destination Port, Sequence Number, ACK Number, Flags, Window Size, Data.',
        keyPoints: [
          'Packets have a maximum size called MTU (usually 1500 bytes on Ethernet).',
          'Large data is fragmented into multiple packets and reassembled at the destination.',
          'TTL (Time To Live) prevents packets from looping forever — each router decrements it by 1.',
          'Flags in TCP headers (SYN, ACK, FIN, RST) control the connection state.',
        ],
        realWorldExample: 'A PCAP capture of a web request shows: ARP to find the gateway MAC, DNS to resolve the hostname, TCP SYN handshake, HTTP GET request inside TCP, HTTP 200 response, TCP FIN to close — all clearly visible as individual packets.',
        practicalLink: { label: 'Inspect real packets in PCAP Analyzer', route: '/packets' },
        quiz: [
          { id: 1, question: 'What does TTL (Time To Live) in an IP packet do?', options: ['Sets the maximum transmission speed', 'Limits packet lifetime to prevent infinite loops', 'Specifies the port number', 'Encrypts the payload'], correct: 1, explanation: 'TTL is decremented by 1 at each router. When it reaches 0 the packet is discarded and an ICMP "Time Exceeded" message is sent back. This prevents routing loops.' },
          { id: 2, question: 'What is the standard MTU for Ethernet?', options: ['512 bytes', '1500 bytes', '9000 bytes', '64000 bytes'], correct: 1, explanation: 'The standard Ethernet MTU is 1500 bytes. Larger frames (Jumbo frames up to 9000 bytes) require all devices on the path to support them.' },
        ],
        visualType: 'encapsulation',
      },
      {
        id: 'pkt-2',
        title: 'Reading PCAP Files',
        concept: 'PCAP (Packet Capture) files record every packet that passed through a network interface. Tools like Wireshark and NetLab\'s PCAP Analyzer can open these files to show every packet in detail — from raw hex bytes to decoded protocol fields.',
        workingPrinciple: 'A PCAP file has: a global header (file format, timestamp precision, link type), then a series of packet records each with a timestamp (seconds + microseconds), original length, captured length, and the raw packet bytes. The analyzer decodes each packet by reading the EtherType to identify L3, then the IP Protocol field to identify L4, then the port numbers to identify the application protocol.',
        keyPoints: [
          'PCAP files can be captured live (Wireshark/tcpdump) or generated by NetLab.',
          'Filtering packets by IP, protocol, or port makes analysis manageable.',
          'Statistics: packet count, protocol distribution, top talkers, bytes transferred.',
          'NetLab\'s PCAP Analyzer supports upload, filtering, and per-packet inspection.',
        ],
        realWorldExample: 'A network admin uploads a PCAP from a suspected infected machine. The analyzer reveals hundreds of DNS requests per second to unknown domains — a sign of DNS-based C2 (command-and-control) traffic from malware.',
        practicalLink: { label: 'Upload and analyse a PCAP file', route: '/packets' },
        quiz: [
          { id: 1, question: 'What information is stored in a PCAP file?', options: ['Only IP addresses and port numbers', 'Complete raw packet bytes with timestamps', 'Only HTTP requests', 'Application-layer data only'], correct: 1, explanation: 'PCAP files store complete raw packet bytes along with high-precision timestamps, allowing full protocol analysis at every layer.' },
          { id: 2, question: 'What field in the IP header identifies whether the payload is TCP or UDP?', options: ['TTL', 'Version', 'Protocol', 'IHL'], correct: 2, explanation: 'The IP Protocol field identifies the transport-layer protocol: 6 = TCP, 17 = UDP, 1 = ICMP.' },
        ],
        visualType: 'encapsulation',
      },
    ],
  },

  // ── 7. Bandwidth ─────────────────────────────────────────────
  {
    id: 'bandwidth',
    title: 'Bandwidth & Network Performance',
    description: 'Understand bandwidth, throughput, latency, RTT, and congestion.',
    difficulty: 'intermediate',
    estimatedMinutes: 30,
    icon: '📊',
    relatedTopicIds: ['packets', 'protocols'],
    practicalRoute: '/bandwidth',
    lessons: [
      {
        id: 'bw-1',
        title: 'Bandwidth vs Throughput vs Latency',
        concept: 'These three metrics describe different aspects of network performance. Bandwidth is the maximum theoretical capacity. Throughput is the actual data rate achieved. Latency is the time taken for data to travel from source to destination.',
        workingPrinciple: 'Bandwidth: the capacity of the link (e.g. 100 Mbps). Like the width of a pipe. Throughput: actual data delivered per second — always ≤ bandwidth due to protocol overhead, retransmissions, congestion. Latency: typically measured in milliseconds. Made up of propagation delay (speed of light over the cable), transmission delay (time to push all bits onto the wire), queuing delay (waiting in router buffers), and processing delay. RTT (Round-Trip Time): the time for a packet to reach the destination and for the reply to return — what ping measures.',
        keyPoints: [
          'You can have high bandwidth but high latency — a satellite link (Mbps but 600 ms RTT).',
          'You can have low latency but low bandwidth — a leased line (1 ms RTT but 2 Mbps).',
          'TCP throughput is limited by: bandwidth × RTT (the bandwidth-delay product).',
          '1 Mbps = 1,000,000 bits/sec = 125,000 bytes/sec ≈ 122 KB/s.',
        ],
        realWorldExample: 'Your ISP provides 100 Mbps bandwidth. But a large file download only achieves 70 Mbps throughput because TCP has retransmissions, the server is throttling, and your router has 2 ms queuing delay. Your ping to the server is 15 ms RTT.',
        practicalLink: { label: 'Monitor real bandwidth in Bandwidth Monitor', route: '/bandwidth' },
        quiz: [
          { id: 1, question: 'You have a 100 Mbps link but only achieve 60 Mbps download speed. The 60 Mbps is called:', options: ['Bandwidth', 'Throughput', 'Latency', 'RTT'], correct: 1, explanation: 'Throughput is the actual data rate achieved on the link, which is always less than or equal to the theoretical bandwidth due to protocol overhead, retransmissions, and congestion.' },
          { id: 2, question: 'What does RTT measure?', options: ['The maximum data rate of a link', 'The time for a packet to reach the destination only', 'The total time for a packet to reach the destination and for the reply to return', 'The number of hops between source and destination'], correct: 2, explanation: 'RTT (Round-Trip Time) is the total time for a packet to travel to the destination and for the reply to come back. This is what the ping command measures.' },
        ],
        visualType: 'bandwidth',
      },
      {
        id: 'bw-2',
        title: 'Network Congestion',
        concept: 'Network congestion occurs when the total demand for bandwidth exceeds the available capacity. Routers start dropping packets and introducing queuing delay, severely reducing throughput.',
        workingPrinciple: 'When a router\'s buffer fills: (1) Queuing delay increases — packets wait longer. (2) Buffer overflow — packets are dropped. (3) TCP detects loss (via duplicate ACKs or timeout) and reduces its sending rate (congestion window). TCP algorithms: Slow Start, Congestion Avoidance, Fast Retransmit, Fast Recovery. These self-regulate to find the maximum throughput without overwhelming the network.',
        keyPoints: [
          'Congestion causes packet loss, high latency, and reduced throughput — all at once.',
          'TCP self-throttles when it detects congestion — but this reduces your speed.',
          'QoS (Quality of Service) policies prioritise important traffic (VoIP over file downloads).',
          'The bandwidth-delay product determines how much data can be "in flight" at once.',
        ],
        realWorldExample: 'A school\'s 100 Mbps internet connection handles 200 students streaming video. Each connection throttles via TCP congestion control, but total demand (500 Mbps) far exceeds capacity, causing bufferbloat — pages load slowly and video buffers constantly.',
        practicalLink: { label: 'Run virtual bandwidth experiments', route: '/bandwidth' },
        quiz: [
          { id: 1, question: 'What happens when a router\'s buffer is completely full?', options: ['It requests a larger buffer from the sender', 'It drops incoming packets', 'It sends ICMP redirects', 'It increases its bandwidth'], correct: 1, explanation: 'When a router\'s buffer (queue) is full, arriving packets are dropped. TCP detects this via duplicate ACKs or timeout and reduces its sending rate.' },
          { id: 2, question: 'TCP Slow Start:', options: ['Begins with the maximum window size', 'Begins with a small window that grows exponentially until loss is detected', 'Sends at a constant rate', 'Uses UDP under the hood'], correct: 1, explanation: 'TCP Slow Start begins with a small congestion window (1-4 MSS) and doubles it each RTT until packet loss is detected or the threshold is reached, then switches to linear growth.' },
        ],
        visualType: 'bandwidth',
      },
    ],
  },

  // ── 8. Error Detection ───────────────────────────────────────
  {
    id: 'errors',
    title: 'Error Detection & Correction',
    description: 'Understand parity, checksum, CRC and how networks detect transmission errors.',
    difficulty: 'intermediate',
    estimatedMinutes: 35,
    icon: '🛡️',
    relatedTopicIds: ['packets', 'osi'],
    practicalRoute: '/errors',
    lessons: [
      {
        id: 'err-1',
        title: 'Why Errors Occur in Transmission',
        concept: 'Physical transmission is not perfect. Electrical interference, signal attenuation, hardware faults, and cosmic rays can flip bits from 0 to 1 or vice versa. Error detection schemes add redundant bits to data so the receiver can tell if corruption occurred.',
        workingPrinciple: 'Error detection works by computing a check value from the data before sending. The receiver recomputes the check value from the received data and compares. If they differ, an error is detected. Some schemes can also correct errors (error correction) by carrying enough redundancy to identify which bits flipped.',
        keyPoints: [
          'Detection finds errors but cannot fix them — the data must be retransmitted.',
          'Correction carries more redundancy and can fix certain error patterns without retransmission.',
          'Common schemes: Parity (weakest), Checksum, CRC (strongest, most common).',
          'Ethernet frames use a 32-bit CRC; TCP/UDP headers use a 16-bit checksum.',
        ],
        realWorldExample: 'A Wi-Fi signal picks up interference from a microwave. A bit in an Ethernet frame flips. The CRC in the frame footer detects the mismatch. The frame is silently discarded at the receiving NIC. TCP detects the missing segment and requests retransmission.',
        practicalLink: { label: 'Experiment with error detection algorithms', route: '/errors' },
        quiz: [
          { id: 1, question: 'What is the purpose of a CRC in an Ethernet frame?', options: ['To encrypt the payload', 'To detect bit errors in the frame', 'To identify the destination MAC', 'To measure transmission latency'], correct: 1, explanation: 'CRC (Cyclic Redundancy Check) is a 32-bit value computed from the frame contents. The receiver recomputes it; a mismatch means the frame is corrupt and should be discarded.' },
          { id: 2, question: 'Error detection differs from error correction because:', options: ['Detection requires fewer bits of redundancy', 'Detection can fix errors; correction can only find them', 'They are the same thing', 'Correction uses less bandwidth'], correct: 0, explanation: 'Error detection needs fewer redundant bits — it only needs to identify that an error occurred. Error correction needs more redundancy to identify which bits are wrong and fix them.' },
        ],
        visualType: 'crc',
      },
      {
        id: 'err-2',
        title: 'Parity, Checksum, and CRC',
        concept: 'Three common error detection algorithms with increasing power. Parity adds a single bit. Checksum adds up all bytes. CRC uses polynomial division for strong error detection.',
        workingPrinciple: 'Parity: count the 1-bits in the data. If even parity, add a bit to make the total count even. Receiver checks if the count is still even. Detects single-bit errors but misses two-bit errors. Checksum: sum all bytes (wrapping around on overflow), send the complement. Receiver adds all bytes including the checksum — result should be all 1s. CRC: treat the data as a large binary polynomial, divide by a generator polynomial, and append the remainder. The generator polynomials are carefully chosen to detect burst errors up to their degree in length.',
        keyPoints: [
          'Parity: 1 extra bit, detects only odd numbers of flipped bits.',
          'Checksum: 16 bits in TCP/UDP/IP — fast to compute, moderate error coverage.',
          'CRC-32: 32 bits in Ethernet — detects all burst errors ≤ 32 bits long.',
          'CRC is computed in hardware by the NIC — no CPU overhead.',
        ],
        realWorldExample: 'Calculate parity for 1011001: count 1s = 4 (even). Even parity bit = 0. Send 10110010. If a bit flips to 10110110 (count = 5, odd), parity check fails — error detected. If two bits flip back to even count, parity passes — error missed. CRC would catch multi-bit errors that parity misses.',
        practicalLink: { label: 'Calculate CRC and checksum in Error Detection Lab', route: '/errors' },
        quiz: [
          { id: 1, question: 'Which error detection scheme is used in Ethernet frames?', options: ['Parity', 'Simple checksum', 'CRC-32', 'Hamming code'], correct: 2, explanation: 'Ethernet uses CRC-32 (32-bit Cyclic Redundancy Check) appended as a Frame Check Sequence (FCS) at the end of each frame.' },
          { id: 2, question: 'Even parity of the byte 10110101 is:', options: ['0', '1', '10', 'Cannot be determined'], correct: 1, explanation: '10110101 has five 1-bits (odd count). To make the total even, the parity bit must be 1. The transmitted byte becomes 101101011.' },
        ],
        visualType: 'crc',
      },
    ],
  },

  // ── 9. Network Security ──────────────────────────────────────
  {
    id: 'security',
    title: 'Basic Network Security',
    description: 'Understand common threats, firewalls, encryption, and network defence basics.',
    difficulty: 'advanced',
    estimatedMinutes: 30,
    icon: '🔒',
    relatedTopicIds: ['protocols', 'packets'],
    practicalRoute: '/packets',
    lessons: [
      {
        id: 'sec-1',
        title: 'Common Network Threats',
        concept: 'Networks face threats from both outside and inside. Understanding threats is the first step in defence. The most common attack types are eavesdropping, spoofing, denial of service, and man-in-the-middle attacks.',
        workingPrinciple: 'Eavesdropping (Sniffing): An attacker captures network packets (using tools similar to Wireshark). Without encryption, all data is visible in plain text. ARP Spoofing / Man-in-the-Middle: Attacker sends fake ARP replies, poisoning the ARP cache of devices to redirect traffic through the attacker\'s machine. DoS / DDoS: Flooding a target with traffic to exhaust its resources. SYN Flood: Sending many TCP SYN packets without completing the handshake, filling the server\'s connection table. Port Scanning: Probing ports to discover which services are running.',
        keyPoints: [
          'Encryption (TLS/HTTPS) prevents eavesdropping even if packets are captured.',
          'Dynamic ARP Inspection on switches prevents ARP spoofing.',
          'Firewalls block unauthorised traffic by port, protocol, and IP.',
          'VPNs encrypt all traffic between the client and VPN server.',
        ],
        realWorldExample: 'An attacker on the same Wi-Fi café network runs ARP spoofing. All traffic from your laptop is routed through the attacker\'s machine. Without HTTPS, the attacker reads your login form submission in plain text. With HTTPS (TLS), the payload is encrypted — the attacker sees only ciphertext.',
        practicalLink: { label: 'Inspect suspicious packets in PCAP Analyzer', route: '/packets' },
        quiz: [
          { id: 1, question: 'Which attack fills a server\'s TCP connection table by sending SYN packets without completing the handshake?', options: ['ARP spoofing', 'SYN flood', 'DNS poisoning', 'Port scanning'], correct: 1, explanation: 'A SYN flood sends many TCP SYN packets but never sends the final ACK. The server keeps half-open connections waiting, exhausting its connection table — a classic DoS attack.' },
          { id: 2, question: 'What is the most effective defence against network eavesdropping?', options: ['MAC filtering', 'Using a hub instead of a switch', 'End-to-end encryption (TLS/HTTPS)', 'Disabling ICMP'], correct: 2, explanation: 'End-to-end encryption (TLS/HTTPS) means that even if an attacker captures every packet, the payload is unreadable ciphertext. The other options do not protect the data content.' },
        ],
        visualType: 'none',
      },
      {
        id: 'sec-2',
        title: 'Firewalls, NAT, and VPNs',
        concept: 'Three fundamental technologies that protect and connect networks. Firewalls control which traffic is allowed. NAT hides internal networks. VPNs create encrypted tunnels over public networks.',
        workingPrinciple: 'Stateful Firewall: tracks active connections. Inbound traffic is only allowed if it is part of an existing outbound connection or explicitly permitted by a rule. Rules specify: protocol, source IP, destination IP, port, action (allow/deny). NAT (Network Address Translation): translates private IPs to a single public IP for outbound traffic. Tracks connections in a NAT table to route return traffic correctly. VPN: creates an encrypted tunnel between two endpoints. All traffic is encapsulated and encrypted. Split tunnelling routes only corporate traffic through the VPN.',
        keyPoints: [
          'Firewalls operate at Layer 3/4; next-generation firewalls also inspect Layer 7.',
          'NAT is why millions of home networks can use 192.168.x.x — private IPs are not routed on the internet.',
          'VPNs use protocols like IPsec, OpenVPN, or WireGuard for encryption.',
          'A DMZ (demilitarised zone) is a separate network segment for public-facing servers.',
        ],
        realWorldExample: 'A company has 500 employees with private 10.x.x.x addresses. All internet traffic goes through a firewall that blocks all inbound traffic by default and permits only established connections outbound. NAT translates the 10.x.x.x to the company\'s one public IP. Remote employees connect via VPN to access internal systems securely.',
        practicalLink: { label: 'Analyse firewall-related packet patterns', route: '/packets' },
        quiz: [
          { id: 1, question: 'A stateful firewall tracks:', options: ['User login sessions', 'Active network connections', 'CPU usage', 'File system access'], correct: 1, explanation: 'A stateful firewall tracks active network connections in a state table. It allows return traffic for established outbound connections without an explicit inbound rule.' },
          { id: 2, question: 'What problem does NAT solve?', options: ['Insufficient encryption', 'IPv4 address exhaustion by allowing many devices to share one public IP', 'High network latency', 'DNS resolution speed'], correct: 1, explanation: 'NAT (Network Address Translation) allows thousands of devices with private IP addresses to share a single public IP address, addressing IPv4 address exhaustion.' },
        ],
        visualType: 'none',
      },
    ],
  },
];
