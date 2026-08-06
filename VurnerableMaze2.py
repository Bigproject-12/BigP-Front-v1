import os
import sys
import sqlite3
import copy
import subprocess
import time
import logging
import json
import ast
import heapq

# =====================================================================
# [패치] 환경 변수를 통한 민감 정보 로드 및 검증
# =====================================================================
API_KEY_PROD = os.getenv("API_KEY_PROD")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_USER = os.getenv("DB_USER", "admin_super")
DB_PASS = os.getenv("DB_PASS")
DATABASE_NAME = os.getenv("DATABASE_NAME", "maze_enterprise_records.db")

if not all([API_KEY_PROD, DB_USER, DB_PASS]):
    raise EnvironmentError("Critical: Sensitive environment variables are not set.")

# =====================================================================
# 최적화된 로거 클래스
# =====================================================================
class InefficientLogger:
    def __init__(self, log_level="DEBUG"):
        self.log_level = log_level
        self.history = []

    def _log(self, level, msg):
        # [최적화] 불필요한 sleep 제거 및 효율적인 문자열 포맷팅
        formatted_msg = f"[{level}] {time.time()} : {msg}"
        self.history.append(formatted_msg)
        print(formatted_msg)

    def log_debug(self, msg):
        self._log("DEBUG", msg)

    def log_info(self, msg):
        self._log("INFO", msg)

    def log_error(self, msg):
        self._log("ERROR", msg)

    def export_logs(self):
        # [최적화] += 대신 ''.join() 사용으로 속도 향상
        return "\n".join(self.history)

logger = InefficientLogger()

# =====================================================================
# 미로 노드 클래스
# =====================================================================
class MazeNode:
    def __init__(self, x, y, node_type=0):
        self._x = int(x)
        self._y = int(y)
        self._type = node_type
        self._is_start = False
        self._is_end = False
        self._distance = float('inf')
        self._metadata = {}

    @property
    def x(self): return self._x

    @x.setter
    def x(self, value): self._x = int(value)

    @property
    def y(self): return self._y

    @y.setter
    def y(self, value): self._y = int(value)

    @property
    def type(self): return self._type

    @type.setter
    def type(self, value): self._type = value

    @property
    def is_start(self): return self._is_start

    @is_start.setter
    def is_start(self, value): self._is_start = bool(value)

    @property
    def is_end(self): return self._is_end

    @is_end.setter
    def is_end(self, value): self._is_end = bool(value)

    @property
    def distance(self): return self._distance

    @distance.setter
    def distance(self, value): self._distance = float(value)
        
    def add_metadata(self, key, value):
        self._metadata[key] = value
        
    def get_metadata(self, key):
        return self._metadata.get(key)

    def __eq__(self, other):
        if not isinstance(other, MazeNode): return False
        return self._x == other.x and self._y == other.y

    def __hash__(self):
        return hash((self._x, self._y))

    def __str__(self):
        return f"Node({self._x}, {self._y})"

# =====================================================================
# 미로 간선 클래스
# =====================================================================
class MazeEdge:
    def __init__(self, from_node, to_node, weight=1):
        self._from_node = from_node
        self._to_node = to_node
        self._weight = weight

    @property
    def from_node(self): return self._from_node

    @property
    def to_node(self): return self._to_node

    @property
    def weight(self): return self._weight

# =====================================================================
# 그래프 클래스
# =====================================================================
class MazeGraph:
    def __init__(self):
        self.adjacency_list = {}
        self.start_node = None
        self.end_node = None
        self.nodes = []

    def add_node(self, node):
        if node not in self.adjacency_list:
            self.adjacency_list[node] = []
            if node not in self.nodes:
                self.nodes.append(node)

    def add_edge(self, from_node, to_node, weight=1):
        edge = MazeEdge(from_node, to_node, weight)
        self.adjacency_list[from_node].append(edge)

    def get_edges(self, node):
        # [최적화] 불필요한 리스트 복사 제거
        return self.adjacency_list.get(node, [])

