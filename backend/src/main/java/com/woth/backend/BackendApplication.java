package com.woth.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

import java.util.TimeZone;

@EnableAsync
@SpringBootApplication
public class BackendApplication {

	public static void main(String[] args) {
		// [수정] 배포 서버(JVM)가 UTC로 떠도 LocalDateTime.now()가 한국 시간을 쓰도록 기본 타임존을 고정합니다.
		// run() 이전에 설정해 JPA/엔티티의 생성·수정 시각이 모두 KST 기준으로 저장되게 합니다.
		TimeZone.setDefault(TimeZone.getTimeZone("Asia/Seoul"));
		SpringApplication.run(BackendApplication.class, args);
	}

}
