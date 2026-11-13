"""Assessments and Quizzes service.

Provides a predefined, deterministic networking question bank covering:
1. Introduction to Computer Networks (intro)
2. OSI and TCP/IP Models (osi)
3. Network Devices and Topologies (devices)
4. IP Addressing and Subnetting (subnetting)
5. FLSM and VLSM (vlsm)
6. TCP, UDP, DNS, DHCP, ARP, HTTP, ICMP (protocols)
7. Packet Analysis (packets)
8. Bandwidth and Network Performance (bandwidth)
9. Error Detection and Correction (errors)
10. Basic Network Security (security)

Validates answers, scores assessments, generates topic-wise breakdowns,
identifies weak topics, and persists attempts via the experiments table.
"""

from datetime import datetime, timezone
import random
from typing import Any

from sqlalchemy.orm import Session

from errors import AppError
from schemas.assessments import (
    AssessmentDetail,
    AssessmentMeta,
    AssessmentResult,
    AttemptSummary,
    CustomTestRequest,
    QuestionOut,
    QuestionReview,
    SubmitAnswer,
    TopicScore,
)
from services import experiments as exp_svc

# ── Topic Metadata ─────────────────────────────────────────────────────────────

TOPIC_META: dict[str, dict[str, str]] = {
    "intro": {
        "name": "Introduction to Computer Networks",
        "lesson": "intro-1",
        "route": "/topology",
    },
    "osi": {
        "name": "OSI & TCP/IP Models",
        "lesson": "osi-1",
        "route": "/protocols",
    },
    "devices": {
        "name": "Network Devices & Addressing",
        "lesson": "devices-1",
        "route": "/topology",
    },
    "subnetting": {
        "name": "IP Addressing & Subnetting",
        "lesson": "subnet-1",
        "route": "/subnetting",
    },
    "vlsm": {
        "name": "FLSM & VLSM Design",
        "lesson": "subnet-3",
        "route": "/subnetting",
    },
    "protocols": {
        "name": "Network Protocols (TCP, UDP, DNS, DHCP, ARP, ICMP)",
        "lesson": "proto-1",
        "route": "/protocols",
    },
    "packets": {
        "name": "Packet Analysis & PCAP Inspection",
        "lesson": "pkt-1",
        "route": "/packets",
    },
    "bandwidth": {
        "name": "Bandwidth, Throughput & Performance",
        "lesson": "bw-1",
        "route": "/bandwidth",
    },
    "errors": {
        "name": "Error Detection (Parity, Checksum, CRC)",
        "lesson": "err-1",
        "route": "/errors",
    },
    "security": {
        "name": "Basic Network Security & Threats",
        "lesson": "sec-1",
        "route": "/packets",
    },
}

# ── Question Bank ──────────────────────────────────────────────────────────────

