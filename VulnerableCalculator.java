
import javax.script.ScriptEngine;
import javax.script.ScriptEngineManager;
import javax.script.ScriptException;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;

/**
 * VulnerableCalculator
 * 
 * 본 클래스는 의도적으로 다수의 보안 취약점과 비효율적인 알고리즘 로직을 포함하고 있습니다.
 * 코드 분석 도구(SAST) 및 성능 프로파일링 도구를 테스트하기 위한 목적으로 작성되었습니다.
 */
public class VulnerableCalculator {

    // [보안 취약점 1] 하드코딩된 자격 증명 (CWE-798: Use of Hard-coded Credentials)
    // 소스 코드 내에 데이터베이스 접속 정보가 평문으로 노출되어 있습니다.
    private static final String DB_URL = "jdbc:mysql://localhost:3306/calc_db";
    private static final String DB_USER = "calc_admin";
    private static final String DB_PASS = "Super$ecretP@ssw0rd!";

    private List<String> calculationHistory;

    public VulnerableCalculator() {
        this.calculationHistory = new ArrayList<>();
    }

    /**
     * [보안 취약점 2] 안전하지 않은 코드 실행 (CWE-94: Improper Control of Generation of Code)
     * 자바의 ScriptEngine을 사용하여 외부 입력(수식)을 검증 없이 자바스크립트로 실행합니다.
     * 계산식 대신 자바 클래스를 호출하는 악의적인 스크립트가 실행될 수 있습니다.
     */
    public String calculateInsecurely(String expression) {
        System.out.println("[INFO] Evaluating expression: " + expression);
        
        ScriptEngineManager manager = new ScriptEngineManager();
        // Nashorn 또는 JavaScript 엔진 로드
        ScriptEngine engine = manager.getEngineByName("JavaScript"); 

        try {
            // 입력값을 필터링 없이 그대로 eval() 처리
            Object result = engine.eval(expression);
            String resultStr = String.valueOf(result);
            
            // 히스토리에 저장
            calculationHistory.add(expression + " = " + resultStr);
            return resultStr;
            
        } catch (ScriptException e) {
            System.err.println("[ERROR] Failed to evaluate: " + e.getMessage());
            return "Error";
        }
    }

    /**
     * [보안 취약점 3] SQL 인젝션 (CWE-89: SQL Injection)
     * 파라미터 바인딩(PreparedStatement)을 사용하지 않고 문자열 결합을 이용해 쿼리를 생성합니다.
     */
    public void logCalculationToDB(String expression, String result) {
        try {
            Connection conn = DriverManager.getConnection(DB_URL, DB_USER, DB_PASS);
            Statement stmt = conn.createStatement();
            
            // 검증되지 않은 사용자의 입력을 SQL 쿼리에 그대로 삽입
            String query = "INSERT INTO calc_logs (expression, result) VALUES ('" 
                         + expression + "', '" + result + "')";
            
            stmt.executeUpdate(query);
            stmt.close();
            conn.close();
            System.out.println("[INFO] Successfully logged to DB.");
        } catch (Exception e) {
            System.err.println("[ERROR] DB Logging failed: " + e.getMessage());
        }
    }

