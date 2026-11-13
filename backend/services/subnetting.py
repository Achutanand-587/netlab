import ipaddress
import math
from itertools import islice

from errors import AppError


def _usable(prefix: int, total: int) -> int:
    return 1 if prefix == 32 else 2 if prefix == 31 else max(0, total - 2)


def _bin(addr: ipaddress.IPv4Address) -> str:
    return ".".join(f"{o:08b}" for o in addr.packed)


def _get_class(first_octet: int) -> str:
    if 1 <= first_octet <= 126:
        return "Class A"
    elif 128 <= first_octet <= 191:
        return "Class B"
    elif 192 <= first_octet <= 223:
        return "Class C"
    elif 224 <= first_octet <= 239:
        return "Class D (Multicast)"
    elif 240 <= first_octet <= 255:
        return "Class E (Experimental)"
    elif first_octet == 127:
        return "Loopback (127/8)"
    elif first_octet == 0:
        return "Default Network (0.0.0.0/8)"
    return "Special / Reserved"


def _get_ip_type(addr: ipaddress.IPv4Address) -> str:
    if addr.is_loopback:
        return "Loopback"
    if addr.is_private:
        return "Private (RFC 1918)"
    if addr.is_link_local:
        return "Link-Local (APIPA)"
    if addr.is_multicast:
        return "Multicast"
    if addr.is_reserved:
        return "Reserved"
    return "Public"


def _row(net: ipaddress.IPv4Network) -> dict:
    p, first, last = net.prefixlen, net.network_address, net.broadcast_address
    if p <= 30:
        first, last = net.network_address + 1, net.broadcast_address - 1
    elif p == 31:
        first, last = net.network_address, net.broadcast_address
    return {
        "cidr": str(net),
        "network": str(net.network_address),
        "first_host": str(first),
        "last_host": str(last),
        "broadcast": str(net.broadcast_address),
        "usable_hosts": _usable(p, net.num_addresses),
    }


def calculate(ip: str, prefix: int) -> dict:
    clean_ip = ip.strip()
    if "/" in clean_ip:
        parts = clean_ip.split("/", 1)
        clean_ip = parts[0].strip()
        try:
            parsed_prefix = int(parts[1].strip())
            if 0 <= parsed_prefix <= 32:
                prefix = parsed_prefix
        except ValueError:
            pass

    if not (0 <= prefix <= 32):
        raise AppError(422, "invalid_prefix", f"CIDR prefix must be between 0 and 32, got {prefix}.")

    try:
        addr = ipaddress.IPv4Address(clean_ip)
    except ValueError as e:
        raise AppError(422, "invalid_ip", f"'{ip}' is not a valid IPv4 address: {e}")

    net = ipaddress.IPv4Network(f"{clean_ip}/{prefix}", strict=False)
    row = _row(net)
    first_octet = int(str(addr).split(".")[0])
    return {
        "ip": str(addr),
        "prefix": prefix,
        "cidr": row["cidr"],
        "network": row["network"],
        "subnet_mask": str(net.netmask),
        "wildcard_mask": str(net.hostmask),
        "broadcast": row["broadcast"],
        "has_broadcast": prefix <= 30,
        "first_host": row["first_host"],
        "last_host": row["last_host"],
        "total_addresses": net.num_addresses,
        "usable_hosts": row["usable_hosts"],
        "is_private": addr.is_private,
        "network_class": _get_class(first_octet),
        "ip_type": _get_ip_type(addr),
        "binary": {
            "address": _bin(addr),
            "mask": _bin(net.netmask),
            "network": _bin(net.network_address),
        },
    }