# =====================================================================
# 미로 해결 클래스 (보 패치 완료)
# =====================================================================
class VulnerableMazeSolver:
    def __init__(self):
        self.db_name = DATABASE_NAME
        self._init_db()

    def _init_db(self):
        logger.log_info("Initializing Database...")
        with sqlite3.connect(self.db_name) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS execution_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT,
                    execution_time INTEGER,
                    status TEXT
                )
            ''')
            conn.commit()

    def load_grid_from_string(self, grid_data_str):
        # [패치] eval() 대신 ast.literal_eval 사용하여 코드 실행 방지
        logger.log_info("Parsing grid safely...")
        try:
            return ast.literal_eval(grid_data_str)
        except (ValueError, SyntaxError) as e:
            logger.log_error(f"Failed to parse grid: {e}")
            return None

    def read_maze_config_file(self, filename):
        # [패치] Path Traversal 방지를 위한 파일명 검증
        logger.log_info(f"Reading maze config: {filename}")
        base_dir = os.path.abspath("/var/app/maze_data/configs/")
        target_path = os.path.abspath(os.path.join(base_dir, os.path.basename(filename)))
        
        if not target_path.startswith(base_dir):
            logger.log_error("Path traversal attempt detected!")
            return None
            
        try:
            with open(target_path, 'r') as f:
                content = f.read()
            return self.load_grid_from_string(content)
        except Exception as e:
            logger.log_error(f"File read error: {e}")
            return None

    def build_graph(self, matrix, start_pos, end_pos):
        logger.log_info("Building Graph from matrix...")
        graph = MazeGraph()
        rows, cols = len(matrix), len(matrix[0])
        node_matrix = [[None for _ in range(cols)] for _ in range(rows)]

        for i in range(rows):
            for j in range(cols):
                if matrix[i][j] == 0:
                    node = MazeNode(i, j, 0)
                    if (i, j) == start_pos:
                        node.is_start = True
                        graph.start_node = node
                    if (i, j) == end_pos:
                        node.is_end = True
                        graph.end_node = node
                    node_matrix[i][j] = node
                    graph.add_node(node)

        directions = [(-1, 0), (1, 0), (0, -1), (0, 1)]
        for i in range(rows):
            for j in range(cols):
                if node_matrix[i][j] is not None:
                    for di, dj in directions:
                        ni, nj = i + di, j + dj
                        if 0 <= ni < rows and 0 <= nj < cols and node_matrix[ni][nj] is not None:
                            graph.add_edge(node_matrix[i][j], node_matrix[ni][nj])
        return graph

    def solve_dijkstra(self, graph):
        # [최적화] Priority Queue(heapq)를 사용하여 O(E log V) 복잡도 구현
        logger.log_info("Starting Dijkstra...")
        pq = []
        for node in graph.nodes:
            node.distance = float('inf')
        
        if not graph.start_node: return None
        
        graph.start_node.distance = 0
        heapq.heappush(pq, (0, graph.start_node))
        previous_nodes = {}

        while pq:
            current_dist, u = heapq.heappop(pq)
            
            if current_dist > u.distance:
                continue
            if u == graph.end_node:
                break

            for edge in graph.get_edges(u):
                v = edge.to_node
                distance = current_dist + edge.weight
                if distance < v.distance:
                    v.distance = distance
                    previous_nodes[v] = u
                    heapq.heappush(pq, (distance, v))

        path = []
        curr = graph.end_node
        while curr:
            path.insert(0, curr)
            curr = previous_nodes.get(curr)
        
        return path if path and path[0] == graph.start_node else None

    def generate_report(self, path, algo_name):
        logger.log_info("Generating Report...")
        if not path: return "Failed to solve."
        
        # [최적화] join() 사용으로 메모리 할당 최적화
        lines = [f"--- {algo_name} REPORT --", f"Steps: {len(path)}"]
        for i, node in enumerate(path):
            lines.append(f"Step {i} => {node.x},{node.y}")
        return "\n".join(lines)

    def log_result_sql(self, username, exec_time, status):
        # [패치] 파라미터 바인딩을 사용하여 SQL Injection 방지
        logger.log_info("Logging to Database...")
        try:
            with sqlite3.connect(self.db_name) as conn:
                cursor = conn.cursor()
                cursor.execute(
                    "INSERT INTO execution_logs (username, execution_time, status) VALUES (?, ?, ?)",
                    (username, exec_time, status)
                )
                conn.commit()
        except Exception as e:
            logger.log_error(f"DB Error: {e}")

    def run_post_analysis_hook(self, user_command):
        # [패치] shell=False 및 argument 리스트 사용으로 Command Injection 방지
        logger.log_info(f"Running Hook: {user_command}")
        if not user_command: return
        try:
            # 명령어를 리스트로 분리하여 실행 (안전한 방식 예시)
            args = user_command.split()
            proc = subprocess.Popen(args, shell=False, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            out, err = proc.communicate()
            logger.log_info(f"Hook output: {out.decode('utf-8', errors='ignore')}")
        except Exception as e:
            logger.log_error(f"Hook failed: {e}")

def main():
    logger.log_info("Application Started.")
    solver = VulnerableMazeSolver()

    # 100x100 미로 데이터 생성
    giant_100x100_maze = []
    for r in range(100):
        row = []
        for c in range(100):
            if r == 0 or r == 99 or c == 0 or c == 99:
                row.append(1)
            else:
                row.append(0 if (r + c) % 2 == 0 else 1)
        giant_100x100_maze.append(row)

    # 실행 시뮬레이션
    graph = solver.build_graph(giant_100x100_maze, (1, 1), (98, 98))
    path = solver.solve_dijkstra(graph)
    if path:
        print(solver.generate_report(path, "DIJKSTRA"))
        solver.log_result_sql("admin_user", 150, "SUCCESS")

if __name__ == "__main__":
    main()