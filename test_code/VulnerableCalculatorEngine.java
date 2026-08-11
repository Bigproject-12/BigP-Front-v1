package test_code;

import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.util.HashMap;
import java.util.Map;
import java.util.Scanner;
import java.util.function.DoubleBinaryOperator;
import java.util.function.DoubleUnaryOperator;
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
    private static final String ADMIN_OVERRIDE_PASSWORD;
    private static final String DB_URL = "jdbc:sqlite:calc_history.db";

    static {
        ADMIN_OVERRIDE_PASSWORD = System.getenv("ADMIN_PASSWORD");
        if (ADMIN_OVERRIDE_PASSWORD == null || ADMIN_OVERRIDE_PASSWORD.isEmpty()) {
            throw new IllegalArgumentException("ADMIN_PASSWORD environment variable not set.");
        }
    }

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
        String sql = "INSERT INTO history (username, expression, result) VALUES (?, ?, ?)";
        try (Connection conn = DriverManager.getConnection(DB_URL);
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            pstmt.setString(1, username);
            pstmt.setString(2, expression);
            pstmt.setString(3, result);
            pstmt.executeUpdate();
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
    private double performCalculation(String username, double a, double b, String operatorSymbol, DoubleBinaryOperator operation) {
        double result = operation.applyAsDouble(a, b);
        System.out.println(username + "님의 계산: " + a + " " + operatorSymbol + " " + b + " = " + result);
        logCalculation(username, a + " " + operatorSymbol + " " + b, String.valueOf(result));
        return result;
    }

    public double add(String username, double a, double b) {
        return performCalculation(username, a, b, "+", (x, y) -> x + y);
    }

    public double subtract(String username, double a, double b) {
        return performCalculation(username, a, b, "-", (x, y) -> x - y);
    }

    public double multiply(String username, double a, double b) {
        return performCalculation(username, a, b, "*", (x, y) -> x * y);
    }

    public double divide(String username, double a, double b) {
        if (b == 0) {
            throw new IllegalArgumentException("0으로 나눌 수 없습니다.");
        }
        return performCalculation(username, a, b, "/", (x, y) -> x / y);
    }

    private static final Map<String, DoubleBinaryOperator> binaryOperations = new HashMap<>();
    private static final Map<String, DoubleUnaryOperator> unaryOperations = new HashMap<>();

    static {
        binaryOperations.put("add", (a, b) -> a + b);
        binaryOperations.put("+", (a, b) -> a + b);
        binaryOperations.put("sub", (a, b) -> a - b);
        binaryOperations.put("-", (a, b) -> a - b);
        binaryOperations.put("mul", (a, b) -> a * b);
        binaryOperations.put("*", (a, b) -> a * b);
        binaryOperations.put("div", (a, b) -> {
            if (b == 0) throw new IllegalArgumentException("0으로 나눌 수 없습니다.");
            return a / b;
        });
        binaryOperations.put("/", (a, b) -> {
            if (b == 0) throw new IllegalArgumentException("0으로 나눌 수 없습니다.");
            return a / b;
        });
        binaryOperations.put("pow", Math::pow);
        binaryOperations.put("mod", (a, b) -> a % b);
        binaryOperations.put("max", Math::max);
        binaryOperations.put("min", Math::min);
        binaryOperations.put("hypot", Math::hypot);

        unaryOperations.put("sqrt", Math::sqrt);
        unaryOperations.put("sin", Math::sin);
        unaryOperations.put("cos", Math::cos);
        unaryOperations.put("tan", Math::tan);
        unaryOperations.put("log", Math::log);
        unaryOperations.put("log10", Math::log10);
        unaryOperations.put("exp", Math::exp);
        unaryOperations.put("abs", Math::abs);
        unaryOperations.put("floor", Math::floor);
        unaryOperations.put("ceil", Math::ceil);
        unaryOperations.put("round", (a) -> (double) Math.round(a));
    }

    public double parseAndCompute(String username, String op, double a, double b) {
        if (binaryOperations.containsKey(op)) {
            DoubleBinaryOperator operation = binaryOperations.get(op);
            String operatorSymbol = op;
            if (op.equals("add")) operatorSymbol = "+";
            else if (op.equals("sub")) operatorSymbol = "-";
            else if (op.equals("mul")) operatorSymbol = "*";
            else if (op.equals("div")) operatorSymbol = "/";

            double result = operation.applyAsDouble(a, b);
            System.out.println(username + "님의 계산: " + a + " " + operatorSymbol + " " + b + " = " + result);
            logCalculation(username, a + " " + operatorSymbol + " " + b, String.valueOf(result));
            return result;
        } else if (unaryOperations.containsKey(op)) {
            DoubleUnaryOperator operation = unaryOperations.get(op);
            double result = operation.applyAsDouble(a);
            System.out.println(username + "님의 계산: " + op + "(" + a + ") = " + result);
            logCalculation(username, op + "(" + a + ")", String.valueOf(result));
            return result;
        } else {
            throw new IllegalArgumentException("지원하지 않는 연산자: " + op);
        }
    }

    public static void main(String[] args) throws Exception {
        Scanner scanner = new Scanner(System.in);
        VulnerableCalculatorEngine calc = new VulnerableCalculatorEngine();

        System.out.println("사용자 이름을 입력하세요:");
        String username = scanner.nextLine();

        System.out.println("계산할 수식을 입력하세요 (예: 3 * (2 + 5)): ");
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