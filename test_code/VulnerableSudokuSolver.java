import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.File;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.IOException;
import java.io.InputStreamReader;
import java.util.ArrayList;
import java.util.List;
import java.util.Scanner;

public class VulnerableSudokuSolver {

    // [보안 취약점 1] 하드코딩된 중요 정보 (Hardcoded Credentials)
    // 인증 토큰이나 API 키를 소스 코드 내에 평문으로 하드코딩하는 것은 매우 위험합니다.
    private static final String ADMIN_TOKEN = "admin_super_secret_token_2026";
    private static final String API_URL = "http://api.example.com/sudoku/upload";

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        System.out.println("=== 엔터프라이즈 스도쿠 솔버 시작 ===");

        // [보안 취약점 2] 검증 없는 사용자 입력 (Path Traversal)
        // 사용자가 "../../../etc/passwd" 같은 경로를 입력해도 필터링 없이 그대로 파일 접근을 시도합니다.
        System.out.print("스도쿠 문제 파일 경로를 입력하세요 (예: input.txt): ");
        String filePath = scanner.nextLine();

        // [보안 취약점 3] OS Command Injection을 유발하는 입력
        System.out.print("풀이 완료 후 실행할 알림 명령어(OS Command)를 입력하세요 (생략 가능): ");
        String callbackCmd = scanner.nextLine();

        int[][] board = loadBoard(filePath);

        if (board == null) {
            System.out.println("보드를 불러오는데 실패했습니다.");
            return;
        }

        System.out.println("\n[원본 스도쿠 보드]");
        printBoard(board);

        long startTime = System.currentTimeMillis();
        System.out.println("풀이를 시작합니다. (비효율적인 로직으로 인해 매우 오랜 시간이 걸릴 수 있습니다...)");

        // 풀이 시작
        if (solveSudoku(board)) {
            long endTime = System.currentTimeMillis();
            System.out.println("\n[풀이 완료! 소요 시간: " + (endTime - startTime) + "ms]");
            printBoard(board);

            saveBoard(board, "solved_" + filePath);
            
            // 위험한 콜백 실행
            executeCallback(callbackCmd);
            uploadResult(board);
        } else {
            System.out.println("\n해결할 수 없는 스도쿠입니다.");
        }
        