QUESTION_BANK: list[dict[str, Any]] = [
    # ── 1. Introduction ────────────────────────────────────────────────────────
    {
        "id": "intro-q1",
        "type": "single",
        "topic": "intro",
        "difficulty": "beginner",
        "marks": 1,
        "text": "Which network topology connects all devices to a central device such as a switch?",
        "options": ["Bus", "Star", "Ring", "Mesh"],
        "correct_answer": 1,
        "explanation": "In a Star topology, every host is connected directly to a central node (switch or hub). A failure of one cable affects only that device.",
        "practical_route": "/topology",
    },
    {
        "id": "intro-q2",
        "type": "boolean",
        "topic": "intro",
        "difficulty": "beginner",
        "marks": 1,
        "text": "True or False: In a full mesh topology with n nodes, the number of physical links required is n(n - 1) / 2.",
        "options": ["True", "False"],
        "correct_answer": 0,
        "explanation": "True. In a full mesh topology, every pair of nodes has a dedicated point-to-point link, requiring n(n - 1) / 2 duplex links.",
        "practical_route": "/topology",
    },
    {
        "id": "intro-q3",
        "type": "single",
        "topic": "intro",
        "difficulty": "beginner",
        "marks": 1,
        "text": "Which type of network spans a city-wide geographic area?",
        "options": ["PAN", "LAN", "MAN", "WAN"],
        "correct_answer": 2,
        "explanation": "A MAN (Metropolitan Area Network) covers a city or municipal area, bridging multiple LANs together.",
        "practical_route": "/topology",
    },
    {
        "id": "intro-q4",
        "type": "scenario",
        "topic": "intro",
        "difficulty": "intermediate",
        "marks": 2,
        "scenario": "A campus network has 5 departments. The network administrator notices that when one cable in the main backbone breaks, all departments lose communication with each other simultaneously.",
        "text": "Which physical topology is the backbone most likely using?",
        "options": ["Full Mesh", "Bus or single-ring", "Redundant Star", "Distributed Tree"],
        "correct_answer": 1,
        "explanation": "In a bus topology or single-ring topology, a break in the shared cable or loop brings down the entire network segment due to signal reflection or broken ring continuity.",
        "practical_route": "/topology",
    },

    # ── 2. OSI & TCP/IP Models ─────────────────────────────────────────────────
    {
        "id": "osi-q1",
        "type": "single",
        "topic": "osi",
        "difficulty": "beginner",
        "marks": 1,
        "text": "At which OSI layer does logical addressing (IPv4 and IPv6) and path determination occur?",
        "options": ["Layer 2 - Data Link", "Layer 3 - Network", "Layer 4 - Transport", "Layer 5 - Session"],
        "correct_answer": 1,
        "explanation": "Layer 3 (Network layer) manages logical device addressing (IP addresses) and routing decisions across intermediate networks.",
        "practical_route": "/protocols",
    },
    {
        "id": "osi-q2",
        "type": "matching",
        "topic": "osi",
        "difficulty": "intermediate",
        "marks": 2,
        "text": "Match each OSI layer to its corresponding Protocol Data Unit (PDU):",
        "matching_left": ["Transport Layer", "Network Layer", "Data Link Layer", "Physical Layer"],
        "matching_right": ["Frame", "Bit", "Segment", "Packet"],
        "correct_answer": {"Transport Layer": "Segment", "Network Layer": "Packet", "Data Link Layer": "Frame", "Physical Layer": "Bit"},
        "explanation": "Transport PDU is a Segment (or Datagram for UDP); Network PDU is a Packet; Data Link PDU is a Frame; Physical PDU is a raw Bit.",
        "practical_route": "/protocols",
    },
    {
        "id": "osi-q3",
        "type": "multiple",
        "topic": "osi",
        "difficulty": "intermediate",
        "marks": 2,
        "text": "Which of the following functions belong specifically to the Data Link Layer (Layer 2)? (Select two)",
        "options": [
            "Media Access Control (MAC) addressing",
            "End-to-end flow control using TCP windowing",
            "Frame delimiter and CRC error detection",
            "Routing across multiple autonomous systems"
        ],
        "correct_answer": [0, 2],
        "explanation": "The Data Link layer handles physical/MAC addressing and framing with error detection (CRC). Routing is Layer 3, and TCP windowing is Layer 4.",
        "practical_route": "/packets",
    },
    {
        "id": "osi-q4",
        "type": "single",
        "topic": "osi",
        "difficulty": "beginner",
        "marks": 1,
        "text": "The TCP/IP model's 'Internet' layer maps directly to which layer of the OSI 7-layer model?",
        "options": ["Data Link", "Network", "Transport", "Session"],
        "correct_answer": 1,
        "explanation": "The Internet layer of the TCP/IP model corresponds directly to Layer 3 (Network Layer) of the OSI reference model.",
        "practical_route": "/protocols",
    },

    # ── 3. Devices & Addressing ────────────────────────────────────────────────
    {
        "id": "devices-q1",
        "type": "single",
        "topic": "devices",
        "difficulty": "beginner",
        "marks": 1,
        "text": "What is the primary difference between a Layer 2 switch and a Layer 1 hub?",
        "options": [
            "Hubs inspect IP addresses; switches inspect MAC addresses",
            "A switch creates separate collision domains per port; a hub shares one collision domain across all ports",
            "A switch operates without power; a hub requires external AC power",
            "A switch cannot filter unicast frames; a hub can"
        ],
        "correct_answer": 1,
        "explanation": "Each switch port forms an isolated collision domain and forwards frames based on its MAC address table. A hub blindly repeats all electrical signals to every port in a single collision domain.",
        "practical_route": "/topology",
    },
    {
        "id": "devices-q2",
        "type": "single",
        "topic": "devices",
        "difficulty": "beginner",
        "marks": 1,
        "text": "How many bytes (octets) are there in a standard Ethernet MAC address?",
        "options": ["4 bytes (32 bits)", "6 bytes (48 bits)", "8 bytes (64 bits)", "16 bytes (128 bits)"],
        "correct_answer": 1,
        "explanation": "An IEEE 802 MAC-48 address is 48 bits (6 bytes) long, typically formatted as six hexadecimal pairs (e.g., 00:1A:2B:3C:4D:5E).",
        "practical_route": "/packets",
    },
    {
        "id": "devices-q3",
        "type": "scenario",
        "topic": "devices",
        "difficulty": "intermediate",
        "marks": 2,
        "scenario": "Host A (192.168.1.10) wants to send an ICMP echo request to Host B (192.168.1.20) on the same local subnet. Host A's ARP cache is currently empty.",
        "text": "What does Host A send first on the local network?",
        "options": [
            "A unicast IP packet directly to 192.168.1.20",
            "A broadcast ARP Request asking 'Who has 192.168.1.20? Tell 192.168.1.10'",
            "A DNS query to the local default gateway",
            "A TCP SYN handshake packet to port 80"
        ],
        "correct_answer": 1,
        "explanation": "Before encapsulation at Layer 2 can occur, Host A must know Host B's MAC address. It broadcasts an ARP Request frame to FF:FF:FF:FF:FF:FF.",
        "practical_route": "/protocols",
    },
    {
        "id": "devices-q4",
        "type": "boolean",
        "topic": "devices",
        "difficulty": "beginner",
        "marks": 1,
        "text": "True or False: A standard router separates both collision domains and broadcast domains.",
        "options": ["True", "False"],
        "correct_answer": 0,
        "explanation": "True. Routers break up broadcast domains (broadcast frames are not forwarded past a router interface by default) as well as collision domains.",
        "practical_route": "/topology",
    },

    # ── 4. IP Addressing & Subnetting ──────────────────────────────────────────
    {
        "id": "subnet-q1",
        "type": "numerical",
        "topic": "subnetting",
        "difficulty": "intermediate",
        "marks": 2,
        "text": "How many usable host IP addresses are available in a /27 IPv4 subnet?",
        "options": ["28", "30", "32", "62"],
        "correct_answer": 1,
        "explanation": "In a /27 network, 32 - 27 = 5 host bits. Total addresses = 2^5 = 32. Subtracting 2 (network address and broadcast address) gives 30 usable host addresses.",
        "practical_route": "/subnetting",
    },
    {
        "id": "subnet-q2",
        "type": "single",
        "topic": "subnetting",
        "difficulty": "beginner",
        "marks": 1,
        "text": "Which of the following IPv4 addresses is in a private address block according to RFC 1918?",
        "options": ["172.33.10.5", "192.168.45.100", "11.0.0.1", "203.0.113.1"],
        "correct_answer": 1,
        "explanation": "RFC 1918 defines private ranges: 10.0.0.0/8, 172.16.0.0/12 (172.16.0.0 - 172.31.255.255), and 192.168.0.0/16. 192.168.45.100 is private.",
        "practical_route": "/subnetting",
    },
    {
        "id": "subnet-q3",
        "type": "single",
        "topic": "subnetting",
        "difficulty": "intermediate",
        "marks": 2,
        "text": "What is the broadcast address for the subnet containing host 10.1.20.155 with subnet mask 255.255.255.224 (/27)?",
        "options": ["10.1.20.159", "10.1.20.191", "10.1.20.255", "10.1.20.127"],
        "correct_answer": 0,
        "explanation": "Mask 255.255.255.224 has a block size of 256 - 224 = 32. Multiples of 32: 0, 32, 64, 96, 128, 160. Host .155 falls in subnet 10.1.20.128/27. The broadcast address is 10.1.20.128 + 31 = 10.1.20.159.",
        "practical_route": "/subnetting",
    },
    {
        "id": "subnet-q4",
        "type": "multiple",
        "topic": "subnetting",
        "difficulty": "intermediate",
        "marks": 2,
        "text": "Which of the following prefix lengths can accommodate at least 50 usable host devices? (Select all that apply)",
        "options": ["/26 (255.255.255.192)", "/27 (255.255.255.224)", "/25 (255.255.255.128)", "/28 (255.255.255.240)"],
        "correct_answer": [0, 2],
        "explanation": "/26 provides 2^6 - 2 = 62 usable hosts. /25 provides 2^7 - 2 = 126 usable hosts. /27 only provides 30 hosts and /28 provides 14 hosts.",
        "practical_route": "/subnetting",
    },

    # ── 5. FLSM & VLSM ─────────────────────────────────────────────────────────
    {
        "id": "vlsm-q1",
        "type": "scenario",
        "topic": "vlsm",
        "difficulty": "intermediate",
        "marks": 2,
        "scenario": "A company is assigned the parent network 172.16.0.0/24. They need to create a dedicated point-to-point serial WAN link between two corporate routers requiring exactly 2 usable IP addresses.",
        "text": "What is the most efficient subnet mask prefix length for this link without wasting address space?",
        "options": ["/29", "/30", "/31", "/28"],
        "correct_answer": 1,
        "explanation": "A /30 prefix provides 4 total addresses (2^2), with 2 usable host addresses for the two router interfaces, 1 network address, and 1 broadcast address.",
        "practical_route": "/subnetting",
    },
    {
        "id": "vlsm-q2",
        "type": "single",
        "topic": "vlsm",
        "difficulty": "intermediate",
        "marks": 2,
        "text": "When performing Variable-Length Subnet Masking (VLSM) on a major network block, what is the best practice order of allocation?",
        "options": [
            "Allocate the smallest host requirements first to save small blocks",
            "Sort and allocate the largest host requirement subnets first",
            "Allocate WAN point-to-point links first, then LAN segments",
            "Allocate subnets in alphabetical order by department name"
        ],
        "correct_answer": 1,
        "explanation": "Sorting from largest subnet to smallest ensures that larger power-of-two address blocks remain aligned on natural binary boundaries and avoids address fragmentation.",
        "practical_route": "/subnetting",
    },
    {
        "id": "vlsm-q3",
        "type": "boolean",
        "topic": "vlsm",
        "difficulty": "beginner",
        "marks": 1,
        "text": "True or False: In Fixed-Length Subnet Masking (FLSM), every subnet created from a parent network has the exact same prefix length and number of host addresses.",
        "options": ["True", "False"],
        "correct_answer": 0,
        "explanation": "True. FLSM divides a network into identical equal-sized subnets, whereas VLSM allows subnets of varying prefix lengths to match specific needs.",
        "practical_route": "/subnetting",
    },

    # ── 6. Protocols ───────────────────────────────────────────────────────────
    {
        "id": "proto-q1",
        "type": "single",
        "topic": "protocols",
        "difficulty": "beginner",
        "marks": 1,
        "text": "What flags are set in the three packets exchanged during a normal TCP three-way handshake?",
        "options": [
            "SYN -> ACK -> FIN",
            "SYN -> SYN+ACK -> ACK",
            "ACK -> SYN -> DATA",
            "RST -> SYN -> ACK"
        ],
        "correct_answer": 1,
        "explanation": "The client sends a SYN packet, the server responds with a SYN+ACK packet, and the client finishes connection establishment with an ACK packet.",
        "practical_route": "/protocols",
    },
    {
        "id": "proto-q2",
        "type": "matching",
        "topic": "protocols",
        "difficulty": "intermediate",
        "marks": 2,
        "text": "Match each application protocol to its standard default transport port:",
        "matching_left": ["DNS", "HTTP", "HTTPS", "DHCP Server"],
        "matching_right": ["Port 443", "Port 67", "Port 53", "Port 80"],
        "correct_answer": {"DNS": "Port 53", "HTTP": "Port 80", "HTTPS": "Port 443", "DHCP Server": "Port 67"},
        "explanation": "DNS runs on port 53 (UDP/TCP); HTTP uses port 80 TCP; HTTPS uses port 443 TCP; DHCP server listens on UDP port 67.",
        "practical_route": "/protocols",
    },
    {
        "id": "proto-q3",
        "type": "multiple",
        "topic": "protocols",
        "difficulty": "intermediate",
        "marks": 2,
        "text": "Which of the following characteristics describe the User Datagram Protocol (UDP)? (Select two)",
        "options": [
            "Connectionless transport with zero handshake overhead",
            "Guaranteed delivery using sequence and acknowledgement numbers",
            "No built-in retransmission for lost or dropped packets",
            "Three-way handshake establishment before data transfer"
        ],
        "correct_answer": [0, 2],
        "explanation": "UDP is connectionless and does not provide reliability, sequence tracking, or retransmission. Those reliability features are handled by TCP.",
        "practical_route": "/protocols",
    },
    {
        "id": "proto-q4",
        "type": "single",
        "topic": "protocols",
        "difficulty": "beginner",
        "marks": 1,
        "text": "Which network utility uses ICMP Echo Request and Echo Reply messages to test round-trip reachability?",
        "options": ["netstat", "ping", "arp -a", "ipconfig"],
        "correct_answer": 1,
        "explanation": "The ping command sends ICMP Echo Request packets (Type 8) and listens for ICMP Echo Reply packets (Type 0) from the target host.",
        "practical_route": "/protocols",
    },

    # ── 7. Packet Analysis ─────────────────────────────────────────────────────
    {
        "id": "pkt-q1",
        "type": "scenario",
        "topic": "packets",
        "difficulty": "intermediate",
        "marks": 2,
        "scenario": "A student inspects a captured IPv4 header in NetLab's PCAP Analyzer. The header contains Protocol field = 0x06 and Flags show FIN and ACK set.",
        "text": "What type of traffic and session event is occurring in this packet?",
        "options": [
            "UDP DNS resolution query",
            "TCP connection termination exchange",
            "ICMP Destination Unreachable notification",
            "ARP probe sequence"
        ],
        "correct_answer": 1,
        "explanation": "IP protocol 6 denotes TCP (protocol 17 is UDP, protocol 1 is ICMP). FIN and ACK flags signify the graceful closing of an established TCP connection.",
        "practical_route": "/packets",
    },
    {
        "id": "pkt-q2",
        "type": "single",
        "topic": "packets",
        "difficulty": "intermediate",
        "marks": 1,
        "text": "What happens when an IPv4 packet's Time To Live (TTL) field decrements to zero at an intermediate router?",
        "options": [
            "The router forwards it to the default gateway",
            "The packet is dropped and the router sends an ICMP Time Exceeded message back to the sender",
            "The router resets TTL back to 64",
            "The packet is converted to a broadcast frame"
        ],
        "correct_answer": 1,
        "explanation": "When TTL reaches 0, the router discards the packet to prevent infinite routing loops and returns an ICMP Type 11 (Time Exceeded) message to the source IP.",
        "practical_route": "/packets",
    },
    {
        "id": "pkt-q3",
        "type": "single",
        "topic": "packets",
        "difficulty": "beginner",
        "marks": 1,
        "text": "What is the standard Ethernet Maximum Transmission Unit (MTU) size for payload data without 802.1Q tags?",
        "options": ["512 bytes", "1024 bytes", "1500 bytes", "9000 bytes"],
        "correct_answer": 2,
        "explanation": "The standard Ethernet MTU is 1500 bytes. Larger sizes such as 9000 bytes are known as Jumbo Frames.",
        "practical_route": "/packets",
    },

    # ── 8. Bandwidth & Performance ─────────────────────────────────────────────
    {
        "id": "bw-q1",
        "type": "single",
        "topic": "bandwidth",
        "difficulty": "intermediate",
        "marks": 1,
        "text": "A network connection has a nominal bandwidth of 100 Mbps. A transfer test measures an effective data rate of 80 Mbps. The 80 Mbps value is the:",
        "options": ["Latency", "Throughput", "Bandwidth-Delay Product", "Jitter"],
        "correct_answer": 1,
        "explanation": "Bandwidth is the theoretical maximum link capacity. Throughput is the actual payload transfer rate achieved after protocol overhead and network delays.",
        "practical_route": "/bandwidth",
    },
    {
        "id": "bw-q2",
        "type": "numerical",
        "topic": "bandwidth",
        "difficulty": "intermediate",
        "marks": 2,
        "text": "Calculate the Bandwidth-Delay Product (BDP) for a link with 100 Mbps bandwidth and a Round-Trip Time (RTT) of 40 milliseconds (0.040 s) in Megabits (Mb):",
        "options": ["2.5 Mb", "4.0 Mb", "40.0 Mb", "400.0 Mb"],
        "correct_answer": 1,
        "explanation": "BDP = Bandwidth * RTT = 100 Mbps * 0.040 s = 4.0 Megabits (or 500 KB). This represents the maximum amount of data in-flight on the link.",
        "practical_route": "/bandwidth",
    },
    {
        "id": "bw-q3",
        "type": "boolean",
        "topic": "bandwidth",
        "difficulty": "beginner",
        "marks": 1,
        "text": "True or False: A link speed of 8 Megabits per second (8 Mbps) corresponds to a theoretical download speed of approximately 1 Megabyte per second (1 MB/s).",
        "options": ["True", "False"],
        "correct_answer": 0,
        "explanation": "True. There are 8 bits in 1 byte, so 8 Mbps / 8 = 1 MB/s (ignoring protocol header overhead).",
        "practical_route": "/bandwidth",
    },
    {
        "id": "bw-q4",
        "type": "scenario",
        "topic": "bandwidth",
        "difficulty": "advanced",
        "marks": 2,
        "scenario": "A host notices that during large video uploads, interactive web browsing becomes extremely sluggish, and ping times spike from 15 ms to over 800 ms, even though packets are not dropped.",
        "text": "What networking phenomenon is occurring on the bottleneck router?",
        "options": ["ARP Spoofing", "Bufferbloat / excessive queuing delay", "DNS poisoning", "Half-duplex collision storm"],
        "correct_answer": 1,
        "explanation": "Bufferbloat occurs when oversized router buffers hold packets too long before dropping them, introducing massive queuing delay while preventing TCP congestion control from kicking in quickly.",
        "practical_route": "/bandwidth",
    },

    # ── 9. Error Detection & Correction ────────────────────────────────────────
    {
        "id": "err-q1",
        "type": "single",
        "topic": "errors",
        "difficulty": "beginner",
        "marks": 1,
        "text": "Which error detection mechanism is built into Ethernet frame trailers (FCS)?",
        "options": ["Simple 1-bit Parity", "Internet 16-bit Checksum", "CRC-32 (Cyclic Redundancy Check)", "Hamming (7,4) Code"],
        "correct_answer": 2,
        "explanation": "Ethernet frames append a 4-byte (32-bit) Frame Check Sequence (FCS) calculated via the standard CRC-32 polynomial.",
        "practical_route": "/errors",
    },
    {
        "id": "err-q2",
        "type": "numerical",
        "topic": "errors",
        "difficulty": "intermediate",
        "marks": 1,
        "text": "For data bits 1101001, what is the required even parity bit to append?",
        "options": ["0", "1"],
        "correct_answer": 0,
        "explanation": "Data 1101001 contains four '1' bits, which is already an even number. Therefore, the even parity bit is 0.",
        "practical_route": "/errors",
    },
    {
        "id": "err-q3",
        "type": "multiple",
        "topic": "errors",
        "difficulty": "intermediate",
        "marks": 2,
        "text": "Which of the following statements regarding CRC (Cyclic Redundancy Check) are true? (Select two)",
        "options": [
            "CRC is based on binary polynomial modulo-2 division",
            "A CRC of length r can detect all burst errors of length r or less",
            "CRC can automatically correct 4-bit errors without retransmission",
            "CRC uses simple 1's complement addition like the IP checksum"
        ],
        "correct_answer": [0, 1],
        "explanation": "CRC operates via modulo-2 arithmetic (XOR) polynomial division and guarantees detection of all burst errors with length up to the degree of the generator polynomial.",
        "practical_route": "/errors",
    },
    {
        "id": "err-q4",
        "type": "boolean",
        "topic": "errors",
        "difficulty": "beginner",
        "marks": 1,
        "text": "True or False: A simple single-bit parity check cannot detect an error if an even number of bits (e.g., 2 bits) are flipped during transmission.",
        "options": ["True", "False"],
        "correct_answer": 0,
        "explanation": "True. Flipping an even number of bits preserves the parity of the count of 1s, meaning the parity check still passes undetected.",
        "practical_route": "/errors",
    },

    # ── 10. Basic Network Security ─────────────────────────────────────────────
    {
        "id": "sec-q1",
        "type": "scenario",
        "topic": "security",
        "difficulty": "advanced",
        "marks": 2,
        "scenario": "An attacker sends hundreds of thousands of TCP SYN packets to an enterprise web server with spoofed unreachable source IP addresses, never sending the final ACK packet.",
        "text": "What type of attack is this, and what resource is depleted?",
        "options": [
            "ARP Poisoning depleting the switch MAC table",
            "SYN Flood attack depleting the server's half-open connection backlog table",
            "Man-in-the-Middle decrypting HTTPS sessions",
            "Smurf attack filling the local DNS cache"
        ],
        "correct_answer": 1,
        "explanation": "A SYN flood is a Denial of Service attack where the server allocates transmission control blocks (TCBs) for half-open handshakes until memory and connection tables are exhausted.",
        "practical_route": "/packets",
    },
    {
        "id": "sec-q2",
        "type": "single",
        "topic": "security",
        "difficulty": "intermediate",
        "marks": 1,
        "text": "How does a stateful inspection firewall differ from a simple stateless packet filter?",
        "options": [
            "A stateful firewall runs at the physical layer",
            "A stateful firewall tracks active TCP/UDP connections and dynamically permits return traffic for established sessions",
            "A stateful firewall only inspects MAC addresses",
            "A stateful firewall does not inspect port numbers"
        ],
        "correct_answer": 1,
        "explanation": "Stateful firewalls maintain a state table of ongoing connections so inbound packets that belong to existing outbound connections are automatically allowed without opening arbitrary inbound ports.",
        "practical_route": "/packets",
    },
    {
        "id": "sec-q3",
        "type": "multiple",
        "topic": "security",
        "difficulty": "intermediate",
        "marks": 2,
        "text": "Which of the following mechanisms help mitigate ARP Spoofing / ARP Poisoning on a local area network? (Select two)",
        "options": [
            "Dynamic ARP Inspection (DAI) on managed switches",
            "Static ARP table entries for critical servers and gateways",
            "Changing subnet mask from /24 to /28",
            "Using unmanaged hubs instead of switches"
        ],
        "correct_answer": [0, 1],
        "explanation": "DAI validates ARP packets against DHCP snooping binding databases, and static ARP entries prevent malicious updates to ARP tables.",
        "practical_route": "/topology",
    },
]

