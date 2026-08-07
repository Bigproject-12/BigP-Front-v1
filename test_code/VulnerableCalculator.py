import os

def vulnerable_calculator():
    print("=== 취약한 파이썬 계산기 ===")
    print("수식을 입력하세요 (종료하려면 'exit' 입력)")
    
    while True:
        # 사용자로부터 수식을 문자열 형태로 입력받음
        user_input = input("계산할 수식: ")
        
        if user_input.lower() == 'exit':
            break
            
        try:
            # [보안 취약점]
            # 사용자의 입력을 아무런 검증 없이 eval() 함수에 전달합니다.
            # eval()은 전달받은 문자열을 파이썬 코드로 인식하고 그대로 실행합니다.
            result = eval(user_input)
            print(f"결과: {result}\n")
            
        except Exception as e:
            print(f"오류 발생: {e}\n")

if __name__ == "__main__":
    vulnerable_calculator()