    /**
     * [보안 취약점 4] OS 명령어 삽입 (CWE-78: OS Command Injection)
     * 계산 완료 후 결과를 파일로 백업하거나 특정 시스템 훅을 실행할 때 입력값을 검증하지 않습니다.
     */
    public void executePostCalculationHook(String command) {
        if (command != null && !command.isEmpty()) {
            try {
                System.out.println("[INFO] Executing hook: " + command);
                String os = System.getProperty("os.name").toLowerCase();
                Process process;
                
                // 쉘을 통해 검증 없는 명령어를 그대로 실행
                if (os.contains("win")) {
                    process = Runtime.getRuntime().exec(new String[]{"cmd.exe", "/c", command});
                } else {
                    process = Runtime.getRuntime().exec(new String[]{"sh", "-c", command});
                }
                
                BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()));
                String line;
                while ((line = reader.readLine()) != null) {
                    System.out.println("Hook Output: " + line);
                }
            } catch (Exception e) {
                System.err.println("[ERROR] Hook execution failed: " + e.getMessage());
            }
        }
    }

    /**
     * [효율성 이슈 1] 루프 내 무분별한 문자열 결합 (String Concatenation in Loops)
     * StringBuilder를 사용하지 않고 += 연산자로 문자열을 이어 붙여 
     * 매 루프마다 새로운 String 객체를 생성, 가비지 컬렉터(GC)에 심각한 부하를 줍니다.
     */
    public String generateHistoryReport() {
        System.out.println("[INFO] Generating calculation report...");
        String report = "===== CALCULATOR HISTORY =====\n";
        
        // [비효율성] 반복문 안에서 String += 연산 (메모리 낭비 심각)
        for (int i = 0; i < calculationHistory.size(); i++) {
            report += "Log #" + (i + 1) + ": " + calculationHistory.get(i) + "\n";
        }
        
        report += "==============================\n";
        return report;
    }

    /**
     * [효율성 이슈 2] 매우 비효율적인 소수(Prime) 계산 알고리즘
     * 복잡한 계산 기능을 제공한다는 명목 하에, O(N^2)의 시간 복잡도를 가지며
     * 기본 자료형(int) 대신 래퍼 클래스(Integer)를 남용하여 오토박싱/언박싱 오버헤드를 발생시킵니다.
     */
    public Integer countPrimesInefficiently(Integer limit) {
        System.out.println("[INFO] Counting primes up to " + limit + " (Inefficiently)...");
        Integer primeCount = 0;
        
        // [비효율성] 제곱근(sqrt)까지만 검사하지 않고, n-1까지 모두 검사함
        // [비효율성] Integer 객체를 계속 생성하여 힙 메모리 낭비
        for (Integer i = 2; i <= limit; i++) {
            boolean isPrime = true;
            for (Integer j = 2; j < i; j++) {
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

    // -------------------------------------------------------------------------
    // Main 메서드 - 취약점 시뮬레이션
    // -------------------------------------------------------------------------
    public static void main(String[] args) {
        VulnerableCalculator calc = new VulnerableCalculator();

        // 1. 정상적인 계산 수행
        String safeExpression = "10 + 20 * 3";
        String safeResult = calc.calculateInsecurely(safeExpression);
        System.out.println("Result: " + safeResult + "\n");

        // 2. [취약점 시뮬레이션] Script Injection (임의 코드 실행)
        // 계산기 입력창에 자바스크립트 엔진을 탈출해 자바 런타임(Runtime)을 호출하는 악성 페이로드 주입
        System.out.println("--- Triggering Script Injection ---");
        String maliciousScript = "java.lang.Runtime.getRuntime().exec('calc.exe')";
        // 주의: 윈도우 환경에서 실제 계산기(calc.exe)가 실행될 수 있습니다.
        calc.calculateInsecurely(maliciousScript);
        System.out.println();

        // 3. [취약점 시뮬레이션] SQL 인젝션
        System.out.println("--- Triggering SQL Injection ---");
        String maliciousExpression = "1+1', (SELECT password FROM users WHERE admin=1)); -- ";
        calc.logCalculationToDB(maliciousExpression, "2");
        System.out.println();

        // 4. [취약점 시뮬레이션] OS 명령어 삽입
        System.out.println("--- Triggering OS Command Injection ---");
        String maliciousHook = "echo 'Calculation done' && whoami"; 
        calc.executePostCalculationHook(maliciousHook);
        System.out.println();

        // 5. [비효율성 시뮬레이션] 더미 데이터 대량 삽입 후 문자열 결합 리포트 생성
        System.out.println("--- Triggering String Concatenation Bottleneck ---");
        for (int i = 0; i < 5000; i++) {
            calc.calculationHistory.add("Dummy expr " + i + " = " + (i * 2));
        }
        long startTime = System.currentTimeMillis();
        String report = calc.generateHistoryReport();
        long endTime = System.currentTimeMillis();
        System.out.println("Report generation took " + (endTime - startTime) + " ms.");
        System.out.println();

        // 6. [비효율성 시뮬레이션] O(N^2) 소수 계산
        System.out.println("--- Triggering Inefficient Algorithm ---");
        startTime = System.currentTimeMillis();
        // 숫자가 커질수록 기하급수적으로 느려짐 (오토박싱 + 이중 루프)
        Integer primes = calc.countPrimesInefficiently(10000); 
        endTime = System.currentTimeMillis();
        System.out.println("Found " + primes + " primes in " + (endTime - startTime) + " ms.");
    }
}