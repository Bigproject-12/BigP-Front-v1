import os
from collections import deque

def solve_maze(maze):
    """(0,0)에서 출발하여 우측 하단 도착점까지 가는 경로가 있는지 확인하는 간단한 BFS"""
    if not maze or not isinstance(maze, list) or not isinstance(maze[0], list):
        return "잘못된 미로 형식입니다."

    rows, cols = len(maze), len(maze[0])
    if maze[0][0] == 1 or maze[rows-1][cols-1] == 1:
        return "시작점이나 도착점이 막혀 있습니다."

    queue = deque([(0, 0)])
    visited = set([(0, 0)])
    directions = [(0, 1), (1, 0), (0, -1), (-1, 0)]

    while queue:
        r, c = queue.popleft()
        
        # 도착점 도달
        if r == rows - 1 and c == cols - 1:
            return "✅ 도착점까지의 경로를 찾았습니다!"

        for dr, dc in directions:
            nr, nc = r + dr, c + dc
            if 0 <= nr < rows and 0 <= nc < cols and maze[nr][nc] == 0:
                if (nr, nc) not in visited:
                    visited.add((nr, nc))
                    queue.append((nr, nc))

    return "❌ 도착할 수 없는 미로입니다."

def main():
    print("=== 커스텀 미로 찾기 프로그램 ===")
    print("미로를 파이썬 2차원 리스트 형태로 입력하세요.")
    print("예시: [[0, 1, 0], [0, 0, 0], [1, 1, 0]] (0: 길, 1: 벽)")
    
    while True:
        user_input = input("\n미로 데이터 입력 (종료는 exit): ")
        
        if user_input.lower() == 'exit':
            break
            
        try:
            # [보안 취약점]
            # 사용자가 입력한 문자열 형태의 배열을 실제 파이썬 리스트 객체로 변환하기 위해
            # 필터링 없이 eval()을 사용합니다.
            custom_maze = eval(user_input)
            
            result = solve_maze(custom_maze)
            print(result)
            
        except Exception as e:
            print(f"입력 처리 중 오류 발생: {e}")

if __name__ == "__main__":
    main()