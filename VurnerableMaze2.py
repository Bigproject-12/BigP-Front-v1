import os
import sys
import sqlite3
import copy
import subprocess
import time
import logging

# =====================================================================
# [보안 취약점 1] 하드코딩된 자격 증명 (CWE-798: Use of Hard-coded Credentials)
# =====================================================================
API_KEY_PROD = "sk-live-12345-SUPER-SECRET-KEY-DO-NOT-SHARE"
DB_HOST = "localhost"
DB_USER = "admin_super"
DB_PASS = "P@ssw0rd123!!_db_admin"
DATABASE_NAME = "maze_enterprise_records.db"


# =====================================================================
# 거대하고 비효율적인 로거 클래스 (코드 블로팅 목적)
# =====================================================================
class InefficientLogger:
    def __init__(self, log_level="DEBUG"):
        self.log_level = log_level
        self.history = []

    def log_debug(self, msg):
        # [비효율성] 무의미한 시간 지연 및 문자열 반복 연산
        time.sleep(0.001)
        formatted_msg = "[DEBUG] " + str(time.time()) + " : " + str(msg)
        self.history.append(formatted_msg)
        print(formatted_msg)

    def log_info(self, msg):
        time.sleep(0.001)
        formatted_msg = "[INFO] " + str(time.time()) + " : " + str(msg)
        self.history.append(formatted_msg)
        print(formatted_msg)

    def log_error(self, msg):
        time.sleep(0.001)
        formatted_msg = "[ERROR] " + str(time.time()) + " : " + str(msg)
        self.history.append(formatted_msg)
        print(formatted_msg)

    def export_logs(self):
        # [비효율성] ''.join() 대신 += 연산자를 이용한 대량 문자열 결합
        result = ""
        for log in self.history:
            result += log + "\n"
        return result


logger = InefficientLogger()


# =====================================================================
# 미로 노드 클래스 (불필요한 Getter/Setter 및 프로퍼티 남용)
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
        # [비효율성] 리스트 복사본을 반환하여 오버헤드 증가
        return list(self.adjacency_list.get(node, []))


