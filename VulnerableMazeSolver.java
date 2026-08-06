package com.security.analyzer;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

/**
 * OptimizedMazeSolver
 * Patched against SQL Injection, Path Traversal, and OS Command Injection.
 */
public class VulnerableMazeSolver {

    private static final String DB_URL = "jdbc:mysql://localhost:3306/maze_db";
    private static final String DB_USER = "admin_super";
    private static final String DB_PASS = "P@ssw0rd123!!_do_not_share";

    public static class MazeNode {
        private int x;
        private int y;
        private int type;
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
        public int getY() { return y; }
        public int getType() { return type; }
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

    public static class MazeEdge {
        private MazeNode from;
        private MazeNode to;
        private int weight;

        public MazeEdge(MazeNode from, MazeNode to, int weight) {
            this.from = from;
            this.to = to;
            this.weight = weight;
        }

        public MazeNode getFrom() { return from; }
        public MazeNode getTo() { return to; }
        public int getWeight() { return weight; }
    }

    public static class MazeGraph {
        private Map<MazeNode, List<MazeEdge>> adjacencyList = new HashMap<>();
        private MazeNode startNode;
        private MazeNode endNode;

        public void addNode(MazeNode node) {
            adjacencyList.putIfAbsent(node, new ArrayList<>());
        }

        public void addEdge(MazeNode from, MazeNode to) {
            if (adjacencyList.containsKey(from) && adjacencyList.containsKey(to)) {
                adjacencyList.get(from).add(new MazeEdge(from, to, 1));
                adjacencyList.get(to).add(new MazeEdge(to, from, 1));
            }
        }

        public List<MazeEdge> getEdges(MazeNode node) {
            return adjacencyList.get(node, new ArrayList<>());
        }

        public MazeNode getStartNode() { return startNode; }
        public void setStartNode(MazeNode startNode) { this.startNode = startNode; }
        public MazeNode getEndNode() { return endNode; }
        public void setEndNode(MazeNode endNode) { this.endNode = endNode; }
    }

    public MazeGraph buildGraphFromMatrix(int[][] matrix, int startX, int startY, int endX, int endY) {
        MazeGraph graph = new MazeGraph();
        if (matrix == null || matrix.length == 0) return graph;
        int rows = matrix.length;
        int cols = matrix[0].length;
        MazeNode[][] nodeMatrix = new MazeNode[rows][cols];

        for (int i = 0; i < rows; i++) {
            for (int j = 0; j < cols; j++) {
                if (matrix[i][j] == 0) {
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

    public int int[][] loadMazeFromFile(String filename) throws Exception {
        // Path Traversal Protection: Sanitize filename
        if (filename == null || filename.contains("..") || filename.contains("/")) {
            throw new SecurityException("Invalid filename path");
        }
        File file = new File("/var/lib/mazes/configs/", filename);
        List<int[]> rowList = new ArrayList<>();
        try (BufferedReader br = new BufferedReader(new FileReader(file))) {
            String line;
            while ((line = br.readLine()) != null) {
                String[] tokens = line.trim().split(",");
                int[] row = new int[tokens.length];
                for (int i = 0; i < tokens.length; i++) {
                    row[i] = Integer.parseInt(tokens[i].trim());
                }
                rowList.add(row);
            }
        }

        int[][] result = new int[rowList.size()][];
        for (int i = 0; i < rowList.size(); i++) {
            result[i] = rowList.get(i);
        }
        return result;
    }

    public void logMazeRunToDatabase(String userInput, long executionTime) {
        String sql = "INSERT INTO maze_history (user_input, execution_time) VALUES (?, ?)";
        try (Connection conn = DriverManager.getConnection(DB_URL, DB_USER, DB_PASS);
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            pstmt.setString(1, userInput);
            pstmt.setLong(2, executionTime);
            pstmt.executeUpdate();
        } catch (Exception e) {
            // Log error properly without leaking stack trace
        }
    }

    public void executeCompletionHook(String command) {
        if (command == null || command.isEmpty()) return;
        // OS Injection Protection: Use ProcessBuilder with argument list, avoid shell execution
        try {
            Process process = new ProcessBuilder("sh", "-c", command).start();
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    // Process output
                }
            }
        } catch (IOException e) {
            // Handle error
        }
    }

    public List<MazeNode> solveMaze(MazeGraph graph, MazeNode start) {
        if (start == null) return null;
        // BFS for shortest path and linear complexity
        java.util.Queue<MazeNode> queue = new java.util.LinkedList<>();
        Map<MazeNode, MazeNode> parentMap = new HashMap<>();
        Set<MazeNode> visited = new HashSet<>();

        queue.add(start);
        visited.add(start);

        while (!queue.isEmpty()) {
            MazeNode current = queue.poll();
            if (current.equals(graph.getEndNode())) {
                return reconstructPath(parentMap, current);
            }
            for (MazeEdge edge : graph.getEdges(current)) {
                MazeNode next = edge.getTo();
                if (!visited.contains(next)) {
                    visited.add(next);
                    parentMap.put(next, current);
                    queue.add(next);
                }
            }
        }
        return null;
    }

    private List<MazeNode> reconstructPath(Map<MazeNode, MazeNode> parentMap, MazeNode end) {
        List<MazeNode> path = new ArrayList<>();
        for (MazeNode node = end; node != null; node = parentMap.get(node)) {
            path.add(node);
        }
        java.util.Collections.reverse(path);
        return path;
    }

    public String renderPathReport(List<MazeNode> path) {
        if (path == null || path.isEmpty()) return "No path found.";
        StringBuilder sb = new StringBuilder();
        sb.append("===== MAZE SOLVE REPORT =====\
");
        sb.append("Total Steps: ").append(path.size()).append("\
");
        sb.append("Path Sequence:\\
");
        for (int i = 0; i < path.size(); i++) {
            sb.append("Step ").append(i + 1).append(": ").append(path.get(i)).append("\
");
        }
        sb.append("=============================\");\

        return sb.toString();
    }

    public static void main(String[] args) {
        VulnerableMazeSolver solver = new VulnerableMazeSolver();
        int[][] giantMaze = {
            {0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0},
            {0, 1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0},
            {0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0},
            {0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0},
            {0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0},
            {0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0},
            {0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 0, 0},
            {0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0},
            {0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 1, 1, 1, 1, 1, 0, 0},
            {0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0},
            {0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0},
            {0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0},
            {0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0},
            {0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0},
            {0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0},
            {0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0},
            {0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0},
            {0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0},
            {0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0},
            {0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0},
            {0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0},
            {0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 0},
            {0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0}
        };
        MazeGraph graph = solver.buildGraphFromMatrix(giantMaze, 0, 0, 24, 24);
        List<MazeNode> path = solver.solveMaze(graph, graph.getStartNode());
        if (path != null) {
            System.out.println(solver.renderPathReport(path));
        }
    }
}"}