# Quick lookup by question ID
QUESTION_INDEX: dict[str, dict[str, Any]] = {q["id"]: q for q in QUESTION_BANK}

# ── Predefined Assessments ─────────────────────────────────────────────────────

PREDEFINED_ASSESSMENTS: list[dict[str, Any]] = [
    # ── Category 1: Topic-wise Tests ──────────────────────────────────────────
    {
        "id": "test-topic-intro",
        "title": "Introduction to Networks & Topologies",
        "description": "Test your grasp of computer network classifications, LAN/WAN/MAN architectures, and network topologies.",
        "category": "topic",
        "difficulty": "beginner",
        "duration_mins": 10,
        "question_ids": ["intro-q1", "intro-q2", "intro-q3", "intro-q4"],
        "topics": ["intro"],
        "pass_percentage": 60,
        "practical_route": "/topology",
    },
    {
        "id": "test-topic-osi",
        "title": "OSI & TCP/IP Architecture Exam",
        "description": "Evaluate your understanding of the 7-layer OSI model, encapsulation, PDUs, and the TCP/IP stack.",
        "category": "topic",
        "difficulty": "intermediate",
        "duration_mins": 12,
        "question_ids": ["osi-q1", "osi-q2", "osi-q3", "osi-q4"],
        "topics": ["osi"],
        "pass_percentage": 60,
        "practical_route": "/protocols",
    },
    {
        "id": "test-topic-devices",
        "title": "Network Devices & Layer-2 Operations",
        "description": "Assess knowledge of hubs, switches, routers, MAC addressing, and the ARP protocol.",
        "category": "topic",
        "difficulty": "beginner",
        "duration_mins": 10,
        "question_ids": ["devices-q1", "devices-q2", "devices-q3", "devices-q4"],
        "topics": ["devices"],
        "pass_percentage": 60,
        "practical_route": "/topology",
    },
    {
        "id": "test-topic-subnetting",
        "title": "IPv4 Subnetting & CIDR Mastery",
        "description": "Challenge your address calculation skills: usable host ranges, broadcast addresses, and netmasks.",
        "category": "topic",
        "difficulty": "intermediate",
        "duration_mins": 15,
        "question_ids": ["subnet-q1", "subnet-q2", "subnet-q3", "subnet-q4"],
        "topics": ["subnetting"],
        "pass_percentage": 60,
        "practical_route": "/subnetting",
    },
    {
        "id": "test-topic-vlsm",
        "title": "FLSM & VLSM Design Assessment",
        "description": "Test design skills for variable-length subnetting and address space optimization.",
        "category": "topic",
        "difficulty": "intermediate",
        "duration_mins": 12,
        "question_ids": ["vlsm-q1", "vlsm-q2", "vlsm-q3"],
        "topics": ["vlsm"],
        "pass_percentage": 60,
        "practical_route": "/subnetting",
    },
    {
        "id": "test-topic-protocols",
        "title": "Transport & Application Protocols",
        "description": "Evaluate knowledge of TCP handshakes, UDP, DNS, DHCP, HTTP, and ICMP.",
        "category": "topic",
        "difficulty": "intermediate",
        "duration_mins": 15,
        "question_ids": ["proto-q1", "proto-q2", "proto-q3", "proto-q4"],
        "topics": ["protocols"],
        "pass_percentage": 60,
        "practical_route": "/protocols",
    },
    {
        "id": "test-topic-packets",
        "title": "Packet Inspection & PCAP Analysis",
        "description": "Analyze protocol headers, flags, MTU limits, and packet traces.",
        "category": "topic",
        "difficulty": "intermediate",
        "duration_mins": 10,
        "question_ids": ["pkt-q1", "pkt-q2", "pkt-q3"],
        "topics": ["packets"],
        "pass_percentage": 60,
        "practical_route": "/packets",
    },
    {
        "id": "test-topic-bandwidth",
        "title": "Bandwidth, Throughput & QoS Performance",
        "description": "Test understanding of latency, BDP, bufferbloat, and throughput metrics.",
        "category": "topic",
        "difficulty": "intermediate",
        "duration_mins": 12,
        "question_ids": ["bw-q1", "bw-q2", "bw-q3", "bw-q4"],
        "topics": ["bandwidth"],
        "pass_percentage": 60,
        "practical_route": "/bandwidth",
    },
    {
        "id": "test-topic-errors",
        "title": "Error Detection (Parity, Checksum, CRC)",
        "description": "Assess understanding of bit error detection, parity checking, and CRC-32 polynomials.",
        "category": "topic",
        "difficulty": "intermediate",
        "duration_mins": 12,
        "question_ids": ["err-q1", "err-q2", "err-q3", "err-q4"],
        "topics": ["errors"],
        "pass_percentage": 60,
        "practical_route": "/errors",
    },
    {
        "id": "test-topic-security",
        "title": "Network Security & Threat Mitigation",
        "description": "Test comprehension of stateful firewalls, SYN floods, and ARP spoofing defenses.",
        "category": "topic",
        "difficulty": "advanced",
        "duration_mins": 12,
        "question_ids": ["sec-q1", "sec-q2", "sec-q3"],
        "topics": ["security"],
        "pass_percentage": 60,
        "practical_route": "/packets",
    },

    # ── Category 2: Difficulty-wise Tests ─────────────────────────────────────
    {
        "id": "test-diff-beginner",
        "title": "Networking Fundamentals Certification",
        "description": "Comprehensive evaluation of foundational concepts across topologies, OSI layers, and devices.",
        "category": "difficulty",
        "difficulty": "beginner",
        "duration_mins": 20,
        "question_ids": [
            "intro-q1", "intro-q2", "intro-q3",
            "osi-q1", "osi-q4",
            "devices-q1", "devices-q2", "devices-q4",
            "subnet-q2", "vlsm-q3",
            "proto-q1", "proto-q4",
            "pkt-q3", "bw-q3", "err-q1", "err-q4"
        ],
        "topics": ["intro", "osi", "devices", "subnetting", "vlsm", "protocols", "packets", "bandwidth", "errors"],
        "pass_percentage": 70,
        "practical_route": "/topology",
    },
    {
        "id": "test-diff-intermediate",
        "title": "Intermediate Network Engineer Challenge",
        "description": "Assess skills in subnetting, protocol handshakes, packet headers, and CRC error algorithms.",
        "category": "difficulty",
        "difficulty": "intermediate",
        "duration_mins": 25,
        "question_ids": [
            "intro-q4", "osi-q2", "osi-q3",
            "devices-q3", "subnet-q1", "subnet-q3", "subnet-q4",
            "vlsm-q1", "vlsm-q2", "proto-q2", "proto-q3",
            "pkt-q1", "pkt-q2", "bw-q1", "bw-q2",
            "err-q2", "err-q3", "sec-q2", "sec-q3"
        ],
        "topics": ["intro", "osi", "devices", "subnetting", "vlsm", "protocols", "packets", "bandwidth", "errors", "security"],
        "pass_percentage": 65,
        "practical_route": "/subnetting",
    },
    {
        "id": "test-diff-advanced",
        "title": "Advanced Diagnostic & Protocol Assessment",
        "description": "High-level examination testing bufferbloat troubleshooting, SYN floods, and complex network scenarios.",
        "category": "difficulty",
        "difficulty": "advanced",
        "duration_mins": 20,
        "question_ids": [
            "bw-q4", "sec-q1", "sec-q2", "sec-q3",
            "pkt-q1", "vlsm-q1", "subnet-q3", "err-q3"
        ],
        "topics": ["security", "bandwidth", "packets", "vlsm", "subnetting", "errors"],
        "pass_percentage": 65,
        "practical_route": "/packets",
    },

    # ── Category 3: Mixed / Comprehensive ─────────────────────────────────────
    {
        "id": "test-comprehensive",
        "title": "NetLab Comprehensive Grand Assessment",
        "description": "Full-spectrum examination spanning all 10 networking modules from physical layer to cybersecurity.",
        "category": "mixed",
        "difficulty": "mixed",
        "duration_mins": 35,
        "question_ids": [
            "intro-q1", "intro-q4",
            "osi-q1", "osi-q2", "osi-q3",
            "devices-q1", "devices-q3",
            "subnet-q1", "subnet-q2", "subnet-q3",
            "vlsm-q1", "vlsm-q2",
            "proto-q1", "proto-q2", "proto-q3",
            "pkt-q1", "pkt-q2",
            "bw-q1", "bw-q2", "bw-q4",
            "err-q1", "err-q2", "err-q3",
            "sec-q1", "sec-q2", "sec-q3"
        ],
        "topics": ["intro", "osi", "devices", "subnetting", "vlsm", "protocols", "packets", "bandwidth", "errors", "security"],
        "pass_percentage": 70,
        "practical_route": "/learn",
    },

    # ── Category 4: Practical Knowledge Test ──────────────────────────────────
    {
        "id": "test-practical",
        "title": "NetLab Practical Labs Diagnostic Exam",
        "description": "Scenario-driven test evaluating practical hands-on skills from Packet Analyzer, Topology Lab, Subnetting, and Bandwidth Monitor.",
        "category": "practical",
        "difficulty": "intermediate",
        "duration_mins": 25,
        "question_ids": [
            "intro-q4", "devices-q3", "subnet-q3",
            "vlsm-q1", "pkt-q1", "pkt-q2",
            "bw-q2", "bw-q4", "err-q2", "sec-q1"
        ],
        "topics": ["intro", "devices", "subnetting", "vlsm", "packets", "bandwidth", "errors", "security"],
        "pass_percentage": 60,
        "practical_route": "/packets",
    },
]