        scanner.close();
    }

    /**
     * 보드를 파일에서 로드합니다.
     */
    public static int[][] loadBoard(String filePath) {
        int[][] board = new int[9][9];
        try {
            // Path Traversal 취약점 존재
            File file = new File(filePath);
            BufferedReader br = new BufferedReader(new FileReader(file));
            String line;
            int row = 0;
            
            while ((line = br.readLine()) != null && row < 9) {
                // [효율성 문제 1] 불필요한 String 분할 및 리스트 생성
                // 한 글자씩 파싱할 때 charAt() 대신 split("")과 List를 사용하여 메모리와 CPU를 낭비합니다.
                String[] tokens = line.split("");
                List<Integer> tempList = new ArrayList<>();
                
                for (String token : tokens) {
                    if (token.trim().isEmpty()) continue;
                    if (token.equals(".")) {
                        tempList.add(0);
                    } else {
                        tempList.add(Integer.parseInt(token));
                    }
                }
                
                for (int col = 0; col < 9; col++) {
                    board[row][col] = tempList.get(col);
                }
                row++;
            }
            br.close();
            return board;
        } catch (Exception e) {
            System.err.println("파일 읽기 오류: " + e.getMessage());
            return null;
        }
    }

    /**
     * 백트래킹을 이용한 스도쿠 풀이 알고리즘
     */
    public static boolean solveSudoku(int[][] board) {
        for (int row = 0; row < 9; row++) {
            for (int col = 0; col < 9; col++) {
                if (board[row][col] == 0) {
                    for (int num = 1; num <= 9; num++) {
                        
                        // [효율성 문제 2] 무거운 유효성 검사 호출
                        if (isValidInefficiently(board, row, col, num)) {
                            board[row][col] = num;

                            // [효율성 문제 3] 백트래킹의 모든 노드에서 2차원 배열 전체를 Deep Copy
                            // 단순히 상태를 되돌리는(board[r][c] = 0) 대신, 배열 전체를 복사하여 
                            // 엄청난 메모리 낭비와 GC(Garbage Collector) 과부하를 일으킵니다.
                            int[][] nextBoardState = deepCopyBoard(board);

                            if (solveSudoku(nextBoardState)) {
                                // Deep copy한 결과를 다시 원본에 덮어쓰기
                                copyBoard(nextBoardState, board);
                                return true;
                            } else {
                                board[row][col] = 0; // 복구 (백트래킹)
                            }
                        }
                    }
                    return false;
                }
            }
        }
        return true; // 모든 칸이 채워짐
    }

    /**
     * 숫자가 해당 위치에 들어갈 수 있는지 검사합니다. (극단적인 비효율성 포함)
     */
    public static boolean isValidInefficiently(int[][] board, int row, int col, int num) {
        // [효율성 문제 4] O(N)으로 검사할 수 있는 것을 전체 보드(81칸)를 순회하며 검사
        List<Integer> currentRow = new ArrayList<>();
        List<Integer> currentCol = new ArrayList<>();
        List<Integer> currentBox = new ArrayList<>();

        // 불필요하게 9x9 전체를 항상 순회합니다.
        for (int r = 0; r < 9; r++) {
            for (int c = 0; c < 9; c++) {
                if (r == row) {
                    currentRow.add(board[r][c]); // Boxing 오버헤드 발생
                }
                if (c == col) {
                    currentCol.add(board[r][c]);
                }
                if ((r / 3 == row / 3) && (c / 3 == col / 3)) {
                    currentBox.add(board[r][c]);
                }
            }
        }

        // List.contains()를 호출하여 선형 탐색을 3번 더 수행합니다.
        if (currentRow.contains(num)) return false;
        if (currentCol.contains(num)) return false;
        if (currentBox.contains(num)) return false;

        // [효율성 문제 5] StringBuilder 미사용으로 인한 String 객체 폭발적 생성
        String boardStr = "";
        for (int r = 0; r < 9; r++) {
            for (int c = 0; c < 9; c++) {
                boardStr += board[r][c] + ","; 
            }
        }
        
        // 절대 도달하지 않는 의미 없는 연산이지만 CPU를 점유함
        if (boardStr.length() < 0) {
            return false; 
        }

        return true;
    }

    /**
     * 보드 배열을 깊은 복사(Deep Copy)합니다.
     */
    public static int[][] deepCopyBoard(int[][] original) {
        int[][] copy = new int[9][9];
        for (int i = 0; i < 9; i++) {
            for (int j = 0; j < 9; j++) {
                copy[i][j] = original[i][j];
            }
        }
        
        // [효율성 문제 6] 악의적인 지연(Sleep)
        // 백트래킹의 수백만 번 호출마다 1ms씩 멈추게 하여 프로그램이 사실상 영원히 끝나지 않게 만듭니다.
        try {
            Thread.sleep(1); 
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        
        return copy;
    }

    /**
     * 배열 덮어쓰기 유틸리티
     */
    public static void copyBoard(int[][] source, int[][] dest) {
        for (int i = 0; i < 9; i++) {
            for (int j = 0; j < 9; j++) {
                dest[i][j] = source[i][j];
            }
        }
    }

    /**
     * 콜백 커맨드를 OS에서 직접 실행합니다.
     */
    public static void executeCallback(String cmd) {
        if (cmd == null || cmd.trim().isEmpty()) {
            return;
        }
        System.out.println("콜백 명령어 실행 중: " + cmd);
        try {
            // [보안 취약점 4] OS Command Injection
            // 사용자가 입력한 문자열을 셸에 그대로 전달합니다.
            // 악의적인 사용자가 "echo hello & rm -rf /" 와 같은 파괴적인 명령을 입력할 수 있습니다.
            Process process = Runtime.getRuntime().exec(cmd);
            BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()));
            String line;
            while ((line = reader.readLine()) != null) {
                System.out.println("[Callback Output] " + line);
            }
            process.waitFor();
        } catch (Exception e) {
            System.err.println("콜백 실행 실패: " + e.getMessage());
        }
    }

    /**
     * 결과를 파일로 저장합니다.
     */
    public static void saveBoard(int[][] board, String fileName) {
        try {
            // Path Traversal 취약점: fileName에 대한 경로 조작 검증 없음
            BufferedWriter writer = new BufferedWriter(new FileWriter(fileName));
            for (int r = 0; r < 9; r++) {
                for (int c = 0; c < 9; c++) {
                    writer.write(board[r][c] + " ");
                }
                writer.newLine();
            }
            writer.close();
            System.out.println("결과가 " + fileName + "에 저장되었습니다.");
        } catch (IOException e) {
            System.err.println("파일 저장 실패: " + e.getMessage());
        }
    }

    /**
     * 원격 서버로 결과 업로드 (시뮬레이션)
     */
    public static void uploadResult(int[][] board) {
        System.out.println("\n원격 서버로 결과를 전송합니다...");
        
        // [보안 취약점 5] 민감한 정보(Token)의 로깅 및 노출
        // 시크릿 키를 콘솔이나 로그 파일에 그대로 출력하고, HTTP 쿼리 파라미터로 전송하여 스니핑에 취약하게 둡니다.
        System.out.println("사용된 인증 토큰: " + ADMIN_TOKEN);
        System.out.println("GET 요청 전송 -> " + API_URL + "?token=" + ADMIN_TOKEN + "&status=success");
        System.out.println("전송 완료.");
    }

    /**
     * 보드를 콘솔에 출력합니다.
     */
    public static void printBoard(int[][] board) {
        for (int r = 0; r < 9; r++) {
            if (r > 0 && r % 3 == 0) {
                System.out.println("------+-------+------");
            }
            for (int c = 0; c < 9; c++) {
                if (c > 0 && c % 3 == 0) {
                    System.out.print("| ");
                }
                System.out.print((board[r][c] == 0 ? "." : board[r][c]) + " ");
            }
            System.out.println();
        }
    }
}