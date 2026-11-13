# NetLab Complete API Contract (v1)

**Base URL**: `http://localhost:8000/api/v1`  
All request and response bodies use JSON format unless explicitly specified (such as multipart uploads or CSV streams). Interactive OpenAPI / Swagger documentation is available at `http://localhost:8000/docs`.

---

## 1. System & Health

### `GET /health`
Returns current system health status, software version, SQLite database status, and live capture capability.
- **Response (200 OK)**:
  ```json
  {
    "status": "ok",
    "version": "1.0.0",
    "database": "ok",
    "live_capture_enabled": true,
    "time": "2026-11-13T12:15:41.835559Z"
  }
  ```

---

## 2. Live Packet Capture (`/capture`)

### `GET /capture/interfaces`
Discovers and lists active network interfaces on the host machine.
- **Response (200 OK)**:
  ```json
  [
    {
      "name": "Wi-Fi",
      "description": "Intel(R) Wi-Fi 6 AX201 160MHz",
      "ip": "192.168.1.10",
      "mac": "00:11:22:33:44:55",
      "is_loopback": false,
      "is_up": true
    }
  ]
  ```

### `POST /capture/start`
Starts a real-time background packet sniffing session on the specified interface using Scapy.
- **Request Body**:
  ```json
  {
    "interface": "Wi-Fi",
    "bpf_filter": "tcp or udp",
    "packet_limit": 1000
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "session_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "interface": "Wi-Fi",
    "bpf_filter": "tcp or udp",
    "packet_limit": 1000,
    "status": "running",
    "started_at": "2026-11-13T12:00:00Z"
  }
  ```

### `POST /capture/stop`
Stops an active packet capture session and saves the captured packets into a permanent capture record.
- **Request Body**:
  ```json
  {
    "session_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "session_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "status": "stopped",
    "packet_count": 42,
    "capture_id": 15
  }
  ```

### `GET /capture/status/{session_id}`
Retrieves telemetry of an active or recent capture session (packet count, byte count, elapsed seconds).

### `WebSocket /capture/ws/{session_id}`
Real-time WebSocket endpoint that broadcasts parsed packet summaries (`PacketSummary`) as frames are captured by the sniffer thread.

---

## 3. PCAP File Analysis (`/packets`)

### `POST /packets/upload`
Uploads and parses a `.pcap`, `.pcapng`, or `.cap` capture file (`multipart/form-data`).
- **Response (201 Created)**: Returns capture summary metadata (`id`, `filename`, `packet_count`, `size_bytes`).

### `GET /packets/samples` & `POST /packets/samples/{name}/load`
Lists and imports synthetic pre-packaged sample captures (`sample_mixed.pcap`, `sample_voip.pcap`).

### `GET /packets/captures` & `GET /packets/captures/{id}`
Lists all capture records or retrieves a single capture's metadata.

### `GET /packets/captures/{id}/stats`
Returns aggregated protocol distribution, total bytes, duration, and top communicating IP endpoints.

### `GET /packets/captures/{id}/packets`
Paginated packet listing with filtering and sorting support:
- **Query Parameters**: `page`, `page_size`, `protocol`, `src_ip`, `dst_ip`, `status`, `search`, `sort`, `order`.
- **Response (200 OK)**:
  ```json
  {
    "items": [
      {
        "index": 1,
        "timestamp": 1700000000.052,
        "timestamp_iso": "2023-11-14T22:13:20.052Z",
        "src_ip": "192.168.1.10",
        "dst_ip": "203.0.113.10",
        "protocol": "TCP",
        "length": 54,
        "src_port": 49152,
        "dst_port": 80,
        "tcp_flags": ["SYN"],
        "status": "handshake",
        "info": "49152 → 80 [SYN]"
      }
    ],
    "total": 1,
    "page": 1,
    "page_size": 50,
    "pages": 1
  }
  ```

### `GET /packets/captures/{id}/packets/{index}`
Returns deep packet dissection: layer details (Ethernet, IPv4/IPv6, TCP/UDP/ICMP), header flags, TTL, and hexadecimal/ASCII payload dump.

### `GET /packets/captures/{id}/export.csv`
Streams the filtered packet list as a formatted CSV file (`text/csv`).

---

## 4. Protocol Learning Lab (`/protocols`)

### `GET /protocols`
Returns metadata and step counts for all 7 supported protocols: TCP, UDP, DNS, DHCP, ARP, HTTP, and ICMP.

### `GET /protocols/{name}`
Returns the full interactive educational simulation frame containing:
- `nodes`: Canonical list of devices (`client`, `router`, `server`, `destination`).
- `steps`: Step-by-step sequence of packet exchanges including `from`, `to`, `via`, `title`, `summary`, `explanation`, and structured `packet.fields`.

---

## 5. Network Topology Simulator (`/topology`)

