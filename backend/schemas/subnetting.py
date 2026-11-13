import ipaddress
from pydantic import BaseModel, Field, field_validator


class SubnetRequest(BaseModel):
    ip: str = Field(examples=["192.168.10.37"])
    prefix: int = Field(ge=0, le=32, examples=[24])

    @field_validator("ip")
    @classmethod
    def _ip(cls, v: str) -> str:
        s = v.strip()
        if "/" in s:
            s = s.split("/")[0].strip()
        try:
            return str(ipaddress.IPv4Address(s))
        except ValueError:
            raise ValueError("must be a valid IPv4 address like 192.168.1.10")


class SplitRequest(SubnetRequest):
    new_prefix: int = Field(ge=1, le=32)
    limit: int = Field(default=256, ge=1, le=1024)


class BinaryRepr(BaseModel):
    address: str
    mask: str
    network: str


class SubnetResult(BaseModel):
    ip: str
    prefix: int
    cidr: str
    network: str
    subnet_mask: str
    wildcard_mask: str
    broadcast: str
    has_broadcast: bool
    first_host: str
    last_host: str
    total_addresses: int
    usable_hosts: int
    is_private: bool
    binary: BinaryRepr
    network_class: str = "C"
    ip_type: str = "Private"


class SubnetRow(BaseModel):
    cidr: str
    network: str
    first_host: str
    last_host: str
    broadcast: str
    usable_hosts: int


class SplitResult(BaseModel):
    parent_cidr: str
    new_prefix: int
    subnet_count: int
    returned: int
    truncated: bool
    subnets: list[SubnetRow]


class VlsmRequirement(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    needed_hosts: int = Field(ge=1, le=16777214)


class VlsmRequest(BaseModel):
    parent_cidr: str = Field(examples=["192.168.1.0/24"])
    requirements: list[VlsmRequirement] = Field(min_length=1, max_length=64)


class VlsmAllocatedSubnet(BaseModel):
    name: str
    needed_hosts: int
    allocated_hosts: int
    prefix: int
    cidr: str
    network: str
    first_host: str
    last_host: str
    broadcast: str
    subnet_mask: str


class VlsmResult(BaseModel):
    parent_cidr: str
    total_parent_addresses: int
    allocated: list[VlsmAllocatedSubnet]
    unallocated: list[str]
    remaining_addresses: int
