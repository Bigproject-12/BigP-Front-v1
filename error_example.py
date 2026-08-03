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


if __name__ == "__main__":
    main()