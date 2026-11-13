import random
from errors import AppError
from schemas.error_detection import EncodeRequest, VerifyRequest

MAX_STEPS = 64

CRC_PRESETS = {
    "crc-8": "100000111",                                      # x^8 + x^2 + x + 1 (ATM HEC)
    "crc-16": "11000000000000101",                             # x^16 + x^15 + x^2 + 1 (CRC-16-IBM)
    "crc-32": "100000100110000010001110110110111",            # IEEE 802.3 Ethernet standard
}


def _norm(algorithm: str, parity_type: str) -> tuple[str, str]:
    if algorithm == "parity-even":
        return "parity", "even"
    if algorithm == "parity-odd":
        return "parity", "odd"
    return algorithm, parity_type


def _ones(bits: str) -> int:
    return bits.count("1")


def _fold(total: int) -> int:
    while total >> 16:
        total = (total & 0xFFFF) + (total >> 16)
    return total


def _crc_div(bits: str, gen: str, steps: list[dict]) -> str:
    work, n = list(bits), len(gen)
    for i in range(len(work) - n + 1):
        if work[i] == "1":
            for j, g in enumerate(gen):
                work[i + j] = "0" if work[i + j] == g else "1"
            if len(steps) < MAX_STEPS:
                steps.append({"step": len(steps) + 1, "description": f"Bit {i} is 1: XOR generator {gen} at offset {i}", "value": "".join(work)})
    return "".join(work[-(n - 1):])


def _encode(alg: str, parity: str, gen: str, data: str) -> tuple[str, str, list[dict]]:
    steps: list[dict] = []
    if alg == "parity":
        bit = str(_ones(data) % 2) if parity == "even" else str((_ones(data) + 1) % 2)
        steps += [
            {"step": 1, "description": f"Count the 1s in the data: {_ones(data)}"},
            {"step": 2, "description": f"{parity.capitalize()} parity needs parity bit {bit}", "value": bit},
        ]
        return data, bit, steps
    if alg == "checksum":
        padded = data + "0" * (-len(data) % 16)
        if padded != data:
            steps.append({"step": 1, "description": f"Pad with {len(padded) - len(data)} trailing zero bits to a 16-bit boundary (RFC 1071)", "value": padded})
        total = 0
        for i in range(0, len(padded), 16):
            total = _fold(total + int(padded[i:i + 16], 2))
            steps.append({"step": len(steps) + 1, "description": f"Add word {padded[i:i + 16]} and fold carries", "value": f"{total:016b}"})
        cs = f"{(~total) & 0xFFFF:016b}"
        steps.append({"step": len(steps) + 1, "description": "One's complement of the sum is the checksum", "value": cs})
        return padded, cs, steps
    r = len(gen) - 1
    dividend = data + "0" * r
    steps.append({"step": 1, "description": f"Append {r} zero bits to the data", "value": dividend})
    rem = _crc_div(dividend, gen, steps)
    steps.append({"step": len(steps) + 1, "description": "Remainder is the CRC", "value": rem})
    return data, rem, steps


def _check(alg: str, parity: str, gen: str, received: str) -> tuple[bool, str, list[dict]]:
    steps: list[dict] = []
    if alg == "parity":
        ones = _ones(received)
        ok = ones % 2 == (0 if parity == "even" else 1)
        steps.append({"step": 1, "description": f"Count the 1s in the received bits: {ones}"})
        return ok, f"Number of 1s is {'correct' if ok else 'wrong'} for {parity} parity.", steps
    if alg == "checksum":
        if len(received) % 16:
            raise AppError(422, "invalid_length", "Checksum verification needs a bit string whose length is a multiple of 16.")
        total = 0
        for i in range(0, len(received), 16):
            total = _fold(total + int(received[i:i + 16], 2))
        steps.append({"step": 1, "description": "Add all 16-bit words (including the checksum) and fold carries", "value": f"{total:016b}"})
        ok = total == 0xFFFF
        return ok, "Sum is all ones, so no error detected." if ok else "Sum is not all ones, so an error was detected.", steps
    if len(received) < len(gen):
        raise AppError(422, "invalid_length", "Received bits must be at least as long as the generator.")
    rem = _crc_div(received, gen, steps)
    ok = "1" not in rem
    steps.append({"step": len(steps) + 1, "description": "Remainder after division", "value": rem})
    return ok, "Remainder is zero, so no error detected." if ok else "Remainder is not zero, so an error was detected.", steps


