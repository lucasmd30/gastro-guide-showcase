package com.gastroguide.document;

import com.gastroguide.doctor.Doctor;
import com.gastroguide.doctor.DoctorRepository;
import com.gastroguide.document.dto.DocumentTemplateDto;
import com.gastroguide.document.dto.SaveDocumentTemplateRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

/** "Meus modelos" e as orientações próprias do médico — isolados por médico. */
@Service
public class DocumentTemplateService {

    private final DocumentTemplateRepository repository;
    private final DoctorRepository doctorRepository;

    public DocumentTemplateService(DocumentTemplateRepository repository, DoctorRepository doctorRepository) {
        this.repository = repository;
        this.doctorRepository = doctorRepository;
    }

    @Transactional(readOnly = true)
    public List<DocumentTemplateDto> list(UUID doctorId) {
        return repository.findByDoctorIdOrderByNameAsc(doctorId).stream().map(DocumentTemplateDto::from).toList();
    }

    @Transactional
    public DocumentTemplateDto create(UUID doctorId, SaveDocumentTemplateRequest request) {
        Doctor doctor = doctorRepository.findById(doctorId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                        "Sessão inválida, faça login novamente."));
        DocumentTemplate template = new DocumentTemplate(doctor, request.kind(), request.name().trim(),
                request.content().strip());
        repository.save(template);
        return DocumentTemplateDto.from(template);
    }

    @Transactional
    public DocumentTemplateDto update(UUID doctorId, UUID templateId, SaveDocumentTemplateRequest request) {
        DocumentTemplate template = findOrThrow(doctorId, templateId);
        template.update(request.name().trim(), request.content().strip());
        repository.saveAndFlush(template);
        return DocumentTemplateDto.from(template);
    }

    @Transactional
    public void delete(UUID doctorId, UUID templateId) {
        repository.delete(findOrThrow(doctorId, templateId));
    }

    private DocumentTemplate findOrThrow(UUID doctorId, UUID templateId) {
        return repository.findByIdAndDoctorId(templateId, doctorId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Modelo não encontrado."));
    }
}
