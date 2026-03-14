package com.powerinspection.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;

@Component
public class DatabaseConnectionTest implements CommandLineRunner {

    @Autowired
    private DataSource dataSource;

    @Override
    public void run(String... args) throws Exception {
        try (Connection connection = dataSource.getConnection()) {
            System.out.println("===========================================");
            System.out.println("数据库连接成功！");
            System.out.println("数据库URL: " + connection.getMetaData().getURL());
            System.out.println("数据库用户: " + connection.getMetaData().getUserName());
            System.out.println("数据库产品: " + connection.getMetaData().getDatabaseProductName());
            System.out.println("数据库版本: " + connection.getMetaData().getDatabaseProductVersion());
            System.out.println("===========================================");
        } catch (Exception e) {
            System.err.println("===========================================");
            System.err.println("数据库连接失败！");
            System.err.println("错误信息: " + e.getMessage());
            System.err.println("===========================================");
            e.printStackTrace();
        }
    }
}

