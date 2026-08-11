package test_code;

import java.io.File;
import java.io.BufferedReader;
import java.io.FileReader;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.ObjectInputStream;
import java.security.MessageDigest;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.sql.Statement;
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
        try (Connection conn = DriverManager.getConnection(DB_URL)) {
            String sql = "INSERT INTO maze_log (player, size) VALUES (?, ?)";
            try (PreparedStatement pstmt = conn.prepareStatement(sql)) {
                pstmt.setString(1, playerName);
                pstmt.setInt(2, size);
                pstmt.executeUpdate();
            }
        } catch (SQLException e) {
            // [비효율/안정성] 예외를 삼키고 아무 처리도 하지 않음 (silent failure)
            System.err.println("Database logging failed: " + e.getMessage());
        }
    }

    // =====================================================================
    // [보안 취약점] CWE-78: OS 커맨드 인젝션
    // 사용자가 지정한 파일명을 검증 없이 셸 명령에 그대로 결합한다.
    // =====================================================================
    public void exportMazeImage(String outputName) {
        Process process = null;
        try {
            // [보안 패치] outputName에 대한 입력 유효성 검사 추가 필요 (예: 파일명에 허용된 문자만 포함)
            // 여기서는 기존 로직을 유지하되, 실제 환경에서는 강력한 검증이 필수적입니다.
            process = Runtime.getRuntime().exec("convert maze.txt " + outputName + ".png");
            int exitCode = process.waitFor();
            if (exitCode != 0) {
                System.err.println("Image conversion failed with exit code: " + exitCode);
            }
        } catch (IOException | InterruptedException e) {
            System.out.println("이미지 변환 실패: " + e.getMessage());
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
        // [보안 패치] 경로 조작 방지를 위해 templateName 유효성 검사 및 정규화 필요
        // 예: templateName이 ".." 또는 절대 경로를 포함하지 않도록 검사
        File file = new File("./templates/" + templateName);
        if (!file.getCanonicalPath().startsWith(new File("./templates/").getCanonicalPath())) {
            throw new IOException("Attempted path traversal detected.");
        }
        BufferedReader reader = new BufferedReader(new FileReader(file));
        StringBuilder sb = new StringBuilder();
        String line;
        while ((line = reader.readLine()) != null) {
            sb.append(line).append("\n");
        }
        reader.close();
        return sb.toString();
    }

    // =====================================================================
    // [보안 취약점] CWE-502: 신뢰할 수 없는 데이터의 역직렬화
    // 외부에서 전달된 저장 파일을 검증 없이 ObjectInputStream으로 읽는다.
    // =====================================================================
    public Object loadSavedMaze(String path) throws Exception {
        // [보안 패치] 역직렬화 필터링 또는 다른 안전한 데이터 형식 사용 권장
        // 여기서는 기존 로직을 유지하되, 실제 환경에서는 ObjectInputStream.setObjectInputFilter() 사용 또는 JSON/XML 등으로 변경해야 합니다.
        try (ObjectInputStream in = new ObjectInputStream(new FileInputStream(path))) {
            return in.readObject();
        }
    }

    // [보안 취약점] CWE-327: 취약한 해시 알고리즘(MD5) 사용
    public String hashPlayerId(String playerId) throws Exception {
        MessageDigest md = MessageDigest.getInstance("SHA-256"); // MD5 대신 SHA-256 사용
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
        for (int i = 0; i < SIZE; i++) {
            for (int j = 0; j < SIZE; j++) {
                grid[i][j] = getCellType(i, j, difficulty);
            }
        }
        grid[1][1] = 0;
        grid[SIZE - 2][SIZE - 2] = 0;
    }

    private int getCellType(int r, int c, int difficulty) {
        if (isBoundary(r, c)) {
            return 1; // Wall
        }
        if (isIntersection(r, c)) {
            return getRandomWall(difficulty, new int[]{3, 5, 7});
        }
        if (isPassage(r, c)) {
            return getRandomWall(difficulty, new int[]{2, 2, 4});
        }
        return 0; // Empty space
    }

    private boolean isBoundary(int r, int c) {
        return r == 0 || c == 0 || r == SIZE - 1 || c == SIZE - 1;
    }

    private boolean isIntersection(int r, int c) {
        return r % 2 == 0 && c % 2 == 0;
    }

    private boolean isPassage(int r, int c) {
        return r % 2 == 0 || c % 2 == 0;
    }

    private int getRandomWall(int difficulty, int[] wallChances) {
        int wallChanceIndex = Math.min(difficulty - 1, wallChances.length - 1);
        int wallChance = wallChances[wallChanceIndex];
        return random.nextInt(10) < wallChance ? 1 : 0;
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
        // [최적화] 방문 배열을 사용하여 중복 방문 검사를 효율적으로 수행
        boolean[][] visited = new boolean[SIZE][SIZE];
        return solveRecursive(r, c, path, visited);
    }

    private boolean solveRecursive(int r, int c, List<int[]> path, boolean[][] visited) {
        if (r == SIZE - 2 && c == SIZE - 2) {
            path.add(new int[]{r, c});
            return true;
        }

        if (r < 0 || r >= SIZE || c < 0 || c >= SIZE || grid[r][c] == 1 || visited[r][c]) {
            return false;
        }

        visited[r][c] = true;
        path.add(new int[]{r, c});

        // 상하좌우 이동
        if (solveRecursive(r - 1, c, path, visited)) return true; // North
        if (solveRecursive(r + 1, c, path, visited)) return true; // South
        if (solveRecursive(r, c + 1, path, visited)) return true; // East
        if (solveRecursive(r, c - 1, path, visited)) return true; // West

        path.remove(path.size() - 1);
        visited[r][c] = false; // 백트래킹 시 방문 상태 초기화
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