TEST_INDEX: dict[str, dict[str, Any]] = {t["id"]: t for t in PREDEFINED_ASSESSMENTS}


# ── Helper to convert internal question dict to QuestionOut ──────────────────

def _to_question_out(q: dict[str, Any]) -> QuestionOut:
    t_id = q.get("topic", "intro")
    t_name = TOPIC_META.get(t_id, {}).get("name", t_id.upper())

    matching_left = q.get("matching_left")
    matching_right = None
    if matching_left and q.get("matching_right"):
        # Provide matching_right shuffled in deterministic manner
        mr = list(q["matching_right"])
        mr.sort()
        matching_right = mr

    return QuestionOut(
        id=q["id"],
        type=q["type"],
        text=q["text"],
        options=q.get("options"),
        matching_left=matching_left,
        matching_right=matching_right,
        scenario=q.get("scenario"),
        marks=q.get("marks", 1),
        difficulty=q["difficulty"],
        topic=t_id,
        topic_name=t_name,
        practical_route=q.get("practical_route"),
    )


# ── Service Methods ────────────────────────────────────────────────────────────

def list_assessments() -> list[AssessmentMeta]:
    """Returns metadata for all available predefined assessments."""
    res: list[AssessmentMeta] = []
    for t in PREDEFINED_ASSESSMENTS:
        q_ids = t["question_ids"]
        max_marks = sum(QUESTION_INDEX[qid].get("marks", 1) for qid in q_ids if qid in QUESTION_INDEX)
        res.append(
            AssessmentMeta(
                id=t["id"],
                title=t["title"],
                description=t["description"],
                category=t["category"],
                difficulty=t["difficulty"],
                duration_mins=t["duration_mins"],
                question_count=len(q_ids),
                max_marks=max_marks,
                topics=t["topics"],
                pass_percentage=t.get("pass_percentage", 60),
                practical_route=t.get("practical_route"),
            )
        )
    return res


