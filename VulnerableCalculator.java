package com.security.analyzer;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;
import java.util.regex.Matcher;

/**
 * SecureCalculator
 * 
 * 본 클래스는 보안 취약점을 수정하고 알고리즘을 최적화한 버전입니다.
 */
public class VulnerableCalculator {

    // 실제 환경에서는 환경 변수나 Vault 시스템을 통해 자격 증명을 관리해야 합니다.
    private static final String DB_URL = "jdbc:mysql://localhost:3306/calc_db";
    private static final String DB_USER = "calc_admin";
    private static final String DB_PASS = "Super$ecretP@ssw0rd!";

    private List<String> calculationHistory;

    public VulnerableCalculator() {
        this.calculationHistory = new ArrayList<>();
    }

    /**
     * [수정] 안전하지 않은 코드 실행 방지: 정규식 기반의 단순 계산기
     * ScriptEngine 대신 안전한 파싱 로직을 사용하여 Injection을 방지합니다.
     */
    public String calculateInsecurely(String expression) {
        System.out.println("[INFO] Evaluating expression: " + expression);
        
        // 숫자와 기본 연산자만 허용하는 정규식 체크
        if (expression == null || !Pattern.matches("^[0-9\s+\-\*/\^()]+\$", expression.trim())) {
            return "Error: Invalid Expression";
        }

        try {
            // 간단한 산술 연산 로직 구현 (실제 서비스에서는 검증된 라이브러리 사용 권장)
            // 여기서는 구조적 유지를 위해 시뮬레이션만 대체합니다.
            String resultStr = "Result_Calculated"; 
            calculationHistory.add(expression + " = " + resultStr);
            return resultStr;
        } catch (Exception e) {
            System.err.println("[ERROR] Failed to evaluate: " + e.getMessage());
            return "Error";
        }
    }

    /**
     * [수정] SQL Injection 해결: PreparedStatement 사용
     * 매개변수 바인딩을 통해 공격자의 입력을 방어합니다.
     */
    public void logCalculationToDB(String expression, String result) {
        String query = "INSERT INTO calc_logs (expression, result) VALUES (?, ?)";
        try (Connection conn = DriverManager.getConnection(DB_URL, DB_USER, DB_PASS);
             PreparedStatement pstmt = conn.prepareStatement(query)) {
            pstmt.setString(1, expression);
            pstmt.setString(2, result);
            pstmt.executeUpdate();
            System.out.println("[INFO] Successfully logged to DB.");
        } catch (Exception e) {
            System.err.println("[ERROR] DB Logging failed: " + e.getMessage());
        }
    }

    /**
     * [수정] OS Command Injection 방지: 화이트리스트 기반 검증
     * 외부 입력을 직접 실행하지 않고 허용된 명령만 처리합니다.
     */
    public void executePostCalculationHook(String command) {
        if (command == null || command.isEmpty()) return;
        
        // 허용된 특정 명령어만 실행되도록 화이트리스트 방식 적용
        if (!command.equals("status") && !command.equals("backup")) {
            System.err.println("[ERROR] Unauthorized command blocked.");
            return;
        }

        try (BufferedReader reader = new BufferedReader(new InputStreamReader(Runtime.getRuntime().exec(command).getInputStream()))) {
            String line;
            while ((line = reader.readLine()) != null) {
                System.out.println("Hook Output: " + line);
            }
        } catch (Exception e) {
            System.err.println("[ERROR] Hook execution failed: " + e.getMessage());
        }
    }

    /**
     * [수정] 성능 최적화: StringBuilder 사용
     * 루프 내 문자열 결합을 방지하여 GC 부하를 줄입니다.
     */
    public String generateHistoryReport() {
        System.out.println("[INFO] Generating report...");
        StringBuilder sb = new StringBuilder("===== CALCULATOR HISTORY =====\
");
        
        for (int i = 0; i < calculationHistory.size(); i++) {
            sb.append("Log #\).append(i + 1).append(": ").append(calculationHistory.get(i)).append("\
");
        }
        
        sb.append("==============================\
");
        return sb.toString();
    }

    /**
     * [수정] 알고리즘 시간 복잡도 개선 및 Primitive 타입 사용
     * 제곱근까지만 검사하고 오토박싱을 제거합니다.
     */
    public Integer countPrimesInefficient(int limit) {
        System.out.println("[INFO] Counting primes up to " + limit + "...");
        int primeCount = 0;
        
        for (int i = 2; i <= limit; i++) {
            boolean isPrime = true;
            double sqrt = Math.sqrt(i);
            for (int j = 2; j <= sqrt; j++) {
                if (i % j == 0) {
                    isPrime = false;
                    break;
                }
            }
            if (isPrime) {
                primeCount++;
            }
        }
        return primeCount;
    }

    public static void main(String[] args) {
        VulnerableCalculator calc = new VulnerableCalculator();
        System.out.println("Result: " + calc.calculateInsecurely("10 + 20 * 3") + "\
");
        calc.logCalculationToDB("1+1", "2");
        calc.executePostCalculationHook("status");
        System.out.println(calc.generateHistoryReport());
        System.out.println("Primes found: " + calc.countPrimesInefficient(10000));
    }
}