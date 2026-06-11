package com.woth.backend.rag.service;

import java.io.IOException;
import java.time.LocalDate;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

@Service
public class RagDocumentStorageService {

    private final S3Client s3Client;

    @Value("${aws.s3.rag.bucket}")
    private String ragBucket;

    @Value("${aws.s3.rag.raw-prefix:raw/}")
    private String rawPrefix;

    public RagDocumentStorageService(S3Client s3Client) {
        this.s3Client = s3Client;
    }

    public String uploadRawDocument(MultipartFile file) {
        String originalFilename = file.getOriginalFilename();

        if (originalFilename == null || originalFilename.isBlank()) {
            originalFilename = "document";
        }

        String safeFilename = originalFilename.replaceAll("[^a-zA-Z0-9._-]", "_");

        String key = rawPrefix
                + LocalDate.now()
                + "/"
                + UUID.randomUUID()
                + "-"
                + safeFilename;

        try {
            PutObjectRequest request = PutObjectRequest.builder()
                    .bucket(ragBucket)
                    .key(key)
                    .contentType(file.getContentType())
                    .build();

            s3Client.putObject(
                    request,
                    RequestBody.fromInputStream(file.getInputStream(), file.getSize())
            );

            return key;
        } catch (IOException e) {
            throw new IllegalStateException("RAG 원본 문서 업로드에 실패했습니다.", e);
        }
    }
}