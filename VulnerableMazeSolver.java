package com.security.analyzer;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * VulnerableMazeSolver
 * 
 * 본 클래스는 의도적으로 다수의 보안 취약점과 비효율적인 알고리즘 로직을 포함하고 있습니다.
 * 코드 분석 도구(SAST) 및 성능 프로파일링 도구를 테스트하기 위한 목적으로 작성되었습니다.
 */
public class VulnerableMazeSolver {

    // [보안 취약점 1] 하드코딩된 자격 증명 (Hardcoded Credentials)
    // 소스 코드 내에 데이터베이스 접속 정보가 평문으로 노출되어 있습니다.
    private static final String DB_URL = "jdbc:mysql://localhost:3306/maze_db";
    private static final String DB_USER = "admin_super";
    private static final String DB_PASS = "P@ssw0rd123!!_do_not_share";

    /**
     * 그래프의 정점을 표현하는 Node 클래스
     * (분량을 늘리고 객체 지향적 복잡도를 높이기 위해 별도 클래스로 분리)
     */
    public static class MazeNode {
        private int x;
        private int y;
        private int type; // 0: 길, 1: 벽
        private String description;
        private boolean isStart;
        private boolean isEnd;

        public MazeNode(int x, int y, int type) {
            this.x = x;
            this.y = y;
            this.type = type;
            this.description = "Node at [" + x + "," + y + "]";
        }

        public int getX() { return x; }
        public void setX(int x) { this.x = x; }

        public int getY() { return y; }
        public void setY(int y) { this.y = y; }

        public int getType() { return type; }
        public void setType(int type) { this.type = type; }

        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }

        public boolean isStart() { return isStart; }
        public void setStart(boolean start) { isStart = start; }

