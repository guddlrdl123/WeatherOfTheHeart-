package com.woth.backend.object;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
/*
 * ObjectCatalog 엔티티에 대한 JPA 리포지토리
 * objectKey 기반 조회와 활성화된 오브젝트 목록 조회 기능
*/
public interface ObjectCatalogRepository extends JpaRepository<ObjectCatalog, Long> {

    List<ObjectCatalog> findByIsActiveTrueOrderByIdAsc();
}