### `POST /topology/simulate`
Stateless simulation executing path calculation, reachability, and hop-by-hop packet forwarding.
- **Request Body**:
  ```json
  {
    "nodes": [{"id": "a", "label": "Host A", "kind": "pc", "x": 100, "y": 100}],
    "links": [{"source": "a", "target": "b", "latency_ms": 5, "loss_pct": 0, "status": "up"}],
    "source": "a",
    "target": "b",
    "protocol": "ICMP",
    "size_bytes": 64
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "source": "a",
    "target": "b",
    "protocol": "ICMP",
    "delivered": true,
    "path": ["a", "r1", "b"],
    "hops": [
      {"hop": 1, "from": "a", "to": "r1", "latency_ms": 2, "cumulative_latency_ms": 2, "event": "forward"},
      {"hop": 2, "from": "r1", "to": "b", "latency_ms": 3, "cumulative_latency_ms": 5, "event": "deliver"}
    ],
    "total_latency_ms": 5,
    "delivery_probability": 1.0
  }
  ```

---

## 6. Bandwidth Monitor (`/bandwidth`)

### `GET /bandwidth/live`
Samples physical network adapter throughput and packet counts via `psutil`.

### `GET /bandwidth` (alias `/bandwidth/simulated`)
Generates synthetic throughput telemetry curves across time ranges (`5m`, `15m`, `1h`, `6h`, `24h`).

### `POST /bandwidth/analyze`
Bins discrete timestamped packet samples into time intervals and computes throughput (bps/Mbps).

### `GET /bandwidth/captures/{id}`
Calculates bandwidth throughput curves from a stored capture file.

---

## 7. Subnetting & VLSM (`/subnetting`)

### `POST /subnetting/calculate`
Calculates network address, broadcast, netmask, wildcard, host range, address counts, and 32-bit binary representations.
- **Request Body**: `{"ip": "192.168.10.37", "prefix": 26}`

### `POST /subnetting/vlsm`
Allocates variable-length subnets from a parent network using descending host order. Detects impossible combinations, single-requirement overflows, and total capacity exceeded conditions before any allocations occur.
- **Request Body**:
  ```json
  {
    "parent_cidr": "192.168.1.0/24",
    "requirements": [
      {"name": "Engineering LAN", "needed_hosts": 50},
      {"name": "Sales LAN", "needed_hosts": 25},
      {"name": "WAN Link", "needed_hosts": 2}
    ]
  }
  ```
- **Error Responses (422 Unprocessable Entity)**:
  - `insufficient_space`: Total addresses needed exceeds parent network capacity or single subnet requires larger block than parent. Includes exact addresses required, parent capacity, deficit, and suggested minimum prefix.
  - `invalid_cidr`: Parent CIDR missing prefix length or invalid format.
  - `invalid_host_requirement`: Host count is zero, negative, or exceeds IPv4 space.
  - `invalid_requirements`: Empty requirements list.

---

## 8. Error Detection Lab (`/error-detection`)

### `POST /error-detection/encode`
Encodes data bits using Parity, Checksum (RFC 1071), CRC, or Hamming (7,4). Supports bit-flipping noise simulation.
- **Request Body**:
  ```json
  {
    "data": "1101011011",
    "algorithm": "crc",
    "generator": "10011",
    "flip_positions": [3]
  }
  ```

### `POST /error-detection/verify`
Evaluates received bit sequences against the chosen algorithm, returning detection outcome and step-by-step mathematical division/verification details.

---

## 9. Quizzes & Assessments (`/assessments`)

### `GET /assessments` (alias `/assessments/tests`)
Lists all predefined tests with category, difficulty, duration, question count, and max marks.

### `GET /assessments/tests/{test_id}`
Retrieves sanitized assessment questions (`QuestionOut`). **Correct answers and explanations are omitted.**

### `POST /assessments/custom`
Generates a dynamic custom practice test based on topic selection, difficulty filter, and question count.

### `POST /assessments/submit`
Submits student answers, calculates percentage score, assigns pass/fail status, identifies weak topics, and persists the attempt into SQLite.
- **Response (200 OK)**:
  ```json
  {
    "attempt_id": 4,
    "test_id": "topic-subnetting",
    "test_title": "Subnetting & VLSM Quiz",
    "score": 10,
    "max_marks": 10,
    "percentage": 100.0,
    "passed": true,
    "time_taken_seconds": 124,
    "topic_breakdown": {"Subnetting & Addressing": {"score": 10, "max": 10, "percentage": 100.0}},
    "weak_topics": [],
    "reviews": [
      {
        "id": "sub_1",
        "user_answer": "62",
        "correct_answer": "62",
        "is_correct": true,
        "marks_awarded": 1,
        "explanation": "Formula: 2^(32 - 26) - 2 = 64 - 2 = 62 usable host addresses."
      }
    ]
  }
  ```

### `GET /assessments/attempts` & `GET /assessments/attempts/{attempt_id}`
Lists student attempt history and fetches complete question-by-question review of any past submission.

---

## 10. Experiment History & Reports (`/experiments`)

### `POST /experiments`
Saves experiment parameters, outputs, and metrics across any lab module.

### `GET /experiments` & `GET /experiments/{id}`
Queries and retrieves stored experiment logs with module filtering and search.

### `POST /experiments/compare`
Performs side-by-side metric comparison between 2 to 10 stored experiments.

### `GET /experiments/export.csv`
Exports experiment records as a downloadable CSV dataset.

### `GET /experiments/{id}/report`
Generates a formatted markdown or JSON laboratory research report.
