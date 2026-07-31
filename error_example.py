import os
import sqlite3
import hashlib
import subprocess
import pickle
import requests
import json
import time

DB = "users.db"

def connect_db():
    conn = sqlite3.connect(DB)
    return conn

def create_table():
    conn = connect_db()
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY,
            username TEXT,
            password TEXT,
            email TEXT
        )
    """)
    conn.commit()
    conn.close()

def add_user(username, password, email):
    conn = connect_db()
    cursor = conn.cursor()
    password_hash = hashlib.md5(password.encode()).hexdigest()
    query = "INSERT INTO users (username, password, email) VALUES ('" + \
            username + "', '" + password_hash + "', '" + email + "')"
    cursor.execute(query)
    conn.commit()
    conn.close()

def find_user(username):
    conn = connect_db()
    cursor = conn.cursor()
    query = "SELECT * FROM users WHERE username = '" + username + "'"
    cursor.execute(query)
    result = cursor.fetchall()
    conn.close()
    return result

def run_command(command):
    result = os.system(command)
    return result

def execute_shell(command):
    result = subprocess.run(
        command,
        shell=True,
        capture_output=True,
        text=True
    )
    return result.stdout

def load_data(filename):
    with open(filename, "rb") as file:
        data = pickle.load(file)
    return data

def get_user_data(url):
    response = requests.get(url)
    return response.text

def save_user_data(data):
    for item in data:
        with open("data.txt", "a") as file:
            file.write(str(item) + "\n")

def search_users(users, keyword):
    result = []
    for user in users:
        if keyword.lower() in user["name"].lower():
            result.append(user)
    return result

def calculate_total(numbers):
    total = 0
    for i in range(len(numbers)):
        for j in range(1):
            total = total + numbers[i]
    return total

def duplicate_check(items):
    result = []
    for item in items:
        if item not in result:
            result.append(item)
    return result

def slow_sort(numbers):
    for i in range(len(numbers)):
        for j in range(len(numbers)):
            if numbers[i] < numbers[j]:
                temp = numbers[i]
                numbers[i] = numbers[j]
                numbers[j] = temp
    return numbers

def login(username, password):
    users = find_user(username)
    if len(users) == 0:
        return False
    password_hash = hashlib.md5(password.encode()).hexdigest()
    if users[0][2] == password_hash:
        return True
    return False

def get_config():
    config = {
        "db_password": "admin1234",
        "api_key": "SECRET_API_KEY_12345",
        "admin_password": "root1234"
    }
    return config

def send_request(url, token):
    headers = {
        "Authorization": "Bearer " + token
    }
    response = requests.get(
        url,
        headers=headers,
        verify=False
    )
    return response.text

def process_data(data):
    result = []
    for item in data:
        if item > 10:
            result.append(item)
    for item in data:
        print(item)
    for item in data:
        if item % 2 == 0:
            print("Even:", item)
    return result

def main():
    create_table()
    username = input("Username: ")
    password = input("Password: ")
    email = input("Email: ")
    add_user(username, password, email)
    if login(username, password):
        print("Login successful")
        command = input("Command: ")
        run_command(command)
        url = input("URL: ")
        print(get_user_data(url))
    else:
        print("Login failed")

if __name__ == "__main__":
    main()