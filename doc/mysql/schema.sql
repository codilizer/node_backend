-- ------------------------------------------------------------
-- MySQL 스키마 예시 (선택 사항)
--
-- 이 프로젝트의 기본 저장소는 MongoDB 이며, MySQL 은 lib/mysql.js 로 함께 사용할 수 있도록
-- 구조만 마련해 두었다. (MYSQL_ENABLE=true 로 활성화)
-- 원본 프로젝트의 auth 테이블 구조를 참고용으로 남긴다.
--
-- 사용 예:
--   mysql -u root -p < ./doc/mysql/schema.sql
-- ------------------------------------------------------------

CREATE DATABASE IF NOT EXISTS `node_backend` DEFAULT CHARACTER SET utf8mb4;
USE `node_backend`;

-- 사용자 계정 (MySQL 로 인증 정보를 분리 보관하고 싶을 때)
CREATE TABLE IF NOT EXISTS `auth` (
  `_id` VARCHAR(64) NOT NULL COMMENT '로그인 ID',
  `user_id` INT NOT NULL COMMENT 'MongoDB user._id',
  `password` VARCHAR(255) NULL DEFAULT NULL COMMENT 'scrypt 해시',
  `token` VARCHAR(128) NULL DEFAULT NULL,
  `status` ENUM('normal','retire','admin_retire') NOT NULL DEFAULT 'normal',
  `created` DATETIME NOT NULL,
  `updated` DATETIME NOT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE INDEX `idx_auth_user_id` (`user_id` ASC)
) ENGINE = InnoDB ROW_FORMAT=DYNAMIC;

-- 감사 로그 예시
CREATE TABLE IF NOT EXISTS `audit_log` (
  `log_id` BIGINT NOT NULL AUTO_INCREMENT,
  `actor_type` ENUM('user','admin','system') NOT NULL,
  `actor_id` VARCHAR(64) NULL,
  `action` VARCHAR(64) NOT NULL,
  `target` VARCHAR(255) NULL,
  `detail` JSON NULL,
  `created` DATETIME NOT NULL,
  PRIMARY KEY (`log_id`),
  INDEX `idx_audit_actor` (`actor_type`, `actor_id`),
  INDEX `idx_audit_created` (`created`)
) ENGINE = InnoDB ROW_FORMAT=DYNAMIC;
