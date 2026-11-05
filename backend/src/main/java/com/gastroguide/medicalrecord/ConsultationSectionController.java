package com.gastroguide.medicalrecord;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/prontuario/secoes")
public class ConsultationSectionController {

    @GetMapping("/{type}")
    public List<DiseaseField> fields(@PathVariable MedicalRecordType type) {
        return ConsultationSectionRegistry.fieldsFor(type);
    }
}
