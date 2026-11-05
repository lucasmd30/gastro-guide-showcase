package com.gastroguide.patient;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PatientRepository extends JpaRepository<Patient, UUID> {
    List<Patient> findByDoctorIdOrderByNameAsc(UUID doctorId);

    /**
     * Busca paginada no servidor. Antes a lista inteira ia pro navegador e o
     * filtro acontecia lá — com 2.000 pacientes isso era 1,6 MB por
     * carregamento de tela, em três telas diferentes.
     *
     * <p>{@code q} chega já em minúsculas e sem acento; nome e e-mail também
     * perdem os acentos na comparação (via {@code translate}, que é SQL puro —
     * não depende da extensão {@code unaccent}), então "silverio" acha
     * "Silvério" e vice-versa. {@code digits} é a mesma busca só
     * com dígitos, pra CPF casar mesmo quando o usuário digita pontuado
     * ("529.982" encontra 52998224725). Telefone é comparado cru, porque é
     * gravado como foi digitado.
     */
    @Query(value = """
            SELECT p FROM Patient p
            WHERE p.doctor.id = :doctorId
              AND (:q = ''
                   OR LOWER(FUNCTION('translate', p.name, 'ÁÀÂÃÄÅÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑÝáàâãäåéèêëíìîïóòôõöúùûüçñýÿ', 'AAAAAAEEEEIIIIOOOOOUUUUCNYaaaaaaeeeeiiiiooooouuuucnyy')) LIKE CONCAT('%', :q, '%')
                   OR LOWER(FUNCTION('translate', COALESCE(p.email, ''), 'ÁÀÂÃÄÅÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑÝáàâãäåéèêëíìîïóòôõöúùûüçñýÿ', 'AAAAAAEEEEIIIIOOOOOUUUUCNYaaaaaaeeeeiiiiooooouuuucnyy')) LIKE CONCAT('%', :q, '%')
                   OR COALESCE(p.phone, '') LIKE CONCAT('%', :q, '%')
                   OR COALESCE(p.phone2, '') LIKE CONCAT('%', :q, '%')
                   OR (:digits <> '' AND COALESCE(p.cpf, '') LIKE CONCAT('%', :digits, '%')))
            ORDER BY p.name ASC
            """,
            countQuery = """
            SELECT COUNT(p) FROM Patient p
            WHERE p.doctor.id = :doctorId
              AND (:q = ''
                   OR LOWER(FUNCTION('translate', p.name, 'ÁÀÂÃÄÅÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑÝáàâãäåéèêëíìîïóòôõöúùûüçñýÿ', 'AAAAAAEEEEIIIIOOOOOUUUUCNYaaaaaaeeeeiiiiooooouuuucnyy')) LIKE CONCAT('%', :q, '%')
                   OR LOWER(FUNCTION('translate', COALESCE(p.email, ''), 'ÁÀÂÃÄÅÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑÝáàâãäåéèêëíìîïóòôõöúùûüçñýÿ', 'AAAAAAEEEEIIIIOOOOOUUUUCNYaaaaaaeeeeiiiiooooouuuucnyy')) LIKE CONCAT('%', :q, '%')
                   OR COALESCE(p.phone, '') LIKE CONCAT('%', :q, '%')
                   OR COALESCE(p.phone2, '') LIKE CONCAT('%', :q, '%')
                   OR (:digits <> '' AND COALESCE(p.cpf, '') LIKE CONCAT('%', :digits, '%')))
            """)
    Page<Patient> search(@Param("doctorId") UUID doctorId,
                         @Param("q") String q,
                         @Param("digits") String digits,
                         Pageable pageable);

    Optional<Patient> findByIdAndDoctorId(UUID id, UUID doctorId);

    Optional<Patient> findByDoctorIdAndCpf(UUID doctorId, String cpf);

    boolean existsByDoctorIdAndCpf(UUID doctorId, String cpf);

    boolean existsByDoctorIdAndCpfAndIdNot(UUID doctorId, String cpf, UUID id);
}
