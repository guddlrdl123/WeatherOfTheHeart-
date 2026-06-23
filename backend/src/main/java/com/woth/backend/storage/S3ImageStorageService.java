package com.woth.backend.storage;

import com.woth.backend.global.exception.CustomException;
import com.woth.backend.global.exception.ErrorCode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.core.ResponseBytes;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
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

        StoredImage image = parseDataUrl(dataUrl);
        String extension = resolveExtension(image.contentType());

        String normalizedDirectory = normalizeDirectory(directory);
        String key = normalizedDirectory + "/" + UUID.randomUUID() + extension;

        PutObjectRequest request = PutObjectRequest.builder()
                .bucket(bucketName)
                .key(key)
                .contentType(image.contentType())
                .contentLength((long) image.bytes().length)
                .build();

        s3Client.putObject(request, RequestBody.fromBytes(image.bytes()));

        return publicBaseUrl.replaceAll("/+$", "") + "/" + key;
    }

    public StoredImage downloadImage(String imageDataOrUrl) {
        if (imageDataOrUrl == null || imageDataOrUrl.isBlank()) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }

        if (imageDataOrUrl.startsWith("data:image/")) {
            return parseDataUrl(imageDataOrUrl);
        }

        String key = resolveKeyFromImageReference(imageDataOrUrl);
        GetObjectRequest request = GetObjectRequest.builder()
                .bucket(bucketName)
                .key(key)
                .build();
        ResponseBytes<GetObjectResponse> response = s3Client.getObjectAsBytes(request);
        String contentType = response.response().contentType();

        return new StoredImage(
                response.asByteArray(),
                contentType == null || contentType.isBlank() ? "application/octet-stream" : contentType
        );
    }

    private StoredImage parseDataUrl(String dataUrl) {
        int commaIndex = dataUrl.indexOf(",");

        if (!dataUrl.startsWith("data:image/") || commaIndex < 0) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }

        String meta = dataUrl.substring("data:".length(), commaIndex);
        String base64 = dataUrl.substring(commaIndex + 1);
        String contentType = meta.split(";")[0];

        try {
            return new StoredImage(Base64.getDecoder().decode(base64), contentType);
        } catch (IllegalArgumentException e) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }
    }

    private String resolveKeyFromImageReference(String imageUrl) {
        String normalizedBaseUrl = publicBaseUrl.replaceAll("/+$", "");
        String normalizedImageUrl = imageUrl.trim();
        String encodedKey;

        if (normalizedImageUrl.startsWith(normalizedBaseUrl + "/")) {
            encodedKey = normalizedImageUrl.substring(normalizedBaseUrl.length() + 1);
        } else if (normalizedImageUrl.startsWith("http://") || normalizedImageUrl.startsWith("https://")) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        } else {
            encodedKey = normalizedImageUrl.replaceFirst("^/+", "");
        }

        int queryIndex = encodedKey.indexOf("?");
        if (queryIndex >= 0) {
            encodedKey = encodedKey.substring(0, queryIndex);
        }

        String key = URLDecoder.decode(encodedKey, StandardCharsets.UTF_8);

        if (key.isBlank() || key.startsWith("/") || key.contains("../")) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
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

    public record StoredImage(
            byte[] bytes,
            String contentType
    ) {
    }
}