def get_assessment(test_id: str) -> AssessmentDetail:
    """Returns the assessment detail and sanitized questions for a test."""
    t = TEST_INDEX.get(test_id)
    if not t:
        raise AppError(404, "test_not_found", f"Assessment '{test_id}' does not exist.")

    q_ids = t["question_ids"]
    questions: list[QuestionOut] = []
    max_marks = 0

    for qid in q_ids:
        q = QUESTION_INDEX.get(qid)
        if q:
            questions.append(_to_question_out(q))
            max_marks += q.get("marks", 1)

    return AssessmentDetail(
        id=t["id"],
        title=t["title"],
        description=t["description"],
        category=t["category"],
        difficulty=t["difficulty"],
        duration_mins=t["duration_mins"],
        question_count=len(questions),
        max_marks=max_marks,
        topics=t["topics"],
        pass_percentage=t.get("pass_percentage", 60),
        practical_route=t.get("practical_route"),
        questions=questions,
    )


def generate_custom_assessment(req: CustomTestRequest) -> AssessmentDetail:
    """Generates a custom practice test from the question bank matching filters."""
    # Filter candidates
    candidates = list(QUESTION_BANK)
    if req.topics:
        candidates = [q for q in candidates if q.get("topic") in req.topics]
    if req.difficulty != "all":
        candidates = [q for q in candidates if q.get("difficulty") == req.difficulty]

    if not candidates:
        # Fallback to all questions if filters too restrictive
        candidates = list(QUESTION_BANK)

    # Pick up to count deterministically
    count = min(req.question_count, len(candidates))
    # Stable pseudo-random sample based on sorted ids
    selected = sorted(candidates, key=lambda q: q["id"])[:count]

    questions = [_to_question_out(q) for q in selected]
    max_marks = sum(q.get("marks", 1) for q in selected)
    topics_used = sorted(list({q.get("topic", "intro") for q in selected}))
    duration = max(5, count * 2)

    return AssessmentDetail(
        id="custom-practice",
        title="Custom Practice Test",
        description=f"Generated practice assessment covering {len(topics_used)} topic(s) with {count} questions.",
        category="custom",
        difficulty=req.difficulty,
        duration_mins=duration if req.timed else 0,
        question_count=count,
        max_marks=max_marks,
        topics=topics_used,
        pass_percentage=60,
        practical_route="/learn",
        questions=questions,
    )


