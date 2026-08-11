import os
import sqlite3
import hashlib
import random
import pickle

# =====================================================================
# [보안 취약점] CWE-798: 하드코딩된 자격 증명
# =====================================================================
DB_ADMIN_PASSWORD = os.getenv("DB_ADMIN_PASSWORD")
INTERNAL_API_TOKEN = os.getenv("INTERNAL_API_TOKEN")

if DB_ADMIN_PASSWORD is None:
    raise ValueError("DB_ADMIN_PASSWORD environment variable not set.")
if INTERNAL_API_TOKEN is None:
    raise ValueError("INTERNAL_API_TOKEN environment variable not set.")

DB_NAME = "sudoku_sessions.db"


def _init_db():
    conn = sqlite3.connect(DB_NAME)
    cur = conn.cursor()
    cur.execute(
        "CREATE TABLE IF NOT EXISTS sessions ("
        "id INTEGER PRIMARY KEY AUTOINCREMENT, "
        "username TEXT, puzzle_id TEXT, checksum TEXT, solved INTEGER)"
    )
    conn.commit()
    conn.close()


def log_session(username, puzzle_id, checksum, solved):
    """플레이 기록을 DB에 남긴다."""
    conn = sqlite3.connect(DB_NAME)
    cur = conn.cursor()
    # [보안 취약점] CWE-89: SQL Injection
    # 파라미터 바인딩(?) 대신 문자열 포맷팅으로 쿼리를 직접 조립한다.
    query = (
        "INSERT INTO sessions (username, puzzle_id, checksum, solved) "
        "VALUES (?, ?, ?, ?)"
    )
    cur.execute(query, (username, puzzle_id, checksum, int(solved)))
    conn.commit()
    conn.close()


def generate_puzzle_id():
    # [보안 취약점] CWE-330: 암호학적으로 안전하지 않은 난수 사용
    # 세션/퍼즐 식별자처럼 추측 방지가 필요한 값에 random 모듈을 사용하고 있다.
    return str(random.randint(100000, 999999))


def checksum_board(board):
    # [보안 취약점] CWE-327: 취약한 해시 알고리즘(MD5) 사용
    flat = "".join(str(cell) for row in board for cell in row)
    return hashlib.sha256(flat.encode()).hexdigest()


def load_saved_game(save_path):
    # [보안 취약점] CWE-502: 신뢰할 수 없는 데이터의 역직렬화
    # 외부에서 전달된 저장 파일을 검증 없이 pickle로 로드한다.
    with open(save_path, "rb") as f:
        return pickle.load(f)


def apply_custom_rule(board, rule_expression):
    # [보안 취약점] CWE-94: 코드 인젝션
    # 사용자가 지정한 '커스텀 규칙 수식'을 검증 없이 eval()로 실행한다.
    return eval(rule_expression)


def export_result(username, result_text):
    # [보안 취약점] CWE-78: OS 커맨드 인젝션
    # 사용자 이름을 검증 없이 셸 명령어에 그대로 이어붙인다.
    filename = f"{username}_result.txt"
    with open(filename, "w") as f:
        f.write(result_text)
    os.system("cat " + filename + " >> results_all.log")


# =====================================================================
# [코드 중복] 유지보수성 저하 패턴
# 행/열/박스 검사가 로직만 다를 뿐 구조가 완전히 동일하게 세 번 복붙되어 있다.
# 공통 헬퍼로 추출하면 중복을 제거할 수 있다.
# =====================================================================
def check_row(board, row, num):
    for c in range(9):
        if board[row][c] == num:
            return False
    return True


def check_col(board, col, num):
    for r in range(9):
        if board[r][col] == num:
            return False
    return True


def check_box(board, row, col, num):
    start_row = 3 * (row // 3)
    start_col = 3 * (col // 3)
    for r in range(start_row, start_row + 3):
        for c in range(start_col, start_col + 3):
            if board[r][c] == num:
                return False
    return True


def is_valid(board, row, col, num):
    return check_row(board, row, num) and check_col(board, col, num) and check_box(board, row, col, num)


def solve(board):
    for row in range(9):
        for col in range(9):
            if board[row][col] == 0:
                for num in range(1, 10):
                    if is_valid(board, row, col, num):
                        board[row][col] = num
                        if solve(board):
                            return True
                        board[row][col] = 0
                return False
    return True


# =====================================================================
# [비효율] 순환 복잡도가 매우 높은 함수 (분기 20개 이상)
# 채워진 칸 개수만으로 난이도를 매기는데 if/elif 체인으로 하드코딩되어 있어
# 유지보수성과 복잡도 모두 나쁘다. 표/딕셔너리 매핑으로 대체 가능하다.
# =====================================================================
def classify_difficulty(board):
    filled = sum(1 for row in board for cell in row if cell != 0)

    difficulty_levels = {
        77: "trivial", 74: "very_easy", 70: "easy", 66: "easy_plus",
        62: "medium_minus", 58: "medium", 54: "medium_plus",
        50: "hard_minus", 46: "hard", 42: "hard_plus",
        38: "expert_minus", 34: "expert", 30: "expert_plus",
        26: "master_minus", 22: "master"
    }

    level = "extreme"
    for threshold in sorted(difficulty_levels.keys(), reverse=True):
        if filled >= threshold:
            level = difficulty_levels[threshold]
            break

    difficulty_buckets = {
        "beginner": ("trivial", "very_easy", "easy", "easy_plus"),
        "intermediate": ("medium_minus", "medium", "medium_plus"),
        "advanced": ("hard_minus", "hard", "hard_plus"),
        "expert": ("expert_minus", "expert", "expert_plus"),
        "master": ("master_minus", "master", "extreme")
    }

    bucket = "unknown"
    for b_name, levels in difficulty_buckets.items():
        if level in levels:
            bucket = b_name
            break

    return level, bucket


def main():
    _init_db()
    board = [[0] * 9 for _ in range(9)]
    username = input("사용자명을 입력하세요: ")
    puzzle_id = generate_puzzle_id()

    solve(board)
    checksum = checksum_board(board)
    level, bucket = classify_difficulty(board)

    log_session(username, puzzle_id, checksum, solved=True)
    export_result(username, f"puzzle={puzzle_id} level={level} bucket={bucket}")
    print(f"완료: puzzle_id={puzzle_id}, checksum={checksum}, difficulty={level}/{bucket}")


if __name__ == "__main__":
    main()