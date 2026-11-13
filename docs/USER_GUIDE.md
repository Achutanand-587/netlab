# NetLab – Comprehensive User Guide

Welcome to **NetLab (Interactive Networking Learning and Analysis Platform)**. NetLab is an educational and analytical suite designed for students, educators, and network engineers to study computer networking fundamentals through hands-on simulations, protocol dissection, interactive topologies, and live packet capture.

---

## Table of Contents
1. [Overview & Navigation](#1-overview--navigation)
2. [Module 1: Dashboard](#2-module-1-dashboard)
3. [Module 2 & 3: Packet Analyzer (Live Capture & PCAP Analyzer)](#3-module-2--3-packet-analyzer-live-capture--pcap-analyzer)
4. [Module 4: Protocol Learning Lab](#4-module-4-protocol-learning-lab)
5. [Module 5: Network Topology Simulator](#5-module-5-network-topology-simulator)
6. [Module 6: Bandwidth Monitor](#6-module-6-bandwidth-monitor)
7. [Module 7: Subnetting Calculator & VLSM Planner](#7-module-7-subnetting-calculator--vlsm-planner)
8. [Module 8: Error Detection & Correction Lab](#8-module-8-error-detection--correction-lab)
9. [Module 9: Learning Center](#9-module-9-learning-center)
10. [Module 10: Quizzes & Assessments](#10-module-10-quizzes--assessments)
11. [Module 11 & 12: Research, History & Reports](#11-module-11--12-research-history--reports)
12. [Module 13: System Settings & Health](#12-module-13-system-settings--health)

---

## 1. Overview & Navigation

NetLab features a responsive single-page architecture with a persistent navigation sidebar and header bar:
- **Sidebar**: Navigate between all 13 core modules. You can collapse/expand the sidebar using the toggle button in the header.
- **Find a Module**: Quick-filter modules by name using the search bar at the top of the screen.
- **Theme Toggle**: Switch between Dark Mode (default high-contrast dark theme) and Light Mode via the sun/moon icon.
- **System Status**: The status pill in the top header indicates whether the system is connected and operating in online mode.

---

## 2. Module 1: Dashboard (`/`)

The **Dashboard** gives a high-level operational overview of the networking environment:
- **Quick Metric Cards**: Total analyzed packets, average latency, throughput, and active interfaces.
- **Simulated Traffic Telemetry**: Real-time throughput graph with protocol distribution (TCP, UDP, ICMP, DNS). *Note: The dashboard traffic is clearly labelled as simulated telemetry for instructional demonstration.*
- **Recent Experiments**: Quick-launch buttons to resume recent subnetting calculations, topology designs, or PCAP uploads.
- **System Health Card**: Instant overview of SQLite database connectivity and backend API status.

---

## 3. Module 2 & 3: Packet Analyzer (`/packets`)

The Packet Analyzer contains two specialized modes accessible via top tabs: **Live Packet Capture** and **PCAP File Analysis**.

### Mode A: Live Packet Capture (LIVE Data)
- **Select Interface**: Choose from your computer's physical or wireless interfaces (e.g., Wi-Fi, Ethernet, Loopback) discovered by Npcap/Scapy.
- **BPF Filtering**: Apply standard Berkeley Packet Filters before starting capture (e.g., `tcp port 80`, `udp`, `host 192.168.1.1`, `icmp`).
- **Start Capture**: Click **Start Capture**. Packets appear in real-time in the packet table via high-performance WebSocket streaming.
- **Stop Capture**: Click **Stop Capture** to terminate the live session and commit the captured packets into an inspectable capture file.
- *Requirement*: Windows requires [Npcap](https://npcap.com/) installed with "WinPcap API-compatible mode" enabled.

### Mode B: PCAP File Analysis (IMPORTED Data)
- **Upload Capture**: Drag and drop any `.pcap`, `.pcapng`, or `.cap` file (up to 10 MB / 50,000 packets).
- **Sample Files**: Click **Load Mixed Sample** or **Load VoIP Sample** to instantly explore pre-packaged network captures without uploading.
- **Packet Table**: Sort and filter packets by Index, Protocol, Length, Source IP, Destination IP, or Status (Handshake, Established, Reset, Closing).
- **Deep Packet Inspection Modal**: Click any packet row to open the complete protocol dissection modal:
  - **Summary**: IP addresses, MAC addresses, port numbers, flags, and payload length.
  - **Hex & ASCII Dump**: Byte-level inspection of raw frame contents.
  - **Layer Dissection**: Layer-by-layer breakdown (Ethernet II $\to$ IPv4/IPv6 $\to$ TCP/UDP $\to$ Application Payload).
- **Export Data**: Click **Export CSV** to download filtered packet logs for external spreadsheet analysis.

---

## 4. Module 4: Protocol Learning Lab (`/protocols`)

The Protocol Learning Lab provides interactive, step-by-step visual dissection of fundamental Internet protocols.

### Supported Protocols
1. **TCP (Transmission Control Protocol)**: 7-step sequence demonstrating 3-way handshake (`SYN` $\to$ `SYN-ACK` $\to$ `ACK`), `PSH/ACK` data transfer, and 4-way graceful teardown (`FIN` $\to$ `FIN-ACK` $\to$ `Final ACK`).
2. **UDP (User Datagram Protocol)**: 2-step stateless datagram transmission and reply with zero connection overhead.
3. **DNS (Domain Name System)**: 4-step recursive name resolution (Client $\to$ Local Resolver $\to$ Authoritative Server $\to$ Client).
4. **DHCP (Dynamic Host Configuration Protocol)**: 4-step DORA exchange (`Discover` $\to$ `Offer` $\to$ `Request` $\to$ `Acknowledge`).
5. **ARP (Address Resolution Protocol)**: 2-step broadcast request (`Who has 192.168.1.1?`) and unicast reply mapping IP to MAC.
6. **HTTP (Hypertext Transfer Protocol)**: 6-step interaction covering underlying TCP setup, `GET /index.html` request, `200 OK` server response with HTML body, and connection closure.
7. **ICMP (Internet Control Message Protocol)**: 4-step diagnostic exchange featuring standard Echo Request/Reply (Ping) and TTL=1 Traceroute packet expiration (`Time Exceeded`).

### Visualizer Views & Controls
- **Ladder Sequence View**:
  - **Fixed Lifelines**: Client is permanently anchored on the **LEFT**, Intermediate Hops in the **MIDDLE**, and Destination Server on the **RIGHT**. Lifelines do not swap when the server replies.
  - **Gliding Packet Capsule**: Hardware-accelerated animation shows the packet gliding across the screen in the physical direction of travel.
  - **Color Coded**: Outbound/Request packets glow cyan (`→`); Inbound/Response packets glow emerald (`←`).
- **Node Flow View**: Visualizes topology devices with active sender, receiver, and intermediary hop badges.
- **Playback Controls**:
  - `Next Step`: Advance one step and trigger packet flight.
  - `Previous`: Move back one step.
  - `Restart`: Rewind to Step 1.
  - `Auto-Play / Pause`: Automatically advance through steps at 2.8s intervals.
  - `Step Pills`: Jump directly to any step.

---

## 5. Module 5: Network Topology Simulator (`/topology`)

The Topology Simulator lets students build arbitrary network topologies, configure device attributes, and simulate packet routing.

### Key Capabilities
- **Device Management**: Add and position PCs, Routers, Switches, and Servers on an interactive SVG canvas.
- **Link Configuration**: Create bidirectional links between devices; configure link bandwidth, latency (ms), and packet loss percentage (%).
- **Dijkstra Shortest-Path Routing**: Select a source and destination device to compute the optimal low-latency route.
- **Link Failure Simulation**: Toggle any link state to `DOWN`. The simulator automatically re-evaluates connectivity and highlights alternate routes or identifies isolated network partitions.
- **Packet Journey Animation**: Click **Simulate Packet** to observe step-by-step forwarding along intermediate hops with cumulative latency metrics.
- **Save & Load**: Export topology configurations as JSON and restore them anytime.

---

## 6. Module 6: Bandwidth Monitor (`/bandwidth`)

The Bandwidth Monitor visualizes network throughput across three distinct operational sources:
1. **LIVE (Physical Interface Monitoring)**: Real-time telemetry sampled directly from host network adapters using `psutil`. Displays actual upload/download rates and packet counters.
2. **VIRTUAL (Simulated Traffic Experiments)**: Deterministic synthetic bandwidth generation testing high-throughput TCP windowing, bursty UDP streaming, and congestion curves.
3. **IMPORTED (PCAP File Analysis)**: Reconstructs exact bandwidth curves and throughput distributions from recorded `.pcap` files over time.

---

## 7. Module 7: Subnetting Calculator & VLSM Planner (`/subnetting`)

A complete IPv4 addressing and variable-length subnet masking (VLSM) toolkit:
- **IPv4 Address Analysis**: Enter any IPv4 address with CIDR prefix (e.g., `192.168.10.37/26`).
- **Calculated Parameters**:
  - Network Address, Broadcast Address
  - Subnet Mask & Wildcard Mask
  - First Usable Host & Last Usable Host
  - Total Addresses ($2^{32-\text{prefix}}$) and Usable Hosts ($2^{32-\text{prefix}} - 2$)
  - Address Classification (RFC 1918 Private vs Public, Class A/B/C/D/E)
  - Full 32-bit binary breakdown with color-coded network and host bit boundaries.
- **Subnet Splitting (VLSM)**: Split parent networks into smaller child subnets by specifying a target prefix (e.g., splitting a `/24` into four `/26` subnets).

### Robust Edge-Case Handling & Impossible Input Protection
NetLab rigorously validates all inputs and mathematically prevents impossible subnetting operations:
- **CIDR-in-IP Detection**: Typing CIDR notation into the IP box (e.g., `192.168.1.10/26`) automatically synchronizes the prefix slider to `/26` without producing a validation error.
- **Special Prefix Support**:
  - `/31` Point-to-Point Links (RFC 3021): Correctly allocates 2 usable host addresses without dedicated broadcast or network loss.
  - `/32` Host Routes: Identifies single-host routes and prevents impossible subdivision attempts.
  - `/0` Default Route: Correctly processes the entire 4,294,967,296 IPv4 address space.
- **Early Impossibility Detection in VLSM**:
  - **Single Requirement Overflow**: If a single subnet demands more addresses than the entire parent network (e.g., 300 hosts in a `/24`), NetLab detects this before allocation and explains the exact block size required and the maximum capacity of the parent network.
  - **Total Capacity Overflow**: If the sum of required subnet blocks exceeds the parent capacity (e.g., two 120-host subnets demanding 384 addresses in a 256-address `/24`), NetLab calculates the exact deficit (128 addresses) and recommends the minimum required parent prefix (`/23` with 512 addresses).
  - **Zero & Negative Host Rejection**: Disallows 0 or negative host counts, explaining that every subnet requires at least 1 host. Never silently mutates user-entered values.

---

## 8. Module 8: Error Detection & Correction Lab (`/errors`)

Hands-on lab demonstrating Layer 2 error detection algorithms:
- **Algorithms Supported**:
  1. **Parity Bit**: Even and Odd parity generator with single-bit error detection.
  2. **Internet Checksum (RFC 1071)**: 16-bit one's complement addition and verification.
  3. **Cyclic Redundancy Check (CRC)**: Polynomial binary division using standard generators (CRC-8, CRC-16, CRC-32, or custom polynomials).
  4. **Hamming Code (7,4)**: Error detection and single-bit error correction identifying the exact erroneous bit position.
- **Bit-Flipping & Noise Injection**:
  - Manually flip any transmitted bit or inject random noise.
  - Observe step-by-step verification and see whether the algorithm detects or corrects the corruption.

---

## 9. Module 9: Learning Center (`/learn`)

A structured, interactive curriculum designed to build theoretical foundations before practical lab work:
- **Topic Modules**:
  1. Network Fundamentals & OSI / TCP-IP Models
  2. IP Addressing, Subnetting & CIDR
  3. Transport Layer (TCP vs UDP)
  4. Application Protocols (DNS, DHCP, HTTP)
  5. Routing, Switching & ARP
  6. Data Link Error Detection
- **Direct Practical Lab Bridges**: Each lesson features quick-launch buttons linking directly to the corresponding interactive lab.
- **Lesson Knowledge Checks**: Quick formative questions at the end of each lesson to verify comprehension.

---

## 10. Module 10: Quizzes & Assessments (`/assessments`)

A rigorous evaluation system evaluating student networking competencies:
- **Assessment Modes**:
  - **Topic Tests**: Focused quizzes on specific domains (Subnetting, TCP/IP, Routing).
  - **Difficulty-Based**: Beginner, Intermediate, and Advanced diagnostic tests.
  - **Mixed Comprehensive**: Timed multi-topic exams simulating university midterms.
  - **Practical Lab Tests**: Hands-on questions requiring students to verify results in NetLab tools.
  - **Custom Test Generator**: Create practice exams tailored by question count, difficulty, and selected topics.
- **Question Formats**: Single-choice, multiple-choice, True/False, interactive matching, scenario-based, and numerical entry.
- **Instant Detailed Feedback**: Post-submission score breakdown, pass/fail status, question-by-question explanations, and tailored weak-topic recommendations.

---

## 11. Module 11 & 12: Research, History & Reports (`/reports`)

Track, review, and export all experimental activities:
- **Experiment Log**: Central repository storing inputs, results, and execution timestamps for Subnetting, PCAP, Error Detection, Bandwidth, and Topology experiments.
- **Assessment History**: Historical record of quiz attempts, percentage scores, and completion times.
- **Data Export**: Export logs as structured CSV files or download printable markdown/JSON summary reports.

---

## 12. Module 13: System Settings & Health (`/settings`)

- **Backend Connectivity Tester**: Verify REST API and WebSocket communication with the FastAPI server.
- **Environment Information**: Displays active database paths, Python/Node versions, and capture engine status.
- **Theme Preferences**: Toggle default theme, animations, and sound effects.
