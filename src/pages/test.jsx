package com.example.vulntest;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.sql.*;
import java.util.List;

/*
 * 테스트용 샘플 - 의도적으로 취약점 3개를 포함
 * 1. CWE-798 하드코딩된 API 시크릿
 * 2. CWE-89  SQL Injection
 * 3. CWE-79  Reflected XSS
 */
@RestController
@RequestMapping("/api/board")
class BoardController {

    // 취약점 1: 하드코딩된 시크릿 키
    private static final String API_SECRET = "board-api-secret-key-2024";

    @Autowired
    private JdbcTemplate jdbcTemplate;

    // 취약점 2: SQL Injection - 사용자 입력을 문자열 결합으로 쿼리에 삽입
    @GetMapping("/posts")
    @ResponseBody
    public List<Post> getPostsByAuthor(@RequestParam String author) {
        String sql = "SELECT * FROM posts WHERE author = '" + author + "'";
        return jdbcTemplate.query(sql, (rs, rowNum) -> {
            Post p = new Post();
            p.setId(rs.getLong("id"));
            p.setTitle(rs.getString("title"));
            p.setAuthor(rs.getString("author"));
            return p;
        });
    }

    // 취약점 3: Reflected XSS - 사용자 입력을 이스케이프 없이 그대로 HTML에 반영
    @GetMapping("/search")
    @ResponseBody
    public String search(@RequestParam String keyword) {
        return "<html><body>"
             + "<h3>'" + keyword + "' 검색 결과</h3>"
             + "</body></html>";
    }

    // 취약점 2-b: DELETE 쿼리에도 동일한 방식으로 인젝션 가능
    @DeleteMapping("/posts")
    @ResponseBody
    public String deleteByTitle(@RequestParam String title) {
        String sql = "DELETE FROM posts WHERE title = '" + title + "'";
        jdbcTemplate.update(sql);
        return "deleted";
    }
}

class Post {
    private Long id;
    private String title;
    private String author;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getAuthor() { return author; }
    public void setAuthor(String author) { this.author = author; }
}