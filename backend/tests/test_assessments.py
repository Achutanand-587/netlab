from tests.conftest import API

BASE = f"{API}/assessments"


def test_list_assessments(client):
    r = client.get(f"{BASE}/tests")
    assert r.status_code == 200
    tests = r.json()
    assert len(tests) >= 10
    categories = {t["category"] for t in tests}
    assert "topic" in categories
    assert "difficulty" in categories
    assert "mixed" in categories
    assert "practical" in categories

    intro = next(t for t in tests if t["id"] == "test-topic-intro")
    assert intro["title"] == "Introduction to Networks & Topologies"
    assert intro["question_count"] == 4
    assert intro["difficulty"] == "beginner"
    assert intro["pass_percentage"] == 60


def test_get_assessment_detail_sanitizes_answers(client):
    r = client.get(f"{BASE}/tests/test-topic-intro")
    assert r.status_code == 200
    data = r.json()
    assert data["id"] == "test-topic-intro"
    assert len(data["questions"]) == 4

    # Ensure answers and explanations are NOT leaked to students before submission
    for q in data["questions"]:
        assert "correct_answer" not in q
        assert "explanation" not in q
        assert q["id"]
        assert q["text"]
        assert q["type"] in ("single", "multiple", "boolean", "matching", "scenario", "numerical")


def test_get_nonexistent_assessment(client):
    r = client.get(f"{BASE}/tests/non-existent-test-id")
    assert r.status_code == 404
    assert r.json()["error"]["code"] == "test_not_found"


def test_generate_custom_assessment(client):
    req = {
        "topics": ["subnetting", "vlsm"],
        "difficulty": "intermediate",
        "question_count": 6,
        "timed": True,
    }
    r = client.post(f"{BASE}/custom", json=req)
    assert r.status_code == 200
    data = r.json()
    assert data["id"] == "custom-practice"
    assert len(data["questions"]) <= 6
    for q in data["questions"]:
        assert q["topic"] in ("subnetting", "vlsm")


def test_submit_and_evaluate_assessment(client):
    # Submit answers for test-topic-intro (4 questions: intro-q1, intro-q2, intro-q3, intro-q4)
    # intro-q1: Star (index 1) - correct
    # intro-q2: True (index 0) - correct
    # intro-q3: MAN (index 2) - correct
    # intro-q4: Bus or single-ring (index 1) - correct
    payload = {
        "test_id": "test-topic-intro",
        "test_title": "Introduction to Networks & Topologies",
        "test_type": "topic",
        "time_taken_seconds": 95,
        "answers": {
            "intro-q1": 1,
            "intro-q2": 0,
            "intro-q3": 2,
            "intro-q4": 1,
        },
        "question_ids": ["intro-q1", "intro-q2", "intro-q3", "intro-q4"],
    }
    r = client.post(f"{BASE}/submit", json=payload)
    assert r.status_code == 200
    res = r.json()

    assert res["attempt_id"] > 0
    assert res["total_questions"] == 4
    assert res["answered_questions"] == 4
    assert res["unanswered_questions"] == 0
    assert res["correct_answers"] == 4
    assert res["incorrect_answers"] == 0
    assert res["percentage"] == 100.0
    assert res["passed"] is True
    assert res["time_taken_seconds"] == 95
    assert len(res["reviews"]) == 4

    # Verify review includes correct answers and explanations after submission
    for rev in res["reviews"]:
        assert rev["is_correct"] is True
        assert rev["explanation"]
        assert rev["student_answer"] is not None
        assert rev["correct_answer"] is not None

    # Verify topic breakdown
    assert "intro" in res["topic_breakdown"]
    assert res["topic_breakdown"]["intro"]["percentage"] == 100.0
    assert res["weak_topics"] == []

    # Verify attempt was persisted in database and is visible via /attempts
    r_att = client.get(f"{BASE}/attempts")
    assert r_att.status_code == 200
    attempts = r_att.json()["items"]
    assert len(attempts) >= 1
    latest = attempts[0]
    assert latest["id"] == res["attempt_id"]
    assert latest["percentage"] == 100.0
    assert latest["passed"] is True

    # Verify attempt detail retrieval
    r_det = client.get(f"{BASE}/attempts/{res['attempt_id']}")
    assert r_det.status_code == 200
    det = r_det.json()
    assert det["attempt_id"] == res["attempt_id"]
    assert det["percentage"] == 100.0
    assert len(det["reviews"]) == 4

    # Verify integration with experiments API
    r_exp = client.get(f"{API}/experiments", params={"module": "assessments"})
    assert r_exp.status_code == 200
    assert r_exp.json()["total"] >= 1


def test_submit_with_incorrect_and_unanswered(client):
    payload = {
        "test_id": "test-topic-intro",
        "test_title": "Introduction to Networks & Topologies",
        "test_type": "topic",
        "time_taken_seconds": 120,
        "answers": {
            "intro-q1": 0,  # incorrect (correct is 1)
            # intro-q2 unanswered
            "intro-q3": 2,  # correct
            "intro-q4": 0,  # incorrect (correct is 1)
        },
        "question_ids": ["intro-q1", "intro-q2", "intro-q3", "intro-q4"],
    }
    r = client.post(f"{BASE}/submit", json=payload)
    assert r.status_code == 200
    res = r.json()

    assert res["answered_questions"] == 3
    assert res["unanswered_questions"] == 1
    assert res["correct_answers"] == 1
    assert res["incorrect_answers"] == 2
    assert res["passed"] is False  # 1/5 marks = 20% < 60%
    assert len(res["weak_topics"]) >= 1
