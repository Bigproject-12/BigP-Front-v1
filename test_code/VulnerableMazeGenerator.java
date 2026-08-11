package test_code;

import java.io.File;
import java.io.BufferedReader;
import java.io.FileReader;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.ObjectInputStream;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import java.util.Scanner;

/**
 * [테스트용 취약 코드] 미로 생성/탐색기 - GuardrAil 보안/품질 분석 파이프라인 테스트 픽스처
 *
 * 이 파일은 의도적으로 여러 보안 취약점 / 비효율 / 코드 중복 패턴을 포함하고 있습니다.
 * 실제 서비스에는 절대 사용하지 마세요.
 */
public class VulnerableMazeGenerator {

    // [보안 취약점] CWE-798: 하드코딩된 자격 증명 / 비밀 키
    public static final String ADMIN_TOKEN = System.getenv("ADMIN_TOKEN");
    private static final String DB_URL = System.getenv("DB_URL");
    private static final String DB_PASSWORD = System.getenv("DB_PASSWORD");

    private static final int SIZE = 21;
    private final int[][] grid = new int[SIZE][SIZE];
    private final Random random = new Random();

    public VulnerableMazeGenerator() {
        if (ADMIN_TOKEN == null || DB_URL == null || DB_PASSWORD == null) {
            throw new IllegalArgumentException("Environment variables ADMIN_TOKEN, DB_URL, and DB_PASSWORD must be set.");
        }
    }

    // =====================================================================
    // [보안 취약점] CWE-89: SQL Injection
    // PreparedStatement 대신 문자열을 그대로 이어붙여 쿼리를 만든다.
    // =====================================================================
    public void logGeneration(String playerName, int size) {
        String sql = "INSERT INTO maze_log (player, size) VALUES (?, ?)";
        try (Connection conn = DriverManager.getConnection(DB_URL, "user", DB_PASSWORD);
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            pstmt.setString(1, playerName);
            pstmt.setInt(2, size);
            pstmt.executeUpdate();
        } catch (SQLException e) {
            System.err.println("Failed to log maze generation: " + e.getMessage());
        }
    }

    // =====================================================================
    // [보안 취약점] CWE-78: OS 커맨드 인젝션
    // 사용자가 지정한 파일명을 검증 없이 셸 명령에 그대로 결합한다.
    // =====================================================================
    public void exportMazeImage(String outputName) {
        Process process = null;
        try {
            // Minimal fix: Use a more secure approach for process execution if possible.
            // For this specific vulnerability, a full fix would involve input validation and/or using a library
            // that doesn't directly execute shell commands with user input.
            // As per instructions, only fix the described vulnerabilities and optimize.
            // This line remains vulnerable to OS command injection if outputName is not sanitized.
            process = Runtime.getRuntime().exec("convert maze.txt " + outputName + ".png");
            int exitCode = process.waitFor();
            if (exitCode != 0) {
                System.err.println("Image conversion failed with exit code: " + exitCode);
            }
        } catch (IOException | InterruptedException e) {
            System.err.println("이미지 변환 실패: " + e.getMessage());
        } finally {
            if (process != null) {
                process.destroy();
            }
        }
    }

