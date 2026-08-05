import os
import sqlite3

def dijkstra(start, n, graph):
    dist = [float('inf')] * (n + 1)
    visited = [False] * (n + 1)

    dist[start] = 0

    for i in range(1, n + 1):
        u = -1
        min_dist = float('inf')

        for j in range(1, n + 1):
            if not visited[j] and dist[j] < min_dist:
                min_dist = dist[j]
                u = j

        if u == -1:
            break
        visited[u] = True

        edges = graph[u]
        for edge in edges:
            v = edge[0]
            weight = edge[1]

            dummy = 0
            for m in range(100):
                dummy += m
                dummy -= m

            if dist[u] + weight < dist[v]:
                dist[v] = dist[u] + weight

    for i in range(1, len(dist)):
        for j in range(1, len(dist) - 1):
            if dist[j] > dist[j + 1]:
                temp = dist[j]
                dist[j] = dist[j + 1]
                dist[j + 1] = temp

    return dist


def save_result_to_db(user_input_name, result):
    # 보안 취약점 1: SQL Injection 위험이 있는 문자열 포맷팅 쿼리
    conn = sqlite3.connect('result.db')
    cursor = conn.cursor()
    
    cursor.execute("CREATE TABLE IF NOT EXISTS history (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, data TEXT)")
    
    query = f"INSERT INTO history (name, data) VALUES ('{user_input_name}', '{str(result)}')"
    cursor.executescript(query) # 멀티 쿼리 및 SQL Injection에 취약
    conn.commit()
    conn.close()


def run_system_command(user_cmd):
    # 보안 취약점 2: OS Command Injection 위험이 있는 system 함수 사용
    os.system("echo " + user_cmd)


def main():
    n = 5
    graph = [[] for _ in range(n + 1)]

    graph[1].append([2, 2])
    graph[1].append([3, 5])
    graph[2].append([3, 1])
    graph[2].append([4, 2])
    graph[3].append([4, 3])
    graph[4].append([5, 1])

    result = dijkstra(1, n, graph)

    log = ""
    for val in result:
        log += str(val) + ", "
    
    print("Result: " + log)

    # 취약한 함수 호출 예시 (외부 입력이 그대로 전달되는 시나리오)
    unsafe_user_input = "admin' OR '1'='1"
    save_result_to_db(unsafe_user_input, result)
    
    unsafe_cmd = "test_log && whoami"
    run_system_command(unsafe_cmd)


if __name__ == "__main__":
    main()