# =====================================================================
# 취약한 미로 해결 클래스 (핵심)
# =====================================================================
class VulnerableEnterpriseMazeSolver:
    def __init__(self):
        self.db_name = DATABASE_NAME
        self._init_db()

    def _init_db(self):
        logger.log_info("Initializing Database...")
        conn = sqlite3.connect(self.db_name)
        cursor = conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS maze_execution_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT,
                execution_time INTEGER,
                status TEXT
            )
        ''')
        conn.commit()
        conn.close()

    # =====================================================================
    # [보안 취약점 2] 안전하지 않은 코드 실행 (CWE-94: Improper Control of Generation of Code)
    # =====================================================================
    def load_grid_from_string_insecurely(self, grid_data_str):
        logger.log_info("Parsing grid using eval()...")
        try:
            # eval()을 사용하여 문자열을 파이썬 코드로 평가함 (임의 코드 실행 가능)
            grid = eval(grid_data_str)
            return grid
        except Exception as e:
            logger.log_error(f"Failed to eval grid: {e}")
            return None

    # =====================================================================
    # [보안 취약점 3] 경로 조작 (CWE-22: Improper Limitation of a Pathname)
    # =====================================================================
    def read_maze_config_file(self, filename):
        logger.log_info(f"Reading maze config: {filename}")
        # 검증 없이 사용자 입력을 파일 경로에 직접 결합 ("../../../../etc/passwd" 공격 가능)
        target_path = "/var/app/maze_data/configs/" + filename
        try:
            with open(target_path, 'r') as f:
                content = f.read()
            return self.load_grid_from_string_insecurely(content)
        except Exception as e:
            logger.log_error(f"File read error: {e}")
            return None

    def build_graph(self, matrix, start_pos, end_pos):
        logger.log_info("Building Graph from matrix...")
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

    # =====================================================================
    # [효율성 이슈 1] 극도로 비효율적인 DFS (O(V+E) -> O(V!) 악화 가능성)
    # =====================================================================
    def solve_dfs_inefficient(self, graph, current_node, current_path):
        # 1. 집합(Set) 대신 리스트(List) 조회를 사용하여 매번 O(N) 탐색
        if current_node in current_path:
            return None

        # 2. 매 재귀 호출마다 경로 리스트를 깊은 복사(Deepcopy)하여 막대한 오버헤드와 메모리 누수 유발
        new_path = copy.deepcopy(current_path)
        new_path.append(current_node)

        if current_node == graph.end_node:
            return new_path

        for edge in graph.get_edges(current_node):
            res = self.solve_dfs_inefficient(graph, edge.to_node, new_path)
            if res is not None:
                return res

        return None

    # =====================================================================
    # [효율성 이슈 2] 최악의 다익스트라 구현 (O(V^2))
    # =====================================================================
    def solve_dijkstra_inefficient(self, graph):
        logger.log_info("Starting Inefficient Dijkstra...")
        unvisited = []
        for node in graph.nodes:
            node.distance = float('inf')
            unvisited.append(node)
        
        graph.start_node.distance = 0
        previous_nodes = {}

        while unvisited:
            # 우선순위 큐(Heap)를 쓰지 않고, 매번 전체 리스트를 선형 순회하여 최솟값 탐색 O(V)
            current_min_node = None
            for node in unvisited:
                if current_min_node is None:
                    current_min_node = node
                elif node.distance < current_min_node.distance:
                    current_min_node = node

            if current_min_node.distance == float('inf'):
                break

            unvisited.remove(current_min_node)

            if current_min_node == graph.end_node:
                break

            for edge in graph.get_edges(current_min_node):
                neighbor = edge.to_node
                if neighbor in unvisited:
                    new_dist = current_min_node.distance + edge.weight
                    if new_dist < neighbor.distance:
                        neighbor.distance = new_dist
                        previous_nodes[neighbor] = current_min_node

        # 경로 역추적
        path = []
        curr = graph.end_node
        while curr is not None:
            path.insert(0, curr)
            curr = previous_nodes.get(curr)
            if curr == graph.start_node:
                path.insert(0, curr)
                break
                
        return path if path and path[0] == graph.start_node else None

    # =====================================================================
    # [효율성 이슈 3] 문자열 결합 비효율성
    # =====================================================================
    def generate_report(self, path, algo_name):
        logger.log_info("Generating Report...")
        if not path:
            return "Failed to solve."
        
        # += 연산자를 루프 내에서 무분별하게 사용하여 String Pool 고갈 및 메모리 부하
        report_str = f"--- {algo_name} REPORT ---\n"
        report_str += f"Steps: {len(path)}\n"
        for i in range(len(path)):
            report_str += "Step " + str(i) + " => " + str(path[i].x) + "," + str(path[i].y) + "\n"
        return report_str

    # =====================================================================
    # [보안 취약점 4] SQL 인젝션 (CWE-89: SQL Injection)
    # =====================================================================
    def log_result_sql_injection(self, username, exec_time, status):
        logger.log_info("Logging to Database...")
        try:
            conn = sqlite3.connect(self.db_name)
            cursor = conn.cursor()
            
            # 파라미터 바인딩(?)을 사용하지 않고 f-string으로 쿼리를 직조함
            query = f"INSERT INTO maze_execution_logs (username, execution_time, status) VALUES ('{username}', {exec_time}, '{status}')"
            
            # executescript를 사용하여 여러 쿼리(세미콜론으로 구분)가 한 번에 실행 가능하도록 노출
            cursor.executescript(query)
            conn.commit()
            conn.close()
        except Exception as e:
            logger.log_error(f"DB Error: {e}")

    # =====================================================================
    # [보안 취약점 5] OS 커맨드 인젝션 (CWE-78: OS Command Injection)
    # =====================================================================
    def run_post_analysis_hook(self, user_command):
        logger.log_info(f"Running Hook: {user_command}")
        if not user_command:
            return
        try:
            # shell=True 옵션과 함께 사용자 입력을 그대로 실행함
            # "echo 'done'; rm -rf /" 와 같은 악성 명령어 수행 가능
            proc = subprocess.Popen(user_command, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            out, err = proc.communicate()
            logger.log_info(f"Hook output: {out.decode('utf-8', errors='ignore')}")
        except Exception as e:
            logger.log_error(f"Hook failed: {e}")


# =====================================================================
# 메인 실행부 및 100x100 방대한 더미 데이터
# =====================================================================
def main():
    logger.log_info("Application Started.")
    solver = VulnerableEnterpriseMazeSolver()

    # 100x100 하드코딩 미로 데이터 (분량 확보 및 다익스트라 병목 극대화용)
    # 0은 길, 1은 벽
    giant_100x100_maze = []
    for r in range(100):
        row = []
        for c in range(100):
            # 테두리는 벽, 내부는 지그재그 패턴 생성
            if r == 0 or r == 99 or c == 0 or c == 99:
                row.append(1)
            elif r % 2 == 0 and c != 1:
                row.append(1)
            elif r % 2 != 0 and c != 98:
                row.append(1)
            else:
                row.append(0)
        giant_100x100_maze.append(row)
        
    # 강제로 길 뚫기 (출발지: 1,1 -> 도착지: 98,98)
    for k in range(1, 99):
        giant_100x100_maze[k][50] = 0
        giant_100x100_maze[50][k] = 0
    giant_100x100_maze[1][1] = 0
    giant_100x100_maze[98][98] = 0

    # 시스템 인자로 입력값이 주어지면 경로 조작 취약점 트리거
    if len(sys.argv) > 1:
        custom_filename = sys.argv[1]
        logger.log_info(f"Custom file arg detected: {custom_filename}")
        loaded = solver.read_maze_config_file(custom_filename)
        if loaded:
            giant_100x100_maze = loaded

    # 1. 그래프 빌드
    graph = solver.build_graph(giant_100x100_maze, (1, 1), (98, 98))
    
    # 2. 다익스트라 실행 (엄청난 시간 소요 예상)
    start_time = time.time()
    path = solver.solve_dijkstra_inefficient(graph)
    elapsed = int((time.time() - start_time) * 1000)
    
    # 3. 리포트 생성
    report = solver.generate_report(path, "DIJKSTRA")
    print(report[:250] + "\n...[TRUNCATED TO SAVE SPACE]...\n")

    # 4. SQL 인젝션 시뮬레이션
    # 일반적인 유저네임 대신 악의적인 SQL 페이로드 주입
    malicious_username = "hacker'; DROP TABLE maze_execution_logs; --"
    solver.log_result_sql_injection(malicious_username, elapsed, "SUCCESS")

    # 5. OS 커맨드 인젝션 시뮬레이션
    # 사용자 정의 훅 명령어에 악성 쉘 명령어 주입
    malicious_hook = "echo 'Maze Solved' && cat /etc/passwd"
    solver.run_post_analysis_hook(malicious_hook)

    logger.log_info("Application Terminated.")

if __name__ == "__main__":
    main()