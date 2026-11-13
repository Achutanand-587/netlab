"""Generates sample_mixed.pcap (synthetic packets, not real traffic). Run: python sample_data/make_sample_pcap.py"""
import os

from scapy.all import ARP, DNS, DNSQR, DNSRR, ICMP, IP, TCP, UDP, Ether, Raw, wrpcap

C, S, D = "192.168.1.10", "203.0.113.10", "192.168.1.53"
pk, t = [], 1_700_000_000.0


def add(p):
    global t
    p.time = t
    t += 0.013
    pk.append(p)


mac_c, mac_r = "aa:bb:cc:00:00:10", "aa:bb:cc:00:00:01"
e = lambda: Ether(src=mac_c, dst=mac_r)  # noqa: E731
add(Ether(src=mac_c, dst="ff:ff:ff:ff:ff:ff") / ARP(op=1, hwsrc=mac_c, psrc=C, pdst="192.168.1.1"))
add(Ether(src=mac_r, dst=mac_c) / ARP(op=2, hwsrc=mac_r, psrc="192.168.1.1", hwdst=mac_c, pdst=C))
add(e() / IP(src=C, dst=D) / UDP(sport=53000, dport=53) / DNS(rd=1, qd=DNSQR(qname="example.com")))
add(Ether(src=mac_r, dst=mac_c) / IP(src=D, dst=C) / UDP(sport=53, dport=53000) / DNS(qr=1, qd=DNSQR(qname="example.com"), an=DNSRR(rrname="example.com", rdata=S)))
add(e() / IP(src=C, dst=S) / TCP(sport=49152, dport=80, flags="S", seq=1000))
add(Ether(src=mac_r, dst=mac_c) / IP(src=S, dst=C) / TCP(sport=80, dport=49152, flags="SA", seq=5000, ack=1001))
add(e() / IP(src=C, dst=S) / TCP(sport=49152, dport=80, flags="A", seq=1001, ack=5001))
add(e() / IP(src=C, dst=S) / TCP(sport=49152, dport=80, flags="PA", seq=1001, ack=5001) / Raw(b"GET / HTTP/1.1\r\nHost: example.com\r\n\r\n"))
add(Ether(src=mac_r, dst=mac_c) / IP(src=S, dst=C) / TCP(sport=80, dport=49152, flags="PA", seq=5001, ack=1042) / Raw(b"HTTP/1.1 200 OK\r\nContent-Length: 0\r\n\r\n"))
add(e() / IP(src=C, dst=S) / TCP(sport=49152, dport=80, flags="FA", seq=1042, ack=5040))
add(Ether(src=mac_r, dst=mac_c) / IP(src=S, dst=C) / TCP(sport=80, dport=49152, flags="R", seq=5040))
add(e() / IP(src=C, dst=S) / ICMP(type=8, id=1, seq=1) / Raw(b"abcdefgh"))
add(Ether(src=mac_r, dst=mac_c) / IP(src=S, dst=C) / ICMP(type=0, id=1, seq=1) / Raw(b"abcdefgh"))
add(e() / IP(src=C, dst=S) / UDP(sport=50000, dport=5005) / Raw(b"hello-udp"))
wrpcap(os.path.join(os.path.dirname(os.path.abspath(__file__)), "sample_mixed.pcap"), pk)
print(f"wrote {len(pk)} packets")