def split(ip: str, prefix: int, new_prefix: int, limit: int = 256) -> dict:
    clean_ip = ip.strip()
    if "/" in clean_ip:
        clean_ip = clean_ip.split("/", 1)[0].strip()

    if prefix >= 32:
        raise AppError(
            422,
            "impossible_split",
            f"A /{prefix} network contains only 1 host address and has no remaining host bits to divide into smaller subnets."
        )

    if not (0 <= prefix <= 32):
        raise AppError(422, "invalid_prefix", f"Parent prefix must be between 0 and 32, got {prefix}.")
    if not (0 <= new_prefix <= 32):
        raise AppError(422, "invalid_prefix", f"New subnet prefix must be between 0 and 32, got {new_prefix}.")

    if new_prefix <= prefix:
        raise AppError(
            422,
            "invalid_prefix",
            f"New subnet prefix (/{new_prefix}) must be strictly greater than parent prefix (/{prefix}) to create smaller subnets. Borrowing 0 or negative bits is not possible."
        )

    try:
        net = ipaddress.IPv4Network(f"{clean_ip}/{prefix}", strict=False)
    except ValueError as e:
        raise AppError(422, "invalid_ip", f"Invalid parent IP/network '{ip}': {e}")

    bits_borrowed = new_prefix - prefix
    count = 2 ** bits_borrowed
    subnets = [_row(s) for s in islice(net.subnets(new_prefix=new_prefix), limit)]
    return {
        "parent_cidr": str(net),
        "new_prefix": new_prefix,
        "subnet_count": count,
        "returned": len(subnets),
        "truncated": count > len(subnets),
        "subnets": subnets,
    }


