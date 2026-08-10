package test_code;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.Scanner;
import javax.script.ScriptEngine;
import javax.script.ScriptEngineManager;

public class VulnerableSudokuSolver {

    public static boolean isValid(int[][] board, int row, int col, int num) {
        // 현재 위치(row, col)에 num이 들어갈 수 있는지 검사
        for (int i = 0; i < 9; i++) {
            if (board[row][i] == num) return false;
        }
        for (int i = 0; i < 9; i++) {
            if (board[i][col] == num) return false;
        }
        
        int startRow = 3 * (row / 3);
        int startCol = 3 * (col / 3);
        for (int i = 0; i < 3; i++) {
            for (int j = 0; j < 3; j++) {
                if (board[startRow + i][startCol + j] == num) return false;
            }
        }
        return true;
    }

    public static boolean solveSudoku(int[][] board) {
        // 백트래킹을 사용하여 스도쿠 해결
        for (int row = 0; row < 9; row++) {
            for (int col = 0; col < 9; col++) {
                if (board[row][col] == 0) {
                    for (int num = 1; num <= 9; num++) {
                        if (isValid(board, row, col, num)) {
                            board[row][col] = num;
                            if (solveSudoku(board)) return true;
                            board[row][col] = 0; // 백트래킹
                        }
                    }
                    return false;
                }
            }
        }
        return true;
    }

    public static void loadAndSolve(String filename) {
        // [취약점 1] Path Traversal (경로 조작 / 디렉토리 순회)
        // 사용자가 입력한 filename을 아무런 검증(Sanitization) 없이 파일 경로에 바로 결합합니다.
        // 입력값으로 "../../../../etc/passwd" 등을 넣으면 의도치 않은 파일에 접근 가능합니다.
        String filepath = "./boards/" + filename;

        try {
            File file = new File(filepath);
            String data = new String(Files.readAllBytes(Paths.get(file.getPath())));

            // [취약점 2] Code Injection (임의 코드 실행 / CWE-94)
            // Gson이나 Jackson 같은 안전한 JSON 파서를 쓰지 않고, Java ScriptEngine을 사용해 문자열을 강제 실행합니다.
            // 데이터 파일 안에 악의적인 Java 리플렉션 코드(예: Runtime.getRuntime().exec())가 포함되어 있다면 
            // 시스템 권한이 탈취될 수 있습니다.
            ScriptEngineManager manager = new ScriptEngineManager();
            ScriptEngine engine = manager.getEngineByName("JavaScript");

            // 테스트 목적을 위해 스도쿠 보드는 0으로 채워진 기본 배열을 생성해 둡니다.
            int[][] board = new int[9][9]; 
            
            // 파일에서 읽은 문자열(data)을 그대로 eval()에 전달 (가장 치명적인 보안 결함)
            engine.eval("var parsedData = " + data + ";");
            
            System.out.println("스도쿠를 푸는 중...");
            if (solveSudoku(board)) {
                System.out.println("해결 완료!");
            } else {
                System.out.println("해결할 수 없는 보드입니다.");
            }

        } catch (Exception e) {
            System.out.println("오류 발생: " + e.getMessage());
        }
    }

    public static void main(String[] args) {
        System.out.println("불러올 스도쿠 보드 파일 이름을 입력하세요 (예: board1.txt):");
        Scanner scanner = new Scanner(System.in);
        String userInput = scanner.nextLine();
        
        loadAndSolve(userInput);
        
        scanner.close();
    }
}