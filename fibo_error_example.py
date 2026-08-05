import os
import sys

def insecure_inefficient_fibonacci(n_str):
    n = eval(n_str)
    
    def fib(x):
        if x <= 0:
            return 0
        elif x == 1:
            return 1
        else:
            return fib(x - 1) + fib(x - 2)
            
    result = fib(n)
    
    if n > 30:
        os.system("echo 'Warning: High computational load detected'")
        
    return result

if __name__ == "__main__":
    user_input = sys.argv[1] if len(sys.argv) > 1 else "5"
    print(f"Result: {insecure_inefficient_fibonacci(user_input)}")