def evaluate_submission(db: Session, req: SubmitAnswer) -> AssessmentResult:
    """Validates student answers, calculates score, generates reviews and breakdown,

    and saves the attempt in the database.
    """
    total_questions = len(req.question_ids)
    answered_questions = 0
    correct_count = 0
    incorrect_count = 0
    total_marks = 0
    marks_obtained = 0.0

    reviews: list[QuestionReview] = []
    topic_data: dict[str, dict[str, Any]] = {}

    for qid in req.question_ids:
        q = QUESTION_INDEX.get(qid)
        if not q:
            continue

        q_marks = q.get("marks", 1)
        total_marks += q_marks
        q_topic = q.get("topic", "intro")

        if q_topic not in topic_data:
            topic_data[q_topic] = {
                "total_questions": 0,
                "correct_questions": 0,
                "score": 0.0,
                "max_score": 0.0,
            }
        topic_data[q_topic]["total_questions"] += 1
        topic_data[q_topic]["max_score"] += q_marks

        student_ans = req.answers.get(qid)
        has_answered = student_ans is not None and student_ans != ""

        if has_answered:
            answered_questions += 1

        is_correct = False
        correct_ans = q.get("correct_answer")
        q_type = q.get("type")

        if has_answered:
            if q_type in ("single", "boolean", "scenario", "numerical"):
                # Handle numeric string or int comparison
                try:
                    if isinstance(correct_ans, int) and (isinstance(student_ans, int) or (isinstance(student_ans, str) and student_ans.isdigit())):
                        is_correct = int(student_ans) == correct_ans
                    else:
                        is_correct = str(student_ans).strip().lower() == str(correct_ans).strip().lower()
                except Exception:
                    is_correct = False
            elif q_type == "multiple":
                if isinstance(student_ans, list) and isinstance(correct_ans, list):
                    is_correct = sorted(student_ans) == sorted(correct_ans)
            elif q_type == "matching":
                if isinstance(student_ans, dict) and isinstance(correct_ans, dict):
                    is_correct = student_ans == correct_ans

        q_obtained = float(q_marks) if is_correct else 0.0
        marks_obtained += q_obtained

        if is_correct:
            correct_count += 1
            topic_data[q_topic]["correct_questions"] += 1
            topic_data[q_topic]["score"] += q_obtained
        elif has_answered:
            incorrect_count += 1

        t_name = TOPIC_META.get(q_topic, {}).get("name", q_topic.upper())
        matching_left = q.get("matching_left")
        matching_right = q.get("matching_right")

        reviews.append(
            QuestionReview(
                id=q["id"],
                type=q["type"],
                text=q["text"],
                options=q.get("options"),
                matching_left=matching_left,
                matching_right=matching_right,
                scenario=q.get("scenario"),
                student_answer=student_ans,
                correct_answer=correct_ans,
                is_correct=is_correct,
                marks_obtained=q_obtained,
                max_marks=q_marks,
                explanation=q.get("explanation", "No explanation available."),
                topic=q_topic,
                topic_name=t_name,
                practical_route=q.get("practical_route"),
            )
        )

    unanswered_count = total_questions - answered_questions
    pct = round((marks_obtained / total_marks * 100), 1) if total_marks > 0 else 0.0

    # Determine passing threshold
    test_meta = TEST_INDEX.get(req.test_id)
    pass_pct = test_meta.get("pass_percentage", 60) if test_meta else 60
    passed = pct >= pass_pct

    # Topic breakdown
    topic_breakdown: dict[str, TopicScore] = {}
    weak_topics: list[str] = []

    for t_id, data in topic_data.items():
        t_meta = TOPIC_META.get(t_id, {})
        t_max = data["max_score"]
        t_score = data["score"]
        t_pct = round((t_score / t_max * 100), 1) if t_max > 0 else 0.0

        if t_pct < 60.0:
            weak_topics.append(t_meta.get("name", t_id))

        topic_breakdown[t_id] = TopicScore(
            topic=t_id,
            topic_name=t_meta.get("name", t_id),
            total_questions=data["total_questions"],
            correct_questions=data["correct_questions"],
            score=t_score,
            max_score=t_max,
            percentage=t_pct,
            recommended_lesson=t_meta.get("lesson"),
            recommended_route=t_meta.get("route"),
        )

    now_iso = datetime.now(timezone.utc).isoformat()

    # Save to experiments table for persistence
    exp_record = exp_svc.create(
        db,
        {
            "module": "assessments",
            "name": f"Assessment: {req.test_title}",
            "inputs": {
                "test_id": req.test_id,
                "test_title": req.test_title,
                "test_type": req.test_type,
                "time_taken_seconds": req.time_taken_seconds,
                "question_ids": req.question_ids,
            },
            "results": {
                "passed": passed,
                "total_questions": total_questions,
                "answered_questions": answered_questions,
                "unanswered_questions": unanswered_count,
                "correct_answers": correct_count,
                "incorrect_answers": incorrect_count,
                "weak_topics": weak_topics,
                "topic_breakdown": {k: v.model_dump() for k, v in topic_breakdown.items()},
                "reviews": [r.model_dump() for r in reviews],
            },
            "metrics": {
                "score": marks_obtained,
                "total_marks": total_marks,
                "percentage": pct,
                "correct": correct_count,
                "incorrect": incorrect_count,
                "time_seconds": req.time_taken_seconds,
            },
            "notes": f"Scored {marks_obtained}/{total_marks} ({pct}%) in {req.test_title}. Result: {'PASSED' if passed else 'NEEDS IMPROVEMENT'}.",
        },
    )

    return AssessmentResult(
        attempt_id=exp_record["id"],
        test_id=req.test_id,
        test_title=req.test_title,
        total_questions=total_questions,
        answered_questions=answered_questions,
        unanswered_questions=unanswered_count,
        correct_answers=correct_count,
        incorrect_answers=incorrect_count,
        total_marks=total_marks,
        marks_obtained=marks_obtained,
        percentage=pct,
        passed=passed,
        pass_percentage=pass_pct,
        time_taken_seconds=req.time_taken_seconds,
        topic_breakdown=topic_breakdown,
        weak_topics=weak_topics,
        reviews=reviews,
        created_at=now_iso,
    )


