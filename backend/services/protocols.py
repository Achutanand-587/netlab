from errors import AppError

NODES = {
    "client": {"id": "client", "label": "Client Host", "kind": "pc", "ip": "192.168.1.10"},
    "router": {"id": "router", "label": "Default Gateway", "kind": "router", "ip": "192.168.1.1"},
    "server": {"id": "server", "label": "Local DNS / DHCP Server", "kind": "server", "ip": "192.168.1.53"},
    "destination": {"id": "destination", "label": "Remote Web Server", "kind": "server", "ip": "203.0.113.10"},
}
ALIASES = {"tcp-handshake": "tcp", "handshake": "tcp"}


def _s(frm: str, to: str, title: str, proto: str, why: str, via: list[str] | None = None, **fields) -> dict:
    return {
        "from": frm,
        "to": to,
        "via": via if via is not None else ["router"],
        "title": title,
        "protocol": proto,
        "summary": title,
        "explanation": why,
        "packet": {"src_ip": NODES[frm]["ip"], "dst_ip": NODES[to]["ip"], "fields": fields},
    }


def _fix_dhcp(steps: list[dict]) -> list[dict]:
    steps[0]["packet"].update(src_ip="0.0.0.0", dst_ip="255.255.255.255")
    steps[2]["packet"].update(src_ip="0.0.0.0", dst_ip="255.255.255.255")
    return steps


def _sim(name: str, title: str, nodes: list[str], steps: list[dict], desc: str, **meta) -> dict:
    for i, s in enumerate(steps, 1):
        s["index"] = i
    return {
        "name": name,
        "title": title,
        "description": desc,
        "educational": True,
        "nodes": [NODES[n] for n in nodes],
        "steps": steps,
        **meta,
    }