        public boolean isEnd() { return isEnd; }
        public void setEnd(boolean end) { isEnd = end; }

        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (o == null || getClass() != o.getClass()) return false;
            MazeNode mazeNode = (MazeNode) o;
            return x == mazeNode.x && y == mazeNode.y;
        }

        @Override
        public int hashCode() {
            return Objects.hash(x, y);
        }

        @Override
        public String toString() {
            return "(" + x + ", " + y + ")";
        }
    }

    /**
     * 그래프의 간선을 표현하는 Edge 클래스
     */
    public static class MazeEdge {
        private MazeNode from;
        private MazeNode to;
        private int weight; // 기본적으로 1로 설정

        public MazeEdge(MazeNode from, MazeNode to, int weight) {
            this.from = from;
            this.to = to;
            this.weight = weight;
        }

        public MazeNode getFrom() { return from; }
        public void setFrom(MazeNode from) { this.from = from; }

        public MazeNode getTo() { return to; }
        public void setTo(MazeNode to) { this.to = to; }

        public int getWeight() { return weight; }
        public void setWeight(int weight) { this.weight = weight; }
    }

    /**
     * 미로를 인접 리스트(Adjacency List) 형태의 그래프로 변환하여 관리하는 클래스
     */
    public static class MazeGraph {
        private Map<MazeNode, List<MazeEdge>> adjacencyList;
        private MazeNode startNode;
        private MazeNode endNode;

        public MazeGraph() {
            this.adjacencyList = new HashMap<>();
        }

        public void addNode(MazeNode node) {
            adjacencyList.putIfAbsent(node, new ArrayList<>());
        }

        public void addEdge(MazeNode from, MazeNode to) {
            adjacencyList.get(from).add(new MazeEdge(from, to, 1));
            adjacencyList.get(to).add(new MazeEdge(to, from, 1));
        }

        public List<MazeEdge> getEdges(MazeNode node) {
            return adjacencyList.get(node);
        }

        public MazeNode getStartNode() { return startNode; }
        public void setStartNode(MazeNode startNode) { this.startNode = startNode; }

        public MazeNode getEndNode() { return endNode; }
        public void setEndNode(MazeNode endNode) { this.endNode = endNode; }

        public Map<MazeNode, List<MazeEdge>> getAdjacencyList() {
            return adjacencyList;
        }
    }

    /**
     * 미로 행렬을 그래프 객체로 파싱하는 유틸리티 메서드
     */
    public MazeGraph buildGraphFromMatrix(int[][] matrix, int startX, int startY, int endX, int endY) {
        MazeGraph graph = new MazeGraph();
        int rows = matrix.length;
        int cols = matrix[0].length;
        MazeNode[][] nodeMatrix = new MazeNode[rows][cols];

        // 정점(Node) 생성
        for (int i = 0; i < rows; i++) {
            for (int j = 0; j < cols; j++) {
                if (matrix[i][j] == 0) { // 길이 존재하는 경우만 정점으로 추가
                    MazeNode node = new MazeNode(i, j, 0);
                    if (i == startX && j == startY) {
                        node.setStart(true);
                        graph.setStartNode(node);
                    }
                    if (i == endX && j == endY) {
                        node.setEnd(true);
                        graph.setEndNode(node);
                    }
                    nodeMatrix[i][j] = node;
                    graph.addNode(node);
                }
            }
        }

        // 간선(Edge) 생성
        int[][] directions = {{-1, 0}, {1, 0}, {0, -1}, {0, 1}};
        for (int i = 0; i < rows; i++) {
            for (int j = 0; j < cols; j++) {
                if (nodeMatrix[i][j] != null) {
                    for (int[] dir : directions) {
                        int ni = i + dir[0];
                        int nj = j + dir[1];
                        if (ni >= 0 && ni < rows && nj >= 0 && nj < cols && nodeMatrix[ni][nj] != null) {
                            graph.addEdge(nodeMatrix[i][j], nodeMatrix[ni][nj]);
                        }
                    }
                }
            }
        }
        return graph;
    }

    /**
     * [보안 취약점 2] 경로 조작 (Path Traversal / LFI)
     * 외부에서 입력받은 파일 이름을 검증 없이 직접 파일 경로로 사용합니다.
     * "../" 등을 이용해 서버의 민감한 파일(예: /etc/passwd)을 읽을 위험이 있습니다.
     */
    public int[][] loadMazeFromFile(String filename) throws Exception {
        // 검증 없는 입력값 사용
        File file = new File("/var/lib/mazes/configs/" + filename);
        BufferedReader br = new BufferedReader(new FileReader(file));
        
        List<int[]> rowList = new ArrayList<>();
        String line;
        while ((line = br.readLine()) != null) {
            String[] tokens = line.trim().split(",");
            int[] row = new int[tokens.length];
            for (int i = 0; i < tokens.length; i++) {
                row[i] = Integer.parseInt(tokens[i].trim());
            }
            rowList.add(row);
        }
        br.close();

        int[][] result = new int[rowList.size()][];
        for (int i = 0; i < rowList.size(); i++) {
            result[i] = rowList.get(i);
        }
        return result;
    }

    /**
     * [보안 취약점 3] SQL 인젝션 (SQL Injection)
     * 파라미터 바인딩(PreparedStatement)을 사용하지 않고 문자열 결합을 이용해 쿼리를 생성합니다.
     * userInput에 악의적인 SQL 구문이 포함될 경우 데이터베이스가 조작될 수 있습니다.
     */
    public void logMazeRunToDatabase(String userInput, long executionTime) {
        try {
            Connection conn = DriverManager.getConnection(DB_URL, DB_USER, DB_PASS);
            Statement stmt = conn.createStatement();
            
            // 검증되지 않은 사용자의 입력을 SQL 쿼리에 그대로 삽입
            String query = "INSERT INTO maze_history (user_input, execution_time_ms) VALUES ('" 
                         + userInput + "', " + executionTime + ")";
            
            stmt.executeUpdate(query);
            stmt.close();
            conn.close();
        } catch (Exception e) {
            // 운영 환경에서는 에러 스택을 그대로 노출하는 것도 정보 유출 취약점(Information Leak)에 해당합니다.
            e.printStackTrace();
        }
    }

    /**
     * [보안 취약점 4] OS 명령어 삽입 (OS Command Injection)
     * 미로 찾기 완료 후 특정 시스템 훅(스크립트)을 실행할 때, 입력값을 검증하지 않습니다.
     * "script.sh; rm -rf /" 와 같은 악의적인 명령어가 주입될 수 있습니다.
     */
    public void executeCompletionHook(String hookCommand) {
        if (hookCommand != null && !hookCommand.isEmpty()) {
            try {
                String os = System.getProperty("os.name").toLowerCase();
                Process process;
                if (os.contains("win")) {
                    process = Runtime.getRuntime().exec("cmd.exe /c " + hookCommand);
                } else {
                    process = Runtime.getRuntime().exec(new String[]{"sh", "-c", hookCommand});
                }
                
                BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()));
                String line;
                while ((line = reader.readLine()) != null) {
                    System.out.println("Hook Output: " + line);
                }
            } catch (IOException e) {
                e.printStackTrace();
            }
        }
    }

    /**
     * [효율성 이슈 1] 비효율적인 깊이 우선 탐색 (Inefficient DFS) & 메모리 누수
     * 1. 2D boolean 배열 대신 ArrayList.contains()를 사용하여 방문 여부를 확인 (O(N) 조회 시간 발생)
     * 2. 매 재귀 호출마다 경로(List)를 전체 복제(Clone)하여 메모리 낭비와 가비지 컬렉션(GC) 부하를 극대화함.
     * 3. 시간 복잡도가 심각하게 팽창하여 깊은 미로에서 StackOverflowError 혹은 OutOfMemoryError 유발 가능성.
     */
    public List<MazeNode> solveInefficientDFS(MazeGraph graph, MazeNode current, List<MazeNode> currentPath) {
        // [비효율성] 방문 여부를 List.contains() 로 검사하여 시간 복잡도 악화
        if (currentPath.contains(current)) {
            return null;
        }

        // [비효율성] 재귀가 깊어질 때마다 객체를 새로 생성하고 복사함
        List<MazeNode> newPath = new ArrayList<>(currentPath);
        newPath.add(current);

        if (current.equals(graph.getEndNode())) {
            return newPath;
        }

        List<MazeEdge> edges = graph.getEdges(current);
        if (edges != null) {
            for (MazeEdge edge : edges) {
                MazeNode nextNode = edge.getTo();
                List<MazeNode> result = solveInefficientDFS(graph, nextNode, newPath);
                if (result != null) {
                    return result;
                }
            }
        }
        return null;
    }

    /**
     * [효율성 이슈 2] 루프 내 무분별한 문자열 결합 (String Concatenation in Loops)
     * StringBuilder를 사용하지 않고 += 연산자로 문자열을 이어 붙여 매 루프마다 새로운 String 객체를 생성합니다.
     */
    public String renderPathReport(List<MazeNode> path) {
        if (path == null) return "No path found.";
        
        String report = "===== MAZE SOLVE REPORT =====\n";
        report += "Total Steps: " + path.size() + "\n";
        report += "Path Sequence:\n";
        
        // [비효율성] 반복문 안에서 String += 연산 (메모리 낭비 심각)
        for (int i = 0; i < path.size(); i++) {
            report += "Step " + (i + 1) + ": " + path.get(i).toString() + "\n";
        }
        
        report += "=============================\n";
        return report;
    }

    // -------------------------------------------------------------------------
    // Main 메서드 및 방대한 더미 미로 데이터 (라인 수 및 복잡도 증가 목적)
    // -------------------------------------------------------------------------
    public static void main(String[] args) {
        VulnerableMazeSolver solver = new VulnerableMazeSolver();
        
        // 25x25 크기의 방대한 더미 미로 데이터 하드코딩
        int[][] giantMaze = {
            {0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0},
            {0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0},
            {0, 0, 0, 1, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0},
            {1, 1, 0, 1, 0, 1, 1, 1, 1, 0, 0, 0, 1, 0, 1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1},
            {0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0},
            {0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0},
            {0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0},
            {1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 0},
            {0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0},
            {0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 0, 1, 0},
            {0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0},
            {0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0},
            {0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0},
            {0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1},
            {0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0},
            {1, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0},
            {0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0},
            {0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1, 0},
            {0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1, 0},
            {0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0},
            {0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0},
            {0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0},
            {0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0, 0, 1, 0},
            {1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0},
            {0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0}
        };

        try {
            // [취약점 시뮬레이션] 커맨드 라인 인자가 있으면 임의의 파일을 읽어오는 로직 실행
            if (args.length > 0) {
                System.out.println("Attempting to load maze from external file: " + args[0]);
                int[][] loadedMaze = solver.loadMazeFromFile(args[0]);
                System.out.println("Maze loaded via Path Traversal vulnerable method.");
            }
        } catch (Exception e) {
            System.out.println("Failed to load custom maze. Using default massive maze.");
        }

        System.out.println("Building Graph from Matrix...");
        // 출발점 (0,0), 도착점 (24,24)
        MazeGraph graph = solver.buildGraphFromMatrix(giantMaze, 0, 0, 24, 24);
        
        System.out.println("Solving Maze using deeply inefficient DFS...");
        long startTime = System.currentTimeMillis();
        
        List<MazeNode> startPath = new ArrayList<>();
        List<MazeNode> solvedPath = solver.solveInefficientDFS(graph, graph.getStartNode(), startPath);
        
        long endTime = System.currentTimeMillis();
        long duration = endTime - startTime;
        
        System.out.println("Solve process finished in " + duration + " ms.");

        if (solvedPath != null) {
            // 비효율적인 문자열 결합을 사용하는 메서드 호출
            String finalReport = solver.renderPathReport(solvedPath);
            System.out.println(finalReport);
        } else {
            System.out.println("No valid path found from Start to End.");
        }

        // [취약점 시뮬레이션] SQL 인젝션 발생 가능한 메서드 호출
        String dummyUserInput = "Player1'; DROP TABLE maze_history; --";
        System.out.println("Logging result to DB with unsafe input...");
        solver.logMazeRunToDatabase(dummyUserInput, duration);

        // [취약점 시뮬레이션] 명령어 삽입 발생 가능한 후킹 로직 호출
        // 개발자가 의도한 건 "echo finished" 였으나, 입력값을 검증하지 않아 악용 가능함
        String hookInput = "echo 'Solved' && id && whoami"; 
        System.out.println("Executing post-solve system hook...");
        solver.executeCompletionHook(hookInput);
        
        System.out.println("Execution Completed.");
    }
}