def list_attempts(db: Session, page: int = 1, page_size: int = 20) -> tuple[list[AttemptSummary], int]:
    """Returns list of previous assessment attempts from the database."""
    items, total = exp_svc.list_(db, module="assessments", page=page, page_size=page_size)
    summaries: list[AttemptSummary] = []

    for item in items:
        metrics = item.get("metrics", {})
        inputs = item.get("inputs", {})
        results = item.get("results", {})

        pct = float(metrics.get("percentage", 0.0))
        score = float(metrics.get("score", 0.0))
        total_m = float(metrics.get("total_marks", 10.0))
        passed = bool(results.get("passed", pct >= 60.0))

        summaries.append(
            AttemptSummary(
                id=item["id"],
                test_id=inputs.get("test_id", "test"),
                test_name=inputs.get("test_title", item.get("name", "Assessment")),
                created_at=item["created_at"].isoformat() if hasattr(item["created_at"], "isoformat") else str(item["created_at"]),
                score=score,
                total_marks=total_m,
                percentage=pct,
                passed=passed,
                time_seconds=int(metrics.get("time_seconds", 0)),
                correct=int(metrics.get("correct", 0)),
                incorrect=int(metrics.get("incorrect", 0)),
            )
        )

    return summaries, total


def get_attempt_detail(db: Session, attempt_id: int) -> AssessmentResult:
    """Returns the full evaluation result of a previously stored attempt."""
    exp = exp_svc.get(db, attempt_id)
    if exp.module != "assessments":
        raise AppError(404, "attempt_not_found", f"Attempt #{attempt_id} is not an assessment.")

    res = exp.results or {}
    metrics = exp.metrics or {}
    inp = exp.inputs or {}

    tb = {}
    for k, v in res.get("topic_breakdown", {}).items():
        tb[k] = TopicScore(**v)

    reviews = [QuestionReview(**r) for r in res.get("reviews", [])]

    return AssessmentResult(
        attempt_id=exp.id,
        test_id=inp.get("test_id", "test"),
        test_title=inp.get("test_title", exp.name),
        total_questions=int(res.get("total_questions", len(reviews))),
        answered_questions=int(res.get("answered_questions", len(reviews))),
        unanswered_questions=int(res.get("unanswered_questions", 0)),
        correct_answers=int(res.get("correct_answers", metrics.get("correct", 0))),
        incorrect_answers=int(res.get("incorrect_answers", metrics.get("incorrect", 0))),
        total_marks=int(metrics.get("total_marks", 10)),
        marks_obtained=float(metrics.get("score", 0.0)),
        percentage=float(metrics.get("percentage", 0.0)),
        passed=bool(res.get("passed", False)),
        pass_percentage=60,
        time_taken_seconds=int(metrics.get("time_seconds", inp.get("time_taken_seconds", 0))),
        topic_breakdown=tb,
        weak_topics=res.get("weak_topics", []),
        reviews=reviews,
        created_at=exp.created_at.isoformat(),
    )