def simulate(req: EncodeRequest) -> dict:
    alg, parity = _norm(req.algorithm, req.parity_type)
    gen = req.generator if alg == "crc" else None
    padded, red, steps = _encode(alg, parity, req.generator, req.data)
    sent = padded + red
    flips = sorted(set(req.flip_positions))
    if flips and (flips[0] < 0 or flips[-1] >= len(sent)):
        raise AppError(422, "invalid_flip_position", f"flip_positions must be between 0 and {len(sent) - 1}.")
    recv = "".join(("1" if b == "0" else "0") if i in flips else b for i, b in enumerate(sent))
    ok, detail, vsteps = _check(alg, parity, req.generator, recv)
    steps += [{**s, "step": len(steps) + k + 1} for k, s in enumerate(vsteps)]
    return {
        "algorithm": alg,
        "parity_type": parity if alg == "parity" else None,
        "generator": gen,
        "data_bits": req.data,
        "padded_data_bits": padded,
        "redundant_bits": red,
        "transmitted_bits": sent,
        "flipped_positions": flips,
        "received_bits": recv,
        "steps": steps,
        "steps_truncated": len(steps) >= MAX_STEPS,
        "verification": {
            "passed": ok,
            "error_detected": not ok,
            "detail": detail,
            "errors_injected": bool(flips),
            "undetected_error": bool(flips) and ok,
        },
    }


def verify(req: VerifyRequest) -> dict:
    alg, parity = _norm(req.algorithm, req.parity_type)
    ok, detail, steps = _check(alg, parity, req.generator, req.received_bits)
    return {
        "algorithm": alg,
        "received_bits": req.received_bits,
        "steps": steps,
        "steps_truncated": len(steps) >= MAX_STEPS,
        "verification": {"passed": ok, "error_detected": not ok, "detail": detail},
    }


# ---------------------------------------------------------------------------
# Two-Dimensional (Matrix) Parity
# ---------------------------------------------------------------------------

def two_d_parity(data: str, row_width: int, parity_type: str, flip_positions: list[int]) -> dict:
    """Calculates row and column parity bits in a 2D matrix, with single-bit error location."""
    # Pad data to multiple of row_width
    rem = len(data) % row_width
    padded = data + ("0" * (row_width - rem) if rem else "")
    num_rows = len(padded) // row_width

    matrix = []
    row_parities = []

    for r in range(num_rows):
        row_bits = list(padded[r * row_width:(r + 1) * row_width])
        matrix.append(row_bits)
        ones = row_bits.count("1")
        p_bit = "0" if (ones % 2 == 0 if parity_type == "even" else ones % 2 == 1) else "1"
        row_parities.append(p_bit)

    # Column parities
    col_parities = []
    for c in range(row_width):
        col_ones = sum(1 for r in range(num_rows) if matrix[r][c] == "1")
        c_bit = "0" if (col_ones % 2 == 0 if parity_type == "even" else col_ones % 2 == 1) else "1"
        col_parities.append(c_bit)

    # Flattened transmitted payload = data rows + row parity appended to each row, followed by col parity row
    transmitted_chars = []
    for r in range(num_rows):
        transmitted_chars.extend(matrix[r])
        transmitted_chars.append(row_parities[r])
    transmitted_chars.extend(col_parities)
    # Bottom right overall parity
    overall_p = "0" if (row_parities.count("1") % 2 == 0 if parity_type == "even" else row_parities.count("1") % 2 == 1) else "1"
    transmitted_chars.append(overall_p)
    transmitted_bits = "".join(transmitted_chars)

    # Apply bit flips
    flips = sorted(set(flip_positions))
    if flips and (flips[0] < 0 or flips[-1] >= len(transmitted_bits)):
        raise AppError(422, "invalid_flip_position", f"flip_positions must be between 0 and {len(transmitted_bits) - 1}.")

    recv_list = list(transmitted_bits)
    for pos in flips:
        recv_list[pos] = "1" if recv_list[pos] == "0" else "0"

    # Reconstruct received matrix & parities
    row_stride = row_width + 1
    recv_matrix = []
    recv_row_parities = []
    for r in range(num_rows):
        start = r * row_stride
        recv_matrix.append(recv_list[start:start + row_width])
        recv_row_parities.append(recv_list[start + row_width])

    col_start = num_rows * row_stride
    recv_col_parities = recv_list[col_start:col_start + row_width]

    # Check errors
    row_errors = []
    for r in range(num_rows):
        expected_ones = recv_matrix[r].count("1") + (1 if recv_row_parities[r] == "1" else 0)
        if (expected_ones % 2 != 0 if parity_type == "even" else expected_ones % 2 != 1):
            row_errors.append(r)

    col_errors = []
    for c in range(row_width):
        col_ones = sum(1 for r in range(num_rows) if recv_matrix[r][c] == "1") + (1 if recv_col_parities[c] == "1" else 0)
        if (col_ones % 2 != 0 if parity_type == "even" else col_ones % 2 != 1):
            col_errors.append(c)

    error_detected = bool(row_errors or col_errors)
    can_correct = len(row_errors) == 1 and len(col_errors) == 1
    corrected_pos = (row_errors[0], col_errors[0]) if can_correct else None

    if not error_detected:
        detail = "All row and column parity checks passed. No error detected."
    elif can_correct:
        detail = f"Single bit error detected and located at Row {row_errors[0]}, Column {col_errors[0]}! Bit can be automatically corrected."
    else:
        detail = f"Multiple bit errors detected ({len(row_errors)} row error(s), {len(col_errors)} column error(s)). Errors detected, but cannot be unambiguously corrected."

    return {
        "row_width": row_width,
        "num_rows": num_rows,
        "parity_type": parity_type,
        "original_matrix": matrix,
        "row_parities": row_parities,
        "col_parities": col_parities,
        "transmitted_bits": transmitted_bits,
        "flipped_positions": flips,
        "received_matrix": recv_matrix,
        "received_row_parities": recv_row_parities,
        "received_col_parities": recv_col_parities,
        "row_error_indices": row_errors,
        "col_error_indices": col_errors,
        "passed": not error_detected,
        "error_detected": error_detected,
        "can_correct_single_bit": can_correct,
        "corrected_position": corrected_pos,
        "detail": detail,
    }


