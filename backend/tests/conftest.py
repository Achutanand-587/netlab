import os

os.environ["DATABASE_URL"] = "sqlite://"  # in-memory DB for tests

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

import models  # noqa: E402,F401
from database import Base, engine  # noqa: E402
from main import app  # noqa: E402

API = "/api/v1"


@pytest.fixture()
def client():
    Base.metadata.drop_all(bind=engine)
    with TestClient(app) as c:  # runs lifespan -> init_db
        yield c


@pytest.fixture()
def pcap_bytes(tmp_path):
    from scapy.all import ICMP, IP, TCP, UDP, Ether, wrpcap
    pk = [Ether() / IP(src="10.0.0.1", dst="10.0.0.2") / TCP(sport=1234, dport=80, flags="S"),
          Ether() / IP(src="10.0.0.2", dst="10.0.0.1") / TCP(sport=80, dport=1234, flags="SA"),
          Ether() / IP(src="10.0.0.1", dst="10.0.0.3") / UDP(sport=5000, dport=5001),
          Ether() / IP(src="10.0.0.1", dst="10.0.0.3") / ICMP()]
    for i, p in enumerate(pk):
        p.time = 1_700_000_000 + i * 0.5
    f = tmp_path / "t.pcap"
    wrpcap(str(f), pk)
    return f.read_bytes()