C, R, S, D = "client", "router", "server", "destination"
SIMS = {
    "tcp": _sim(
        "tcp",
        "TCP three-way handshake and teardown",
        [C, R, D],
        [
            _s(C, D, "SYN", "TCP", "The client initiates connection establishment by sending a SYN packet and proposing its Initial Sequence Number (ISN = 1000).", flags="SYN", seq=1000, src_port=49152, dst_port=80, window=64240),
            _s(D, C, "SYN-ACK", "TCP", "The server agrees, acknowledges the client's sequence number (ack = 1001), and proposes its own sequence number (ISN = 5000).", flags="SYN,ACK", seq=5000, ack=1001, src_port=80, dst_port=49152, window=65535),
            _s(C, D, "ACK", "TCP", "The client acknowledges the server's sequence number (ack = 5001). The connection is now ESTABLISHED.", flags="ACK", seq=1001, ack=5001, src_port=49152, dst_port=80, window=64240),
            _s(C, D, "Data (PSH, ACK)", "TCP", "The client transmits 5 bytes of application data with the PUSH flag set to prompt immediate delivery to the application.", flags="PSH,ACK", seq=1001, ack=5001, src_port=49152, dst_port=80, payload_bytes=5),
            _s(C, D, "FIN", "TCP", "The client has finished transmitting data and initiates a graceful connection teardown by sending a FIN packet.", flags="FIN,ACK", seq=1006, ack=5001, src_port=49152, dst_port=80),
            _s(D, C, "FIN-ACK", "TCP", "The server acknowledges the client's close request (ack = 1007) and simultaneously closes its own transmission direction with FIN.", flags="FIN,ACK", seq=5001, ack=1007, src_port=80, dst_port=49152),
            _s(C, D, "Final ACK", "TCP", "The client acknowledges the server's FIN (ack = 5002). The connection enters TIME-WAIT and is cleanly CLOSED.", flags="ACK", seq=1007, ack=5002, src_port=49152, dst_port=80),
        ],
        "Reliable, connection-oriented delivery using sequence numbers and acknowledgements.",
        full_name="Transmission Control Protocol",
        layer="Transport Layer (L4)",
        transport="IP (Protocol 6)",
        port="Application-dependent (e.g. 80, 443, 22)",
        purpose="Reliable, ordered, and error-checked delivery of a stream of octets between internet hosts.",
        difficulty="Beginner",
        real_world_example="Loading web pages (HTTP/HTTPS), sending emails (SMTP), and remote server terminal management (SSH).",
        sample_pcap_filter="TCP",
        key_observations=[
            "Connection establishment requires exactly three packets (SYN -> SYN-ACK -> ACK) before user payload can flow.",
            "Control flags (SYN and FIN) consume exactly 1 sequence number space to ensure reliable delivery.",
            "Connection teardown is symmetrical: both sides independently send FIN and receive an ACK.",
        ],
    ),
    "udp": _sim(
        "udp",
        "UDP datagram exchange",
        [C, R, D],
        [
            _s(C, D, "Datagram", "UDP", "The client sends a 20-byte UDP datagram immediately without establishing a connection. No handshake is performed.", src_port=50000, dst_port=5005, length=28, payload_bytes=20, checksum="0x1a2b"),
            _s(D, C, "Reply datagram", "UDP", "The destination application replies with a datagram. The UDP transport layer does not track or retransmit lost packets.", src_port=5005, dst_port=50000, length=28, checksum="0x3c4d"),
        ],
        "Connectionless, low-overhead delivery.",
        full_name="User Datagram Protocol",
        layer="Transport Layer (L4)",
        transport="IP (Protocol 17)",
        port="Application-dependent (e.g. 53, 67, 123, 5005)",
        purpose="Simple, low-latency transmission model with a minimum of protocol mechanism and zero handshake overhead.",
        difficulty="Beginner",
        real_world_example="Real-time multi-player video games, live voice/video calls (VoIP, Zoom), and DNS queries.",
        sample_pcap_filter="UDP",
        key_observations=[
            "UDP has no connection state, handshake, sequence numbers, or windowing.",
            "The UDP header is fixed at only 8 bytes: Source Port, Destination Port, Length, and Checksum.",
            "Packets can arrive out of order, be duplicated, or be dropped without notice by the transport layer.",
        ],
    ),
    "dns": _sim(
        "dns",
        "DNS lookup through a resolver",
        [C, R, S, D],
        [
            _s(C, S, "Query A example.com", "DNS", "The client asks its local recursive resolver for the IPv4 address (A record) of 'example.com'.", qtype="A", qname="example.com", dst_port=53, txid="0x0001", flags="0x0100 (Standard query)"),
            _s(S, D, "Recursive query", "DNS", "The resolver has no cached answer, so it queries the authoritative nameserver across the WAN.", via=[], qtype="A", qname="example.com", txid="0x0002"),
            _s(D, S, "Authoritative answer", "DNS", "The authoritative nameserver returns the resolved IPv4 address (203.0.113.10) with a TTL of 300 seconds.", via=[], answer="203.0.113.10", ttl=300, txid="0x0002"),
            _s(S, C, "Response", "DNS", "The local resolver caches the mapping and returns the final resolved IP address to the client.", answer="203.0.113.10", ttl=300, txid="0x0001", flags="0x8180 (Standard query response)"),
        ],
        "Name resolution over UDP port 53.",
        full_name="Domain Name System",
        layer="Application Layer (L7)",
        transport="UDP / TCP (Port 53)",
        port="53",
        purpose="Translates human-friendly hostnames (e.g. google.com) into machine-routable numerical IP addresses.",
        difficulty="Intermediate",
        real_world_example="Typing 'wikipedia.org' into your browser address bar; DNS resolves it before opening a TCP connection.",
        sample_pcap_filter="DNS",
        key_observations=[
            "Queries typically run over UDP port 53 for speed and minimal resource usage.",
            "Each query includes a 16-bit Transaction ID (TxID) to match replies with pending requests.",
            "Answers include a Time-To-Live (TTL) field so clients and resolvers can cache records locally.",
        ],
    ),
    "dhcp": _sim(
        "dhcp",
        "DHCP DORA exchange",
        [C, R, S],
        _fix_dhcp([
            _s(C, S, "Discover", "DHCP", "A newly connected client without an IP address broadcasts (0.0.0.0 -> 255.255.255.255, UDP 68 -> 67) to locate available DHCP servers.", via=[], ports="68->67", xid="0x39a1b2c3", message_type="DHCPDISCOVER"),
            _s(S, C, "Offer", "DHCP", "The DHCP server reserves an unassigned address (192.168.1.10) and broadcasts a lease offer with netmask and gateway details.", via=[], offered_ip="192.168.1.10", lease_s=86400, netmask="255.255.255.0", gateway="192.168.1.1", message_type="DHCPOFFER"),
            _s(C, S, "Request", "DHCP", "The client formally requests the offered address by broadcasting a DHCPREQUEST, signaling all other potential DHCP servers to release their offers.", via=[], requested_ip="192.168.1.10", message_type="DHCPREQUEST"),
            _s(S, C, "Acknowledge", "DHCP", "The DHCP server commits the IP address lease and acknowledges (DHCPACK). The client can now configure its network interface.", via=[], lease_s=86400, message_type="DHCPACK"),
        ]),
        "Automatic IP configuration.",
        full_name="Dynamic Host Configuration Protocol",
        layer="Application Layer (L7)",
        transport="UDP (Server: 67, Client: 68)",
        port="67 (Server) / 68 (Client)",
        purpose="Automates the assignment of IP addresses, subnet masks, default gateways, and DNS servers to network devices.",
        difficulty="Intermediate",
        real_world_example="Connecting your smartphone or laptop to home or campus Wi-Fi and automatically receiving an IP configuration.",
        sample_pcap_filter="UDP",
        key_observations=[
            "Follows the four-step DORA pattern: Discover, Offer, Request, Acknowledge.",
            "Operates via Layer 2/3 broadcasts because the client does not yet possess a valid unicast IP address.",
            "Addresses are leased for a finite duration (e.g. 86400s = 24 hours), after which they must be renewed.",
        ],
    ),
    "arp": _sim(
        "arp",
        "ARP address resolution",
        [C, R],
        [
            _s(C, R, "Who has 192.168.1.1?", "ARP", "The client needs to send an IP packet to its gateway (192.168.1.1). It broadcasts an ARP request to learn the router's physical MAC address.", via=[], op="request (1)", target_ip="192.168.1.1", target_mac="ff:ff:ff:ff:ff:ff (Broadcast)", sender_ip="192.168.1.10", sender_mac="aa:bb:cc:00:00:10"),
            _s(R, C, "192.168.1.1 is at aa:bb:cc:00:00:01", "ARP", "The gateway recognizes its own IP address and returns a direct unicast ARP reply containing its physical MAC address.", via=[], op="reply (2)", sender_ip="192.168.1.1", sender_mac="aa:bb:cc:00:00:01", target_ip="192.168.1.10", target_mac="aa:bb:cc:00:00:10"),
        ],
        "Maps IPv4 addresses to MAC addresses on a local network.",
        full_name="Address Resolution Protocol",
        layer="Data Link / Network Layer (L2/L3)",
        transport="Direct Ethernet Frame (EtherType 0x0806)",
        port="N/A (Layer 2)",
        purpose="Resolves a known 32-bit IPv4 address into a 48-bit physical MAC address on a local Ethernet/Wi-Fi segment.",
        difficulty="Beginner",
        real_world_example="Your PC wanting to communicate with another computer or router on the same local subnet.",
        sample_pcap_filter="ARP",
        key_observations=[
            "The ARP request is sent to the broadcast MAC (FF:FF:FF:FF:FF:FF) so all local network cards examine it.",
            "Only the host owning the requested IP generates an ARP reply, sent directly as a unicast frame.",
            "Operating systems store resolved bindings in a local ARP table ('arp -a' in command prompt) to avoid redundant broadcasts.",
        ],
    ),
    "http": _sim(
        "http",
        "HTTP GET over TCP",
        [C, R, D],
        [
            _s(C, D, "TCP SYN", "TCP", "HTTP requires an underlying reliable transport, so the client initiates a standard TCP three-way handshake.", flags="SYN", seq=1000, src_port=52341, dst_port=80),
            _s(D, C, "TCP SYN-ACK", "TCP", "The web server accepts the connection request and returns SYN-ACK.", flags="SYN,ACK", seq=3000, ack=1001, src_port=80, dst_port=52341),
            _s(C, D, "TCP ACK", "TCP", "The client acknowledges the server's sequence number. The TCP connection is now established.", flags="ACK", seq=1001, ack=3001, src_port=52341, dst_port=80),
            _s(C, D, "GET /index.html", "HTTP", "The client sends an HTTP GET request asking for the '/index.html' web resource.", method="GET", path="/index.html", version="HTTP/1.1", host="example.com", user_agent="NetLab/1.0"),
            _s(D, C, "200 OK", "HTTP", "The web server processes the request and responds with status '200 OK', delivering the HTML content.", status=200, status_text="OK", content_type="text/html", content_length=1256, server="Apache/2.4"),
            _s(C, D, "TCP FIN", "TCP", "The web resource transfer is complete, and the client closes the TCP connection with FIN.", flags="FIN,ACK", seq=1050, ack=4257, src_port=52341, dst_port=80),
        ],
        "Request/response application protocol.",
        full_name="Hypertext Transfer Protocol",
        layer="Application Layer (L7)",
        transport="TCP (Port 80)",
        port="80",
        purpose="Stateless, application-level request/response protocol for distributed collaborative hypermedia information systems.",
        difficulty="Beginner",
        real_world_example="Fetching a web page, downloading images, or communicating with RESTful APIs.",
        sample_pcap_filter="TCP",
        key_observations=[
            "HTTP is fundamentally stateless: each request/response transaction executes independently.",
            "Runs directly over TCP; data exchange cannot begin until the TCP 3-way handshake completes.",
            "Responses carry explicit numerical status codes (e.g. 200 OK, 301 Redirect, 404 Not Found, 500 Error).",
        ],
    ),
    "icmp": _sim(
        "icmp",
        "ICMP echo and TTL exceeded",
        [C, R, D],
        [
            _s(C, D, "Echo request", "ICMP", "The client sends an ICMP Echo Request (Type 8, Code 0) to test whether the destination host is reachable.", type="8 (Echo Request)", code=0, ttl=64, id=1, seq=1),
            _s(D, C, "Echo reply", "ICMP", "The destination host receives the request and immediately replies with an ICMP Echo Reply (Type 0, Code 0).", type="0 (Echo Reply)", code=0, ttl=54, id=1, seq=1),
            _s(C, R, "Echo request, TTL=1", "ICMP", "The client sends an Echo Request with Time-To-Live = 1. The packet will expire at the very first router hop (Traceroute mechanism).", via=[], type="8 (Echo Request)", code=0, ttl=1, id=2, seq=2),
            _s(R, C, "Time exceeded", "ICMP", "The intermediate gateway router discards the expired packet and sends an ICMP Time Exceeded (Type 11) notification to the client.", via=[], type="11 (Time Exceeded)", code="0 (TTL expired in transit)", id=2),
        ],
        "Diagnostics and error reporting.",
        full_name="Internet Control Message Protocol",
        layer="Network Layer (L3)",
        transport="IP (Protocol 1)",
        port="N/A (Uses Type and Code values)",
        purpose="Used by network devices to send error messages and operational information regarding network connectivity.",
        difficulty="Beginner",
        real_world_example="Running 'ping 8.8.8.8' to test connectivity, or 'tracert' to find all intermediate routing hops.",
        sample_pcap_filter="ICMP",
        key_observations=[
            "ICMP packets do not use transport ports (TCP/UDP); they are encapsulated directly inside IP packets (Protocol 1).",
            "Type 8 / Code 0 is Ping Request; Type 0 / Code 0 is Ping Reply.",
            "Type 11 (Time Exceeded) is returned when an IP packet's TTL counter drops to 0, which powers Traceroute.",
        ],
    ),
}


def list_protocols() -> list[dict]:
    return [
        {
            "name": s["name"],
            "title": s["title"],
            "description": s["description"],
            "step_count": len(s["steps"]),
            "full_name": s.get("full_name", s["title"]),
            "layer": s.get("layer", "Layer 4"),
            "transport": s.get("transport", "N/A"),
            "port": s.get("port", "N/A"),
            "purpose": s.get("purpose", s["description"]),
            "difficulty": s.get("difficulty", "Beginner"),
            "real_world_example": s.get("real_world_example", ""),
            "sample_pcap_filter": s.get("sample_pcap_filter", s["name"]),
        }
        for s in SIMS.values()
    ]


def get(name: str) -> dict:
    key = ALIASES.get(name.lower(), name.lower())
    if key not in SIMS:
        raise AppError(404, "protocol_not_found", f"Unknown protocol '{name}'. Available: {', '.join(SIMS)}.")
    return SIMS[key]