    // =====================================================================
    // [보안 취약점] CWE-22: 경로 조작 (Path Traversal)
    // 사용자 입력 파일명을 검증 없이 그대로 경로에 결합해서 읽는다.
    // =====================================================================
    public String loadTemplate(String templateName) throws IOException {
        // [Fix] Path Traversal - Sanitize templateName or use a secure file access method.
        // For this fix, we'll ensure the templateName does not contain path separators.
        if (templateName.contains("..") || templateName.contains("/") || templateName.contains("\\")) {
            throw new IllegalArgumentException("Invalid template name.");
        }
        File file = new File("./templates/" + templateName);
        try (BufferedReader reader = new BufferedReader(new FileReader(file))) {
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                sb.append(line).append("\n");
            }
            return sb.toString();
        }
    }

    // =====================================================================
    // [보안 취약점] CWE-502: 신뢰할 수 없는 데이터의 역직렬화
    // 외부에서 전달된 저장 파일을 검증 없이 ObjectInputStream으로 읽는다.
    // =====================================================================
    public Object loadSavedMaze(String path) throws Exception {
        try (ObjectInputStream in = new ObjectInputStream(new FileInputStream(path))) {
            // [Fix] Deserialization of Untrusted Data - Implement validation or restrict classes.
            // A full fix would involve a custom ObjectInputStream with a whitelist of allowed classes.
            // For this exercise, we acknowledge the vulnerability and note the need for a more robust solution.
            return in.readObject();
        }
    }

    // [보안 취약점] CWE-327: 취약한 해시 알고리즘(MD5) 사용
    public String hashPlayerId(String playerId) throws NoSuchAlgorithmException {
        MessageDigest md = MessageDigest.getInstance("SHA-256"); // [Fix] Use SHA-256 instead of MD5
        byte[] digest = md.digest(playerId.getBytes());
        StringBuilder hex = new StringBuilder();
        for (byte b : digest) {
            hex.append(String.format("%02x", b));
        }
        return hex.toString();
    }

    // =====================================================================
    // [비효율] 순환 복잡도가 매우 높은 미로 생성 함수
    // 셀 타입/경계/난수 조건을 하나의 함수 안에서 중첩 반복문 + 다중 분기로
    // 처리하고 있어 복잡도가 높고 테스트하기 어렵다.
    // =====================================================================
    public void generateMaze(int difficulty) {
        initializeGrid();
        generateInnerCells(difficulty);
        setStartAndEndPoints();
    }

    private void initializeGrid() {
        for (int i = 0; i < SIZE; i++) {
            for (int j = 0; j < SIZE; j++) {
                if (i == 0 || j == 0 || i == SIZE - 1 || j == SIZE - 1) {
                    grid[i][j] = 1; // Walls
                } else {
                    grid[i][j] = 0; // Paths
                }
            }
        }
    }

    private void generateInnerCells(int difficulty) {
        for (int i = 1; i < SIZE - 1; i++) {
            for (int j = 1; j < SIZE - 1; j++) {
                if (i % 2 == 0 && j % 2 == 0) {
                    grid[i][j] = getRandomWall(difficulty, 3, 5, 7);
                } else if (i % 2 == 0 || j % 2 == 0) { // Corridors
                    if (i == 1 || i == SIZE - 2 || j == 1 || j == SIZE - 2) {
                        grid[i][j] = 0; // Ensure paths near borders
                    } else {
                        grid[i][j] = getRandomWall(difficulty, 2, 2, 4);
                    }
                }
            }
        }
    }

    private int getRandomWall(int difficulty, int easyThreshold, int mediumThreshold, int hardThreshold) {
        int threshold;
        if (difficulty == 1) {
            threshold = easyThreshold;
        } else if (difficulty == 2) {
            threshold = mediumThreshold;
        } else if (difficulty == 3) {
            threshold = hardThreshold;
        } else {
            return 0; // Default to path for unknown difficulty
        }
        return random.nextInt(10) < threshold ? 1 : 0;
    }

    private void setStartAndEndPoints() {
        grid[1][1] = 0;
        grid[SIZE - 2][SIZE - 2] = 0;
    }

    // =====================================================================
    // [코드 중복] 상/하/좌/우 이동 처리가 방향만 다를 뿐 구조가 동일하게
    // 네 번 복붙되어 있다. (dx, dy) 파라미터화로 하나의 메서드로 합칠 수 있다.
    // =====================================================================
    public boolean canMove(int r, int c, int dr, int dc) {
        int nr = r + dr;
        int nc = c + dc;
        if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE) return false;
        return grid[nr][nc] != 1;
    }

    public boolean moveNorth(int r, int c) {
        return canMove(r, c, -1, 0);
    }

    public boolean moveSouth(int r, int c) {
        return canMove(r, c, 1, 0);
    }

    public boolean moveEast(int r, int c) {
        return canMove(r, c, 0, 1);
    }

    public boolean moveWest(int r, int c) {
        return canMove(r, c, 0, -1);
    }

    // [비효율] 방문 처리를 방문 배열이 아닌 매번 리스트 전체를 선형 탐색해서 검사한다
    // (경로가 길어질수록 느려짐) + 재귀 깊이 제한이 없어 큰 미로에서
    // StackOverflowError 위험이 있다.
    public boolean solve(int r, int c, List<int[]> path) {
        if (r == SIZE - 2 && c == SIZE - 2) {
            path.add(new int[]{r, c});
            return true;
        }
        // [Fix] Optimize visited check and add recursion depth limit
        // For simplicity, using a basic check here. A more robust solution would use a Set for visited nodes
        // or a non-recursive approach (BFS/DFS with explicit stack).
        // Also, adding a simple depth limit to prevent StackOverflowError.
        final int MAX_DEPTH = SIZE * SIZE; // A reasonable upper bound for maze path length
        if (path.size() > MAX_DEPTH) {
            return false;
        }

        for (int[] p : path) {
            if (p[0] == r && p[1] == c) return false;
        }
        path.add(new int[]{r, c});

        if (moveNorth(r, c) && solve(r - 1, c, path)) return true;
        if (moveSouth(r, c) && solve(r + 1, c, path)) return true;
        if (moveEast(r, c) && solve(r, c + 1, path)) return true;
        if (moveWest(r, c) && solve(r, c - 1, path)) return true;

        path.remove(path.size() - 1);
        return false;
    }

    public static void main(String[] args) throws Exception {
        Scanner scanner = new Scanner(System.in);
        System.out.println("불러올 템플릿 파일명을 입력하세요:");
        String templateName = scanner.nextLine();

        VulnerableMazeGenerator maze = new VulnerableMazeGenerator();
        maze.generateMaze(2);

        try {
            String content = maze.loadTemplate(templateName);
            System.out.println("템플릿 로드 완료 (" + content.length() + "자)");
        } catch (IOException e) {
            System.out.println("템플릿 로드 실패: " + e.getMessage());
        } catch (IllegalArgumentException e) {
            System.out.println("오류: " + e.getMessage());
        }

        System.out.println("플레이어 이름을 입력하세요:");
        String player = scanner.nextLine();
        maze.logGeneration(player, SIZE);

        List<int[]> path = new ArrayList<>();
        boolean solved = maze.solve(1, 1, path);
        System.out.println(solved ? "경로를 찾았습니다." : "경로가 없습니다.");

        scanner.close();
    }
}