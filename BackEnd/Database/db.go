package db

import (
	"database/sql"
	"fmt"
	"os"
	"time"

	_ "github.com/go-sql-driver/mysql"
	"github.com/joho/godotenv"
)

func ConnectDB() (*sql.DB, error) {

	err := godotenv.Load()
	if err != nil {
		return nil, fmt.Errorf("failed load env: %w", err)
	}

	dsn := fmt.Sprintf(
		"%s:%s@tcp(%s:%s)/%s?parseTime=true&charset=utf8mb4&loc=Local",
		os.Getenv("DB_USER"),
		os.Getenv("DB_PASS"),
		os.Getenv("DB_HOST"),
		os.Getenv("DB_PORT"),
		os.Getenv("DB_NAME"),
	)

	db, err := sql.Open("mysql", dsn)
	if err != nil {
		return nil, fmt.Errorf("Gagal Membuka Database: %w", err)
	}

	// Connection Pool
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(25)
	db.SetConnMaxLifetime(5 * time.Minute)

	// Test koneksi
	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("Gagal Pinging Database: %w", err)
	}

	fmt.Println("Database Koneksi Berhasil!")

	return db, nil
}
