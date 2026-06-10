package com.woth.backend.storage;

import com.woth.backend.global.exception.CustomException;
import com.woth.backend.global.exception.ErrorCode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.util.Base64;
import java.util.UUID;

@Service
public class S3ImageStorageService {

    private final S3Client s3Client;

    @Value("${aws.s3.bucket}")
    private String bucketName;

    @Value("${aws.s3.public-base-url}")
    private String publicBaseUrl;

    public S3ImageStorageService(S3Client s3Client) {
        this.s3Client = s3Client;
    }

    public String uploadDataUrl(String dataUrl, String directory) {
        if (dataUrl == null || dataUrl.isBlank()) {
            return null;
        }

        int commaIndex = dataUrl.indexOf(",");

        if (!dataUrl.startsWith("data:image/") || commaIndex < 0) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }

        String meta = dataUrl.substring("data:".length(), commaIndex);
        String base64 = dataUrl.substring(commaIndex + 1);

        String contentType = meta.split(";")[0];
        String extension = resolveExtension(contentType);

        byte[] imageBytes;

        try {
            imageBytes = Base64.getDecoder().decode(base64);
        } catch (IllegalArgumentException e) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }

        String normalizedDirectory = normalizeDirectory(directory);
        String key = normalizedDirectory + "/" + UUID.randomUUID() + extension;

        PutObjectRequest request = PutObjectRequest.builder()
                .bucket(bucketName)
                .key(key)
                .contentType(contentType)
                .contentLength((long) imageBytes.length)
                .build();

        s3Client.putObject(request, RequestBody.fromBytes(imageBytes));

        return publicBaseUrl.replaceAll("/+$", "") + "/" + key;
    }

    private String normalizeDirectory(String directory) {
        if (directory == null || directory.isBlank()) {
            return "images";
        }

        return directory.replaceAll("^/+", "").replaceAll("/+$", "");
    }

    private String resolveExtension(String contentType) {
        return switch (contentType) {
            case "image/png" -> ".png";
            case "image/jpeg" -> ".jpg";
            case "image/webp" -> ".webp";
            default -> throw new CustomException(ErrorCode.INVALID_INPUT);
        };
    }
}