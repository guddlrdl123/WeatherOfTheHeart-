package com.woth.backend.storage;

import com.woth.backend.global.exception.CustomException;
import com.woth.backend.global.exception.ErrorCode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Base64;
import java.util.UUID;

@Service
public class S3ImageStorageService {

    private static final String LEGACY_OBJECT_IMAGE_PREFIX = "image/";
    private static final String OBJECT_IMAGE_PREFIX = "objects/";

    private final S3Client s3Client;
    private final S3Presigner s3Presigner;

    @Value("${aws.s3.bucket}")
    private String bucketName;

    @Value("${aws.s3.public-base-url}")
    private String publicBaseUrl;

    public S3ImageStorageService(S3Client s3Client, S3Presigner s3Presigner) {
        this.s3Client = s3Client;
        this.s3Presigner = s3Presigner;
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

    public String createReadUrl(String imageUrl) {
        String key = normalizeObjectKey(imageUrl);

        if (key == null) {
            return null;
        }

        GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                .bucket(bucketName)
                .key(key)
                .build();
        GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                .signatureDuration(Duration.ofHours(6))
                .getObjectRequest(getObjectRequest)
                .build();

        return s3Presigner.presignGetObject(presignRequest).url().toString();
    }

    private String normalizeObjectKey(String imageUrl) {
        if (imageUrl == null || imageUrl.isBlank()) {
            return null;
        }

        String key = imageUrl.trim();
        String normalizedPublicBaseUrl = publicBaseUrl.replaceAll("/+$", "");

        if (key.startsWith(normalizedPublicBaseUrl + "/")) {
            key = key.substring(normalizedPublicBaseUrl.length() + 1);
        } else if (key.startsWith("http://") || key.startsWith("https://")) {
            key = URI.create(key).getPath();
        }

        key = key.replaceAll("^/+", "");
        int queryIndex = key.indexOf("?");

        if (queryIndex >= 0) {
            key = key.substring(0, queryIndex);
        }

        if (key.isBlank()) {
            return null;
        }

        key = URLDecoder.decode(key, StandardCharsets.UTF_8);

        if (key.startsWith(LEGACY_OBJECT_IMAGE_PREFIX)) {
            return OBJECT_IMAGE_PREFIX + key.substring(LEGACY_OBJECT_IMAGE_PREFIX.length());
        }

        return key;
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