# ---------------------------------------------------------------------------
# Detection Rate Monte Carlo Experiment
# ---------------------------------------------------------------------------

def run_detection_experiment(
    data_length: int = 32,
    trials: int = 200,
    flip_count: int = 2,
    algorithms: list[str] | None = None,
    seed: int = 42,
) -> dict:
    """Runs a controlled simulation measuring the empirical detection rate across different error detection methods."""
    if not algorithms:
        algorithms = ["parity-even", "checksum", "crc-8", "crc-16"]

    rng = random.Random(seed)
    stats_map = {alg: {"detected": 0, "undetected": 0} for alg in algorithms}

    for _ in range(trials):
        # Generate random bit string
        data_bits = "".join(rng.choice(["0", "1"]) for _ in range(data_length))

        for alg in algorithms:
            # Map algorithm string
            if alg.startswith("parity"):
                p_type = "even" if "even" in alg else "odd"
                padded, red, _ = _encode("parity", p_type, "", data_bits)
                transmitted = padded + red
                flips = rng.sample(range(len(transmitted)), min(flip_count, len(transmitted)))
                recv = "".join(("1" if b == "0" else "0") if i in flips else b for i, b in enumerate(transmitted))
                ok, _, _ = _check("parity", p_type, "", recv)
            elif alg == "checksum":
                padded, red, _ = _encode("checksum", "even", "", data_bits)
                transmitted = padded + red
                flips = rng.sample(range(len(transmitted)), min(flip_count, len(transmitted)))
                recv = "".join(("1" if b == "0" else "0") if i in flips else b for i, b in enumerate(transmitted))
                ok, _, _ = _check("checksum", "even", "", recv)
            else:
                # CRC
                gen = CRC_PRESETS.get(alg, "100000111")
                padded, red, _ = _encode("crc", "even", gen, data_bits)
                transmitted = padded + red
                flips = rng.sample(range(len(transmitted)), min(flip_count, len(transmitted)))
                recv = "".join(("1" if b == "0" else "0") if i in flips else b for i, b in enumerate(transmitted))
                ok, _, _ = _check("crc", "even", gen, recv)

            if not ok:
                stats_map[alg]["detected"] += 1
            else:
                stats_map[alg]["undetected"] += 1

    summary_stats = []
    for alg in algorithms:
        det = stats_map[alg]["detected"]
        undet = stats_map[alg]["undetected"]
        tot = det + undet
        det_pct = round((det / tot) * 100, 1) if tot else 0.0
        miss_pct = round((undet / tot) * 100, 1) if tot else 0.0
        summary_stats.append({
            "algorithm": alg,
            "trials": tot,
            "detected": det,
            "undetected": undet,
            "detection_rate_pct": det_pct,
            "missed_rate_pct": miss_pct,
        })

    explanation = (
        f"Simulated {trials} trials with {flip_count} injected bit error(s) per message. "
        f"Single-bit parity always detects an odd number of bit errors (1, 3, 5...), but completely misses an even number of bit errors (e.g. 2 bit flips), "
        f"because two inversions cancel out in modulo-2 arithmetic. "
        f"Internet Checksum catches most errors, but misses compensating errors within the same 16-bit word column. "
        f"CRC polynomials (CRC-8, CRC-16, CRC-32) achieve 100% detection for burst errors whose length is less than or equal to the polynomial degree."
    )

    return {
        "trials": trials,
        "flip_count": flip_count,
        "data_length": data_length,
        "stats": summary_stats,
        "explanation": explanation,
    }
