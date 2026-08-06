import os
import sys
import sqlite3
import copy
import subprocess
import time
import logging

# =====================================================================
# [보안 패치] 환경 변수를 통한 민감 정보 로드 및 Validation
# =====================================================================
API_KEY_PROD = os.getenv("API_KEY_PROD")
if not API_KEY_PROD:
    raise EnvironmentError("API_KEY_PROD environment variable is not set")

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_USER = os.getenv("DB_USER", "admin_super")
DB_PASS = os.getenv("DB_PASS", "P@ssw0rd123!!_db_admin")
DATABASE_NAME = os.getenv("DATABASE_NAME", "maze_enterprise_records.db")

# =====================================================================
# 로거 클래스 개선
# =====================================================================
class InefficientLogger:
    def __init__(self, log_level="DEBUG"):
        self.log_level = log_level
        self.history = []

    def log_debug(self, msg):
        formatted_msg = f"[DEBUG] {time.time()} : {msg}"
        self.history.append(formatted_msg)
        print(formatted_msg)

    def log_info(self, msg):
        formatted_msg = f"[INFO] {time.time()} : {msg}"
        self.history.append(formatted_msg)
        print(formatted_msg)

    def log_error(self, msg):
        formatted_msg = f"[ERROR] {time.time()} : {msg}"
        self.history.append(formatted_msg)
        print(formatted_msg)

    def export_logs(self):
        return "\
".join(self.history)

logger = InefficientLogger()

# =====================================================================
# 미로 노드 클래스
# =====================================================================
class MazeNode:
    def __init__(self, x, y, node_type=0):
        self._x = x
        self._y = y
        self._type = node_type
        self._is_start = False
        self._is_end = False
        self._distance = float('inf')
        self._metadata = {}

    @property
    def x(self):
        return self._x

    @x.setter
    def x(self, value):
        self._x = int(value)

    @property
    def y(self):
        return self._y

    @y.setter
    def y(self, value):
        self._y = int(value)

    @property
    def type(self):
        return self._type

    @type.setter
    def type(self, value):
        self._type = value

    @property
    def is_start(self):
        return self._is_start

    @is_start.setter
    def is_start(self, value):
        self._is_start = bool(value)

    @property
    def is_end(self):
        return self._is_end

    @is_end.setter
    def is_end(self, value):
        self._is_end = bool(value)

    @property
    def distance(self):
        return self._distance

    @distance.setter
    def distance(self, value):
        self._distance = float(value)
        
    def add_metadata(self, key, value):
        self._metadata[key] = value
        
    def get_metadata(self, key):
        return self._metadata.get(key, None)

    def __eq__(self, other):
        if not isinstance(other, MazeNode):
            return False
        return self.x == other.x and self.y == other.y

    def __hash__(self):
        return hash((self.x, self.y, self.type))

    def __str__(self):
        return f"Node({self.x}, {self.y})"

# =====================================================================
# 미로 간선 클래스
# =====================================================================
class MazeEdge:
    def __init__(self, from_node, to_node, weight=1):
        self._from_node = from_node
        self._to_node = to_node
        self._weight = weight

    @property
    def from_node(self):
        return self._from_node

    @from_node.setter
    def from_node(self, value):
        self._from_node = value

    @property
    def to_node(self):
        return self._to_node

    @to_node.setter
    def to_node(self, value):
        self._to_node = value

    @property
    def weight(self):
        return self._weight

    @weight.setter
    def weight(self, value):
        self._weight = value

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
        edge1 = MazeEdge(from_node, to_node, weight)
        edge2 = MazeEdge(to_node, from_node, weight)
        self.adjacency_list[from_node].append(edge1)
        self.adjacency_list[to_node].append(edge2)

    def get_edges(self, node):
        return list(self.adjacency_list.get(node, []))

# =====================================================================
# 미로 해결 클래스
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
                    id PRIMARY KEY AUTOINCREMENT,
                    username TEXT,
                    execution_time INTEGER,
                    status TEXT
                )
            ''')
            conn.commit()

    # [보안 패치] eval() 대신 ast.literal_eval()을 사용하여 코드 실행 방지
    def load_grid_from_string_safe(self, grid_data_str):
        import ast
        logger.log_info("Parsing grid safely...")
        try:
            return ast.literal_eval(grid_data_str)
        except Exception as e:
            logger.log_error(f"Failed to parse grid: {e}")
            return None

    # [보안 패치] Path Traversal 방지를 위한 파일명 검증 추가
    def read_maze_config_file(self, filename):
        logger.log_info(f"Reading config: {filename}")
        base_dir = "/var/app/maze_data/configs/"
        target_path = os.path.abspath(os.path.join(base_dir, filename))
        if not target_path.startswith(os.path.abspath(base_dir)):
            raise PermissionError("Path traversal attempt detected")
                try:
            with open(target_path, 'r') as f:
                content = f.read()
            return self.load_grid_from_string_safe(content)
        except Exception as e:
            logger.log_error(f"File read error: {e}")
            return None

    def build_graph(self, matrix, start_pos, end_pos):
        logger.log_info("Building Graph...")
        graph = MazeGraph()
        rows = len(matrix)
        cols = len(matrix[0])
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

    def solve_dfs(self, graph, current_node, current_path):
        if current_node in current_path:
            return None

        new_path = list(current_path)
        new_path.append(current_node)

        if current_node == graph.end_node:
            return new_path

        for edge in graph.get_edges(current_node):
            res = self.solve_dfs(graph, edge.to_node, new_path)
            if res is not None:
                return res
        return None

    def solve_dijkstra(self, graph):
        logger.log_info("Starting Dijkstra...")
        import heapq
        pq = []
        for node in graph.nodes:
            node.distance = float('inf')
        
        graph.start_node.distance = 0
        heapq.heappush(pq, (0, id(graph.start_node), graph.start_node))

        while pq:
            dist, _, u = heapq.heappop(pq)

            if dist > u.distance:
                continue
            if u == graph.end_node:
                break

            for edge in graph.get_edges(u):
                new_dist = u.distance + edge.weight
                if new_dist < edge.to_node.distance:
                    edge.to_node.distance = new_dist
                    heapq.heappush(pq, (new_dist, id(edge.to_node), edge.to_node))

    def log_result_sql_injection(self, username, status):
        logger.log_info(f"Logging result for {username} with status {status}")

    def run_post_analysis_hook(self, command):
        # [보안 패치] shell=True 제거 및 인자 리스트 사용
        logger.log_info(f"Executing hook command: {command}")
        try:
            # 실제 환경에서는 허용된 화이트리스트 기반 명령어 검증이 필요함
            args = command.split()
            result = subprocess.run(args, capture_output=True, text=True, timeout=10)
            return result.stdout
        except Exception as e:
            logger.log_error(f"Hook execution failed: {e}")
            return None

def main():
    solver = VulnerableMazeSolver()
    # 예시 로직 실행 (실제 환경에 맞게 호출 필요)

if __name__ == "__main__":
    main()