def vlsm(parent_cidr: str, requirements: list[dict]) -> dict:
    """Allocates variable-length subnets from a parent network using descending host order.
    
    Detects impossible combinations, single-requirement overflows, and total capacity
    exceeded conditions before any allocations occur, providing clear and actionable explanations.
    """
    clean_cidr = parent_cidr.strip()
    if "/" not in clean_cidr:
        raise AppError(
            422,
            "invalid_cidr",
            f"Parent network '{parent_cidr}' is missing a CIDR prefix length. Please specify a valid CIDR network such as '{parent_cidr}/24'."
        )

    try:
        parent_net = ipaddress.IPv4Network(clean_cidr, strict=False)
    except ValueError as e:
        raise AppError(422, "invalid_cidr", f"Invalid parent CIDR '{parent_cidr}': {e}")

    if parent_net.prefixlen >= 31:
        raise AppError(
            422,
            "insufficient_space",
            f"Parent network {parent_cidr} (/{parent_net.prefixlen}) contains only {parent_net.num_addresses} address(es) and cannot be subdivided for VLSM subnetting."
        )

    if not requirements:
        raise AppError(422, "invalid_requirements", "At least one subnet requirement is required for VLSM allocation.")

    # Validate individual requirements
    total_requested_hosts = 0
    calculated_blocks = []

    for req in requirements:
        name = str(req.get("name", "")).strip() or "Unnamed Subnet"
        needed = req.get("needed_hosts")

        if needed is None or needed <= 0:
            raise AppError(
                422,
                "invalid_host_requirement",
                f"Subnet '{name}' requests an invalid host count ({needed}). Every subnet must require at least 1 usable host address."
            )

        if needed > 2147483646:
            raise AppError(
                422,
                "invalid_host_requirement",
                f"Subnet '{name}' requests {needed:,} hosts, exceeding maximum IPv4 address space."
            )

        total_requested_hosts += needed

        # Calculate required prefix and block size
        # If needed == 1, RFC 3021 /31 uses 2 addresses.
        # For standard subnets (needed >= 2), 2^h - 2 >= needed => 2^h >= needed + 2
        if needed == 1:
            h = 1
        else:
            h = max(2, math.ceil(math.log2(needed + 2)))
        needed_prefix = 32 - h
        block_size = 2 ** h

        calculated_blocks.append({
            "name": name,
            "needed_hosts": needed,
            "needed_prefix": needed_prefix,
            "block_size": block_size,
        })

    # Check 1: Single requirement exceeds entire parent network
    parent_capacity = parent_net.num_addresses
    max_usable_in_parent = _usable(parent_net.prefixlen, parent_capacity)

    for item in calculated_blocks:
        if item["needed_prefix"] < parent_net.prefixlen:
            raise AppError(
                422,
                "insufficient_space",
                f"Requirement '{item['name']}' requests {item['needed_hosts']} hosts, requiring a /{item['needed_prefix']} subnet ({item['block_size']} total addresses). "
                f"This single subnet is larger than the entire parent network {parent_cidr} ({parent_capacity} addresses, max {max_usable_in_parent} usable hosts). "
                f"Please expand the parent network to at least a /{item['needed_prefix']} or reduce '{item['name']}' to {max_usable_in_parent} hosts or fewer."
            )

    # Check 2: Sum of required block sizes exceeds parent network capacity
    total_addresses_needed = sum(item["block_size"] for item in calculated_blocks)
    if total_addresses_needed > parent_capacity:
        deficit = total_addresses_needed - parent_capacity
        min_prefix_needed = 32 - math.ceil(math.log2(total_addresses_needed))
        min_capacity = 2 ** (32 - min_prefix_needed)

        block_breakdown = ", ".join(
            f"'{item['name']}' requires a /{item['needed_prefix']} block ({item['block_size']} addresses for {item['needed_hosts']} hosts)"
            for item in calculated_blocks
        )

        # Calculate mathematically sound recommendations based on power-of-2 block thresholds
        viable_reductions = []
        for item in calculated_blocks:
            current_b = item["block_size"]
            if current_b >= 4:
                smaller_b = current_b // 2
                smaller_max_usable = 2 if smaller_b == 2 else smaller_b - 2
                smaller_prefix = 32 - int(math.log2(smaller_b))
                new_total = total_addresses_needed - (current_b - smaller_b)
                if new_total <= parent_capacity:
                    host_diff = item["needed_hosts"] - smaller_max_usable
                    viable_reductions.append(
                        f"reduce '{item['name']}' from {item['needed_hosts']} to {smaller_max_usable} hosts (saving {host_diff} host requirements) so it fits into a /{smaller_prefix} block ({smaller_b} addresses, bringing total allocated addresses to {new_total})"
                    )

        if viable_reductions:
            rec_detail = " or ".join(viable_reductions)
        else:
            rec_detail = f"reduce host requirements across subnets so their allocated power-of-2 blocks sum to at most {parent_capacity} addresses"

        raise AppError(
            422,
            "insufficient_space",
            f"Total address space required across all {len(requirements)} subnets is {total_addresses_needed} addresses, "
            f"which exceeds parent network {parent_cidr} capacity ({parent_capacity} addresses) by {deficit} addresses. "
            f"Subnet allocations require power-of-2 block sizes: {block_breakdown}. "
            f"To resolve: (1) Expand parent network to at least /{min_prefix_needed} ({min_capacity} addresses), or (2) {rec_detail}."
        )

    # Sort requirements descending by required hosts (standard VLSM rule)
    sorted_reqs = sorted(calculated_blocks, key=lambda r: r["needed_hosts"], reverse=True)

    pool: list[ipaddress.IPv4Network] = [parent_net]
    allocated = []

    for req in sorted_reqs:
        needed = req["needed_hosts"]
        name = req["name"]
        needed_prefix = req["needed_prefix"]

        # Find the best fitting block in the pool
        pool.sort(key=lambda n: (n.prefixlen, n.network_address), reverse=True)
        chosen_idx = -1
        for idx, block in enumerate(pool):
            if block.prefixlen <= needed_prefix:
                chosen_idx = idx
                break

        if chosen_idx == -1:
            raise AppError(
                422,
                "insufficient_space",
                f"Cannot allocate {needed} hosts for '{name}': insufficient contiguous address space remaining in parent network {parent_cidr} due to block fragmentation."
            )

        block = pool.pop(chosen_idx)

        # Split block down to needed_prefix
        while block.prefixlen < needed_prefix:
            sub1, sub2 = list(block.subnets(prefixlen_diff=1))
            block = sub1
            pool.append(sub2)

        # Allocate block
        row = _row(block)
        allocated.append({
            "name": name,
            "needed_hosts": needed,
            "allocated_hosts": row["usable_hosts"],
            "prefix": block.prefixlen,
            "cidr": str(block),
            "network": row["network"],
            "first_host": row["first_host"],
            "last_host": row["last_host"],
            "broadcast": row["broadcast"],
            "subnet_mask": str(block.netmask),
        })

    # Sort unallocated remaining blocks
    pool.sort(key=lambda n: n.network_address)
    remaining_addresses = sum(b.num_addresses for b in pool)

    return {
        "parent_cidr": str(parent_net),
        "total_parent_addresses": parent_net.num_addresses,
        "allocated": allocated,
        "unallocated": [str(b) for b in pool],
        "remaining_addresses": remaining_addresses,
    }
