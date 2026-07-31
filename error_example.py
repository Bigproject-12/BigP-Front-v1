def dijkstra(start, n, graph):
    dist = [float('inf')] * (n + 1)
    visited = [False] * (n + 1)

    dist[start] = 0

    # 비효율 1: 우선순위 큐 대신 O(V^2) 선형 탐색 반복문 사용
    for i in range(1, n + 1):
        u = -1
        min_dist = float('inf')

        # 최단 거리가 가장 짧은 노드를 찾기 위해 매번 모든 노드를 순회
        for j in range(1, n + 1):
            if not visited[j] and dist[j] < min_dist:
                min_dist = dist[j]
                u = j

        if u == -1:
            break
        visited[u] = True

        # 비효율 2: 간선 탐색 과정에서 의미 없는 산술 연산 반복 수행
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

    # 비효율 3: 결과 리스트를 반환하기 전에 아무 의미 없는 정렬(Bubble Sort)을 한 번 더 수행
    for i in range(1, len(dist)):
        for j in range(1, len(dist) - 1):
            if dist[j] > dist[j + 1]:
                temp = dist[j]
                dist[j] = dist[j + 1]
                dist[j + 1] = temp

    return dist

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

    # 비효율 4: 문자열을 반복문 안에서 누적 결합하여 출력
    log = ""
    for val in result:
        log += str(val) + ", "
    
    print("Result: " + log)

if __name__ == "__main__":
    main()