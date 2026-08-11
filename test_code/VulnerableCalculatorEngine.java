package test_code;

import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.Scanner;
import javax.script.ScriptEngine;
import javax.script.ScriptEngineManager;

/**
 * [테스트용 취약 코드] 계산기 엔진 - GuardrAil 보안/품질 분석 파이프라인 테스트 픽스처
 *
 * 이 파일은 의도적으로 여러 보안 취약점 / 비효율 / 코드 중복 패턴을 포함하고 있습니다.
 * 실제 서비스에는 절대 사용하지 마세요.
 */
public class VulnerableCalculatorEngine {

    // [보안 취약점] CWE-798: 하드코딩된 관리자 비밀번호
    private static final String ADMIN_OVERRIDE_PASSWORD = "calc-master-2026!";
    private static final String DB_URL = "jdbc:sqlite:calc_history.db";

    // =====================================================================
    // [보안 취약점] CWE-94: 코드 인젝션
    // 사용자가 입력한 수식을 검증 없이 ScriptEngine으로 그대로 실행한다.
    // =====================================================================
    public Object evaluateExpression(String expression) throws Exception {
        ScriptEngineManager manager = new ScriptEngineManager();
        ScriptEngine engine = manager.getEngineByName("JavaScript");
        return engine.eval(expression);
    }

    // =====================================================================
    // [보안 취약점] CWE-89: SQL Injection
    // PreparedStatement 대신 문자열을 이어붙여 계산 기록을 저장한다.
    // =====================================================================
    public void logCalculation(String username, String expression, String result) {
        try (Connection conn = DriverManager.getConnection(DB_URL)) {
            Statement stmt = conn.createStatement();
            String sql = "INSERT INTO history (username, expression, result) VALUES ('"
                    + username + "', '" + expression + "', '" + result + "')";
            stmt.executeUpdate(sql);
        } catch (SQLException e) {
            System.out.println("기록 저장 실패: " + e.getMessage());
        }
    }

    // =====================================================================
    // [보안 취약점] CWE-798 + 취약한 인증 로직
    // 하드코딩된 비밀번호와 평문 비교로 '고급 모드'를 해제한다.
    // =====================================================================
    public boolean unlockAdvancedMode(String inputPassword) {
        return inputPassword.equals(ADMIN_OVERRIDE_PASSWORD);
    }

    // =====================================================================
    // [보안 취약점] CWE-78: OS 커맨드 인젝션 + CWE-377: 안전하지 않은 임시 파일
    // 예측 가능한 경로에 임시 파일을 만들고, 사용자 입력을 그대로 셸 명령에 결합한다.
    // =====================================================================
    public void exportAndOpen(String username, String content) {
        try {
            File tmp = new File("/tmp/calc_" + username + ".txt");
            FileWriter writer = new FileWriter(tmp);
            writer.write(content);
            writer.close();
            Runtime.getRuntime().exec("cat /tmp/calc_" + username + ".txt");
        } catch (IOException e) {
            System.out.println("내보내기 실패: " + e.getMessage());
        }
    }

    // =====================================================================
    // [코드 중복] 사칙연산 4개 메서드가 입력 파싱/로깅 로직을 거의 그대로 복붙하고 있다.
    // 공통 템플릿 메서드나 함수형 인터페이스로 합칠 수 있는 전형적인 중복 패턴.
    // =====================================================================
    public double add(String username, double a, double b) {
        double result = a + b;
        System.out.println(username + "님의 계산: " + a + " + " + b + " = " + result);
        logCalculation(username, a + " + " + b, String.valueOf(result));
        return result;
    }

    public double subtract(String username, double a, double b) {
        double result = a - b;
        System.out.println(username + "님의 계산: " + a + " - " + b + " = " + result);
        logCalculation(username, a + " - " + b, String.valueOf(result));
        return result;
    }

    public double multiply(String username, double a, double b) {
        double result = a * b;
        System.out.println(username + "님의 계산: " + a + " * " + b + " = " + result);
        logCalculation(username, a + " * " + b, String.valueOf(result));
        return result;
    }

    public double divide(String username, double a, double b) {
        // [비효율/안정성] 0으로 나누는 경우에 대한 예외 처리가 없다.
        double result = a / b;
        System.out.println(username + "님의 계산: " + a + " / " + b + " = " + result);
        logCalculation(username, a + " / " + b, String.valueOf(result));
        return result;
    }

    // =====================================================================
    // [비효율] 순환 복잡도가 매우 높은 연산자 분기 함수 (분기 20개 이상)
    // Map<String, Function> 기반 디스패치 테이블로 대체 가능한데
    // 연산자 하나마다 if/else if 브랜치를 추가하는 방식으로 작성되어 있다.
    // =====================================================================
    public double parseAndCompute(String username, String op, double a, double b) {
        if (op.equals("add") || op.equals("+")) {
            return add(username, a, b);
        } else if (op.equals("sub") || op.equals("-")) {
            return subtract(username, a, b);
        } else if (op.equals("mul") || op.equals("*")) {
            return multiply(username, a, b);
        } else if (op.equals("div") || op.equals("/")) {
            return divide(username, a, b);
        } else if (op.equals("pow")) {
            return Math.pow(a, b);
        } else if (op.equals("mod")) {
            return a % b;
        } else if (op.equals("sqrt")) {
            return Math.sqrt(a);
        } else if (op.equals("sin")) {
            return Math.sin(a);
        } else if (op.equals("cos")) {
            return Math.cos(a);
        } else if (op.equals("tan")) {
            return Math.tan(a);
        } else if (op.equals("log")) {
            return Math.log(a);
        } else if (op.equals("log10")) {
            return Math.log10(a);
        } else if (op.equals("exp")) {
            return Math.exp(a);
        } else if (op.equals("abs")) {
            return Math.abs(a);
        } else if (op.equals("floor")) {
            return Math.floor(a);
        } else if (op.equals("ceil")) {
            return Math.ceil(a);
        } else if (op.equals("round")) {
            return Math.round(a);
        } else if (op.equals("max")) {
            return Math.max(a, b);
        } else if (op.equals("min")) {
            return Math.min(a, b);
        } else if (op.equals("hypot")) {
            return Math.hypot(a, b);
        } else {
            throw new IllegalArgumentException("지원하지 않는 연산자: " + op);
        }
    }

    public static void main(String[] args) throws Exception {
        Scanner scanner = new Scanner(System.in);
        VulnerableCalculatorEngine calc = new VulnerableCalculatorEngine();

        System.out.println("사용자 이름을 입력하세요:");
        String username = scanner.nextLine();

        System.out.println("계산할 수식을 입력하세요 (예: 3 * (2 + 5)):");
        String expression = scanner.nextLine();
        Object result = calc.evaluateExpression(expression);
        System.out.println("결과: " + result);
        calc.logCalculation(username, expression, String.valueOf(result));

        System.out.println("고급 모드 비밀번호를 입력하세요:");
        String pw = scanner.nextLine();
        if (calc.unlockAdvancedMode(pw)) {
            System.out.println("고급 모드가 활성화되었습니다.");
            calc.exportAndOpen(username, expression + " = " + result);
        }

        scanner.close();
    }
}
